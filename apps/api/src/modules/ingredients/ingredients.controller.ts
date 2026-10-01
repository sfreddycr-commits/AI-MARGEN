import type { z } from 'zod';
import { CalculationError, canConvert, purchaseUnitCost } from '@aimargen/calculation-engine';
import type { IngredientInput, ingredientCostInput } from '@aimargen/schemas';
import { AppError } from '../../core/http/app-error.js';
import { DbError } from '../../core/db/db-error.js';
import { page, search } from '../../core/http/dto.js';
import type { TenantContext } from '../../core/http/request-context.js';
import type { Services } from '../../core/services.js';
import type { CostingService } from '../../core/costing/costing.service.js';
import type { TenantModel } from '../tenant/tenant.model.js';
import type { IngredientModel } from './ingredients.model.js';
import { ingredientDto, priceHistoryDto } from './ingredients.dto.js';

/**
 * Lógica de ingredientes (SOP §12). El costo unitario lo calcula siempre el motor:
 * costo = precio / cantidad convertida a la unidad del ingrediente.
 */
export function createIngredientController(
  model: IngredientModel,
  tenants: TenantModel,
  costing: CostingService,
  s: Services,
) {
  function unitCostFor(
    p: { price: string; quantity: string; unit: string },
    ingredientUnit: string,
    conversions: IngredientInput['conversions'],
    name: string,
  ): string {
    try {
      return purchaseUnitCost({
        price: p.price,
        quantity: p.quantity,
        purchaseUnit: p.unit,
        ingredientUnit,
        conversions,
      });
    } catch (e) {
      if (e instanceof CalculationError && e.code === 'INCOMPATIBLE_UNITS') {
        throw new AppError(
          422,
          'INCOMPATIBLE_UNITS',
          `No se puede convertir ${p.unit} a ${ingredientUnit} para ${name}. Agregue una conversión (ej. 1 unidad = 50 g).`,
        );
      }
      throw e;
    }
  }

  async function costMethod(tenantId: number): Promise<string> {
    return String((await tenants.get(tenantId))?.cost_method ?? 'last_purchase');
  }

  function mapDbError(e: unknown): never {
    if (e instanceof DbError && e.code === 'ERR_DUPLICATE') {
      throw new AppError(409, 'DUPLICATE_NAME', 'Ya existe un ingrediente activo con ese nombre.');
    }
    if (e instanceof DbError && e.code === 'ERR_VALIDATION' && e.detail === 'unit_locked') {
      throw new AppError(
        422,
        'UNIT_LOCKED',
        'No puede cambiar la unidad porque el ingrediente ya tiene historial de costos. Cree un ingrediente nuevo.',
      );
    }
    throw e;
  }

  return {
    async list(
      ctx: TenantContext,
      q: { q?: string; category?: string; filter: string; page: number; pageSize: number },
    ) {
      const [rows, total] = await model.list(
        ctx.tenantId,
        search(q.q),
        q.category ?? null,
        q.filter,
        q.pageSize,
        (q.page - 1) * q.pageSize,
      );
      return page(
        (rows ?? []).map(ingredientDto),
        total as Array<{ total: number }>,
        q.page,
        q.pageSize,
      );
    },

    async get(ctx: TenantContext, id: string) {
      const row = await model.get(ctx.tenantId, id);
      if (!row) throw new AppError(404, 'NOT_FOUND', 'No se encontró el ingrediente.');
      return ingredientDto(row);
    },

    async history(ctx: TenantContext, id: string) {
      await this.get(ctx, id);
      return (await model.history(ctx.tenantId, id, 100)).map(priceHistoryDto);
    },

    async save(ctx: TenantContext, id: string | null, input: IngredientInput, isDemo = false) {
      if (id && !input.rowVersion)
        throw new AppError(400, 'ROW_VERSION_REQUIRED', 'Falta la versión del registro.');
      for (const c of input.conversions) {
        if (canConvert(c.from, c.to)) {
          throw new AppError(
            422,
            'INVALID_CONVERSION',
            `${c.from} y ${c.to} ya se convierten solos; no necesita una conversión.`,
          );
        }
      }
      const initial =
        !id && input.initialCost
          ? {
              unitCost: unitCostFor(input.initialCost, input.unit, input.conversions, input.name),
              supplierUuid: input.initialCost.supplierUuid,
              date: input.initialCost.date,
            }
          : null;
      const before = id ? await model.get(ctx.tenantId, id) : null;
      let row;
      try {
        row = await model.save(ctx.tenantId, ctx.userId, id, input, initial, isDemo);
      } catch (e) {
        mapDbError(e);
      }
      if (id)
        await costing.afterIngredientCostChange(
          ctx,
          [Number(row.id)],
          await costMethod(ctx.tenantId),
        );
      const dto = ingredientDto(id ? (await model.get(ctx.tenantId, id))! : row);
      await s.audit.log(ctx, {
        action: id ? 'ingredient.update' : 'ingredient.create',
        entity: 'ingredient',
        entityUuid: dto.uuid,
        before: before ? ingredientDto(before) : null,
        after: dto,
      });
      return dto;
    },

    /** Registra un costo nuevo sin compra (ej. cotización). Conserva el historial (SOP §14). */
    async addCost(ctx: TenantContext, id: string, input: z.infer<typeof ingredientCostInput>) {
      const current = await model.get(ctx.tenantId, id);
      if (!current || current.deleted_at)
        throw new AppError(404, 'NOT_FOUND', 'No se encontró el ingrediente.');
      const dto = ingredientDto(current);
      const unitCost = unitCostFor(input, dto.unit, dto.conversions, dto.name);
      const ingredientId = await model.addCost(
        ctx.tenantId,
        ctx.userId,
        id,
        unitCost,
        input.supplierUuid,
        input.date,
      );
      await costing.afterIngredientCostChange(ctx, [ingredientId], await costMethod(ctx.tenantId));
      const after = ingredientDto((await model.get(ctx.tenantId, id))!);
      await s.audit.log(ctx, {
        action: 'ingredient.cost_add',
        entity: 'ingredient',
        entityUuid: id,
        before: { unitCost: dto.unitCost },
        after: { unitCost: after.unitCost, input },
      });
      return after;
    },

    async setArchived(ctx: TenantContext, id: string, archived: boolean) {
      let row;
      try {
        row = await model.setArchived(ctx.tenantId, ctx.userId, id, archived);
      } catch (e) {
        mapDbError(e);
      }
      await s.audit.log(ctx, {
        action: archived ? 'ingredient.archive' : 'ingredient.restore',
        entity: 'ingredient',
        entityUuid: id,
      });
      return ingredientDto(row);
    },
  };
}

export type IngredientController = ReturnType<typeof createIngredientController>;
