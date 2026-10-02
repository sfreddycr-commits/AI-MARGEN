import type { Db, Row } from '../../core/db/db.js';
import { AppError } from '../../core/http/app-error.js';
import { iso } from '../../core/http/dto.js';
import type { TenantContext } from '../../core/http/request-context.js';
import { categoryDto } from '../catalog/catalog.dto.js';
import { supplierDto } from '../suppliers/suppliers.dto.js';
import { ingredientDto } from '../ingredients/ingredients.dto.js';
import { productDto } from '../products/products.dto.js';
import { fixedCostDto, scenarioDto } from '../planning/planning.dto.js';

/**
 * Sincronización por diferencias para el cache IndexedDB del cliente (ADR-0007).
 * Cada entidad expone su SP `*_changes` (incluye archivados, con `archived: true`) y el mismo DTO
 * que su listado, para que el cliente guarde exactamente lo que mostraría la API.
 */
interface EntitySpec {
  permission: string;
  fetch: (
    db: Db,
    t: number,
    since: Date | null,
    sinceUuid: string | null,
    limit: number,
  ) => Promise<Row[]>;
  map: (r: Row) => unknown;
}

const ENTITIES: Record<string, EntitySpec> = {
  ingredients: {
    permission: 'ingredients.read',
    fetch: (db, t, s, u, l) => db.callOne<Row>('sp_ingredient_changes', [t, s, u, l]),
    map: ingredientDto,
  },
  suppliers: {
    permission: 'suppliers.read',
    fetch: (db, t, s, u, l) => db.callOne<Row>('sp_supplier_changes', [t, s, u, l]),
    map: supplierDto,
  },
  products: {
    permission: 'products.read',
    fetch: (db, t, s, u, l) => db.callOne<Row>('sp_product_changes', [t, s, u, l]),
    map: productDto,
  },
  fixed_costs: {
    permission: 'scenarios.read',
    fetch: (db, t, s, u, l) => db.callOne<Row>('sp_fixed_cost_changes', [t, s, u, l]),
    map: fixedCostDto,
  },
  scenarios: {
    permission: 'scenarios.read',
    fetch: (db, t, s, u, l) => db.callOne<Row>('sp_scenario_changes', [t, s, u, l]),
    map: scenarioDto,
  },
  ingredient_categories: {
    permission: 'ingredients.read',
    fetch: (db, t, s, u, l) => db.callOne<Row>('sp_category_changes', [t, 'ingredient', s, u, l]),
    map: categoryDto,
  },
  product_categories: {
    permission: 'products.read',
    fetch: (db, t, s, u, l) => db.callOne<Row>('sp_category_changes', [t, 'product', s, u, l]),
    map: categoryDto,
  },
};

export const SYNC_ENTITIES = Object.keys(ENTITIES);
const PAGE = 500;
/** Al pedir cambios desde un cursor guardado, se retrocede unos segundos para no perder
 *  escrituras de transacciones concurrentes que confirmaron con un updated_at anterior. */
const REWIND_MS = 5_000;

function encodeCursor(ts: Date, uuid: string): string {
  return Buffer.from(`${ts.toISOString()}|${uuid}`).toString('base64url');
}
function decodeCursor(c: string): { ts: Date; uuid: string } {
  const [ts, uuid] = Buffer.from(c, 'base64url').toString('utf8').split('|');
  const d = new Date(ts ?? '');
  if (!uuid || Number.isNaN(d.getTime()))
    throw new AppError(400, 'INVALID_CURSOR', 'Cursor de sincronización inválido.');
  return { ts: d, uuid };
}

export function createSyncController(db: Db) {
  return {
    async versions(ctx: TenantContext) {
      const rows = await db.callOne<Row>('sp_sync_get_versions', [ctx.tenantId]);
      const out: Record<string, number> = {};
      for (const r of rows) out[String(r.entity)] = Number(r.version);
      return {
        versions: out,
        entities: SYNC_ENTITIES.filter((e) => ctx.permissions.has(ENTITIES[e]!.permission)),
      };
    },

    async changes(ctx: TenantContext, entity: string, cursor: string | undefined, rewind: boolean) {
      const spec = ENTITIES[entity];
      if (!spec)
        throw new AppError(400, 'UNKNOWN_ENTITY', 'Entidad de sincronización desconocida.');
      if (!ctx.permissions.has(spec.permission))
        throw new AppError(403, 'FORBIDDEN', 'No tiene permiso para realizar esta acción.');
      let since: Date | null = null;
      let sinceUuid: string | null = null;
      if (cursor) {
        const c = decodeCursor(cursor);
        if (rewind) {
          since = new Date(c.ts.getTime() - REWIND_MS);
        } else {
          since = c.ts;
          sinceUuid = c.uuid;
        }
      }
      const rows = await spec.fetch(db, ctx.tenantId, since, sinceUuid, PAGE);
      const last = rows.at(-1);
      return {
        // Los archivados viajan como datos (archived: true) para que el cliente pueda mostrarlos
        // en los filtros de "Archivados" sin conexión. No hay borrado físico de estas entidades.
        items: rows.map((r) => ({
          uuid: String(r.uuid),
          deleted: false,
          updatedAt: iso(r.updated_at)!,
          data: spec.map(r),
        })),
        cursor: last
          ? encodeCursor(new Date(last.updated_at), String(last.uuid))
          : (cursor ?? null),
        hasMore: rows.length === PAGE,
      };
    },
  };
}

export type SyncController = ReturnType<typeof createSyncController>;
