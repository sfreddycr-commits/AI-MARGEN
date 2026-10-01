import {
  CalculationError,
  Decimal,
  convertQuantity,
  purchaseUnitCost,
} from '@aimargen/calculation-engine';
import type { PurchaseInput } from '@aimargen/schemas';
import { AppError } from '../../core/http/app-error.js';
import { DbError } from '../../core/db/db-error.js';
import { json, page } from '../../core/http/dto.js';
import type { TenantContext } from '../../core/http/request-context.js';
import type { Services } from '../../core/services.js';
import { conversionsOf, type CostingService } from '../../core/costing/costing.service.js';
import type { TenantModel } from '../tenant/tenant.model.js';
import type { IngredientModel } from '../ingredients/ingredients.model.js';
import type { PurchaseLineRow, PurchaseModel } from './purchases.model.js';
import { purchaseDto, purchaseItemDto } from './purchases.dto.js';

/**
 * Compras (SOP §14). Cada línea calcula su costo unitario con el motor en la unidad del ingrediente.
 * Una compra nueva actualiza el costo vigente y recalcula los productos afectados,
 * sin destruir historial. Las compras no se editan: se anulan y se registran de nuevo.
 */
export function createPurchaseController(
  model: PurchaseModel,
  ingredients: IngredientModel,
  tenants: TenantModel,
  costing: CostingService,
  s: Services,
) {
  async function afterChange(ctx: TenantContext, idsJson: unknown) {
    const ids = json<number[]>(idsJson, []).map(Number);
    const method = String((await tenants.get(ctx.tenantId))?.cost_method ?? 'last_purchase');
    await costing.afterIngredientCostChange(ctx, ids, method);
  }

  return {
    /** Calcula las líneas (sin guardar). Usado por la compra manual y por la importación de facturas. */
    async computeLines(ctx: TenantContext, items: PurchaseInput['items']) {
      const uuids = [...new Set(items.map((i) => i.ingredientUuid))];
      const resolved = await ingredients.resolve(ctx.tenantId, uuids);
      const byUuid = new Map(resolved.filter((r) => !r.deleted_at).map((r) => [String(r.uuid), r]));
      let total = new Decimal(0);
      const lines: PurchaseLineRow[] = items.map((it) => {
        const ing = byUuid.get(it.ingredientUuid);
        if (!ing)
          throw new AppError(
            422,
            'INGREDIENT_NOT_FOUND',
            'Uno de los ingredientes no existe o está archivado.',
          );
        const conversions = conversionsOf(ing);
        try {
          const unitCost = purchaseUnitCost({
            price: it.lineTotal,
            quantity: it.quantity,
            purchaseUnit: it.unit,
            ingredientUnit: String(ing.unit),
            conversions,
          });
          const quantityBase = convertQuantity(
            it.quantity,
            it.unit,
            String(ing.unit),
            conversions,
          ).toFixed(6);
          total = total.plus(it.lineTotal);
          return {
            ingredient_uuid: it.ingredientUuid,
            quantity: it.quantity,
            unit: it.unit,
            line_total: it.lineTotal,
            unit_cost: unitCost,
            quantity_base: quantityBase,
          };
        } catch (e) {
          if (e instanceof CalculationError && e.code === 'INCOMPATIBLE_UNITS') {
            throw new AppError(
              422,
              'INCOMPATIBLE_UNITS',
              `No se puede convertir ${it.unit} a ${ing.unit} para ${ing.name}. Agregue una conversión al ingrediente.`,
            );
          }
          throw e;
        }
      });
      return { lines, total: total.toFixed(6) };
    },

    async create(
      ctx: TenantContext,
      input: PurchaseInput,
      opts: {
        source?: 'manual' | 'invoice_ai';
        documentUuid?: string | null;
        isDemo?: boolean;
      } = {},
    ) {
      const { lines, total } = await this.computeLines(ctx, input.items);
      let row;
      try {
        row = await model.create(ctx.tenantId, ctx.userId, {
          supplierUuid: input.supplierUuid,
          purchasedAt: input.purchasedAt,
          reference: input.reference,
          notes: input.notes,
          total,
          source: opts.source ?? 'manual',
          documentUuid: opts.documentUuid ?? null,
          lines,
          isDemo: opts.isDemo,
        });
      } catch (e) {
        if (e instanceof DbError && e.code === 'ERR_VALIDATION') {
          throw new AppError(
            422,
            'INVALID_PURCHASE',
            'Revise el proveedor y los ingredientes de la compra.',
          );
        }
        throw e;
      }
      await afterChange(ctx, row.ingredient_ids);
      const detail = await this.get(ctx, String(row.uuid));
      await s.audit.log(ctx, {
        action: opts.source === 'invoice_ai' ? 'purchase.create_from_invoice' : 'purchase.create',
        entity: 'purchase',
        entityUuid: detail.uuid,
        after: detail,
      });
      return detail;
    },

    async list(
      ctx: TenantContext,
      q: {
        supplier?: string;
        ingredient?: string;
        from?: string;
        to?: string;
        includeVoid: boolean;
        page: number;
        pageSize: number;
      },
    ) {
      const [rows, total] = await model.list(
        ctx.tenantId,
        {
          supplier: q.supplier ?? null,
          ingredient: q.ingredient ?? null,
          from: q.from ?? null,
          to: q.to ?? null,
          includeVoid: q.includeVoid,
        },
        q.pageSize,
        (q.page - 1) * q.pageSize,
      );
      return page(
        (rows ?? []).map(purchaseDto),
        total as Array<{ total: number }>,
        q.page,
        q.pageSize,
      );
    },

    async get(ctx: TenantContext, id: string) {
      try {
        const [header, items] = await model.get(ctx.tenantId, id);
        if (!header?.[0]) throw new AppError(404, 'NOT_FOUND', 'No se encontró la compra.');
        return { ...purchaseDto(header[0]), items: (items ?? []).map(purchaseItemDto) };
      } catch (e) {
        if (e instanceof DbError && e.code === 'ERR_NOT_FOUND')
          throw new AppError(404, 'NOT_FOUND', 'No se encontró la compra.');
        throw e;
      }
    },

    async void(ctx: TenantContext, id: string) {
      const before = await this.get(ctx, id);
      let row;
      try {
        row = await model.void(ctx.tenantId, ctx.userId, id);
      } catch (e) {
        if (e instanceof DbError && e.code === 'ERR_CONFLICT') {
          throw new AppError(409, 'ALREADY_VOID', 'Esta compra ya estaba anulada.');
        }
        throw e;
      }
      await afterChange(ctx, row.ingredient_ids);
      await s.audit.log(ctx, {
        action: 'purchase.void',
        entity: 'purchase',
        entityUuid: id,
        before,
      });
      return this.get(ctx, id);
    },
  };
}

export type PurchaseController = ReturnType<typeof createPurchaseController>;
