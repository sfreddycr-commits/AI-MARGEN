import type { z } from 'zod';
import {
  CalculationError,
  calculateRecipe,
  type RecipeBreakdown,
} from '@aimargen/calculation-engine';
import type { priceUpdateInput, ProductInput, ProductPreviewInput } from '@aimargen/schemas';
import { AppError } from '../../core/http/app-error.js';
import { DbError } from '../../core/db/db-error.js';
import { dec, search } from '../../core/http/dto.js';
import type { Row } from '../../core/db/db.js';
import type { TenantContext } from '../../core/http/request-context.js';
import type { Services } from '../../core/services.js';
import { recipeLineFrom } from '../../core/costing/costing.service.js';
import type { TenantModel } from '../tenant/tenant.model.js';
import type { IngredientModel } from '../ingredients/ingredients.model.js';
import type { ProductModel } from './products.model.js';
import {
  analysisDto,
  breakdownDto,
  pricingSummary,
  productDto,
  type ProductDto,
} from './products.dto.js';

/**
 * Productos y recetas (SOP §15–17). Todo costo, precio, utilidad y margen sale del motor.
 * Cada producto muestra de inmediato: costo total, costo por porción, precio, utilidad y margen.
 */
export function createProductController(
  model: ProductModel,
  ingredients: IngredientModel,
  tenants: TenantModel,
  s: Services,
) {
  /** Resuelve ingredientes de la receta y arma las líneas para el motor (mismo formato que la BD). */
  async function linesFor(ctx: TenantContext, items: ProductPreviewInput['items']): Promise<Row[]> {
    const resolved = await ingredients.resolve(ctx.tenantId, [
      ...new Set(items.map((i) => i.ingredientUuid)),
    ]);
    const byUuid = new Map(resolved.map((r) => [String(r.uuid), r]));
    return items.map((it) => {
      const ing = byUuid.get(it.ingredientUuid);
      if (!ing)
        throw new AppError(
          422,
          'INGREDIENT_NOT_FOUND',
          'Uno de los ingredientes de la receta no existe.',
        );
      return {
        ingredient_uuid: it.ingredientUuid,
        ingredient_name: ing.name,
        ingredient_unit: ing.unit,
        current_unit_cost: ing.current_unit_cost,
        yield_fraction: ing.yield_fraction,
        conversions: ing.conversions,
        ingredient_deleted_at: ing.deleted_at,
        quantity: it.quantity,
        unit: it.unit,
      };
    });
  }

  function compute(input: ProductPreviewInput, lines: Row[]): RecipeBreakdown {
    try {
      return calculateRecipe({
        portions: input.portions,
        items: lines.map(recipeLineFrom),
        packaging: input.packaging,
        labor: input.labor,
        overhead: input.overhead,
        wastePct: input.wastePct,
      });
    } catch (e) {
      if (e instanceof CalculationError) throw new AppError(422, e.code, e.message);
      throw e;
    }
  }

  async function defaultMargin(tenantId: number): Promise<string | null> {
    return dec((await tenants.get(tenantId))?.default_target_margin);
  }

  function mapDbError(e: unknown): never {
    if (e instanceof DbError && e.code === 'ERR_DUPLICATE') {
      throw new AppError(409, 'DUPLICATE_NAME', 'Ya existe un producto activo con ese nombre.');
    }
    if (e instanceof DbError && e.code === 'ERR_VALIDATION') {
      throw new AppError(
        422,
        'INVALID_PRODUCT',
        'Revise la categoría y los ingredientes del producto.',
      );
    }
    throw e;
  }

  const filters = new Set(['below_cost', 'below_target']);

  return {
    async list(
      ctx: TenantContext,
      q: { q?: string; category?: string; filter: string; page: number; pageSize: number },
    ) {
      if (filters.has(q.filter)) {
        const [rows] = await model.list(
          ctx.tenantId,
          search(q.q),
          q.category ?? null,
          'active',
          1000,
          0,
        );
        const all = (rows ?? []).map(productDto).filter((p) => p.pricing.status === q.filter);
        const start = (q.page - 1) * q.pageSize;
        return {
          items: all.slice(start, start + q.pageSize),
          page: q.page,
          pageSize: q.pageSize,
          total: all.length,
        };
      }
      const [rows, total] = await model.list(
        ctx.tenantId,
        search(q.q),
        q.category ?? null,
        q.filter,
        q.pageSize,
        (q.page - 1) * q.pageSize,
      );
      return {
        items: (rows ?? []).map(productDto),
        page: q.page,
        pageSize: q.pageSize,
        total: Number((total as Array<{ total: number }>)?.[0]?.total ?? 0),
      };
    },

    /** Lista completa de productos activos (dashboard, reportes, precios). */
    async all(ctx: TenantContext): Promise<ProductDto[]> {
      const [rows] = await model.list(ctx.tenantId, null, null, 'active', 2000, 0);
      return (rows ?? []).map(productDto);
    },

    async get(ctx: TenantContext, id: string) {
      let sets: Row[][];
      try {
        sets = await model.get(ctx.tenantId, id);
      } catch (e) {
        if (e instanceof DbError && e.code === 'ERR_NOT_FOUND')
          throw new AppError(404, 'NOT_FOUND', 'No se encontró el producto.');
        throw e;
      }
      const [prod, lines = []] = sets;
      if (!prod?.[0]) throw new AppError(404, 'NOT_FOUND', 'No se encontró el producto.');
      const dto = productDto(prod[0]);
      const breakdown = compute(
        {
          portions: dto.portions,
          packaging: dto.packaging as ProductPreviewInput['packaging'],
          labor: dto.labor as ProductPreviewInput['labor'],
          overhead: dto.overhead as ProductPreviewInput['overhead'],
          wastePct: dto.wastePct,
          items: [],
          currentPrice: null,
          targetMargin: null,
          multiplier: null,
          notes: null,
          categoryUuid: null,
        },
        lines,
      );
      const summary = pricingSummary(
        breakdown.costPerPortion,
        dto.currentPrice,
        dto.effectiveTargetMargin,
        dto.multiplier,
        breakdown.complete,
      );
      return {
        ...dto,
        items: lines.map((l) => ({
          ingredientUuid: String(l.ingredient_uuid),
          quantity: dec(l.quantity)!,
          unit: String(l.unit),
        })),
        breakdown: breakdownDto(breakdown, lines),
        analysis: analysisDto(summary.analysis),
      };
    },

    /** Cálculo en vivo para el editor de recetas: no guarda nada. */
    async preview(ctx: TenantContext, input: ProductPreviewInput) {
      const lines = await linesFor(ctx, input.items);
      const breakdown = compute(input, lines);
      const target = input.targetMargin ?? (await defaultMargin(ctx.tenantId));
      const summary = pricingSummary(
        breakdown.costPerPortion,
        input.currentPrice,
        target,
        input.multiplier,
        breakdown.complete,
      );
      return {
        breakdown: breakdownDto(breakdown, lines),
        pricing: {
          status: summary.status,
          profit: dec(summary.profit),
          margin: dec(summary.margin),
          recommendedPrice: dec(summary.recommendedPrice),
        },
        analysis: analysisDto(summary.analysis),
        effectiveTargetMargin: target,
      };
    },

    async save(ctx: TenantContext, id: string | null, input: ProductInput, isDemo = false) {
      if (id && !input.rowVersion)
        throw new AppError(400, 'ROW_VERSION_REQUIRED', 'Falta la versión del registro.');
      const lines = await linesFor(ctx, input.items);
      const b = compute(input, lines);
      let row: Row;
      try {
        row = await model.save(
          ctx.tenantId,
          ctx.userId,
          id,
          {
            ...input,
            costTotal: b.totalCost,
            costPerPortion: b.costPerPortion,
            costComplete: b.complete,
          },
          isDemo,
        );
      } catch (e) {
        mapDbError(e);
      }
      const detail = await this.get(ctx, String(row.uuid));
      await s.audit.log(ctx, {
        action: id ? 'product.update' : 'product.create',
        entity: 'product',
        entityUuid: detail.uuid,
        before: row.before_json ?? null,
        after: {
          name: detail.name,
          currentPrice: detail.currentPrice,
          targetMargin: detail.targetMargin,
          costPerPortion: detail.costPerPortion,
          items: detail.items,
        },
      });
      return detail;
    },

    async duplicate(ctx: TenantContext, id: string, name: string) {
      let row: Row;
      try {
        row = await model.duplicate(ctx.tenantId, ctx.userId, id, name);
      } catch (e) {
        if (e instanceof DbError && e.code === 'ERR_NOT_FOUND')
          throw new AppError(404, 'NOT_FOUND', 'No se encontró el producto.');
        mapDbError(e);
      }
      await s.audit.log(ctx, {
        action: 'product.duplicate',
        entity: 'product',
        entityUuid: String(row.uuid),
        after: { from: id, name },
      });
      return this.get(ctx, String(row.uuid));
    },

    async setArchived(ctx: TenantContext, id: string, archived: boolean) {
      let row: Row;
      try {
        row = await model.setArchived(ctx.tenantId, ctx.userId, id, archived);
      } catch (e) {
        if (e instanceof DbError && e.code === 'ERR_NOT_FOUND')
          throw new AppError(404, 'NOT_FOUND', 'No se encontró el producto.');
        mapDbError(e);
      }
      await s.audit.log(ctx, {
        action: archived ? 'product.archive' : 'product.restore',
        entity: 'product',
        entityUuid: id,
      });
      return productDto(row);
    },

    /** Cambio de precio / margen objetivo / multiplicador. Siempre auditado (SOP §35). */
    async setPrice(ctx: TenantContext, id: string, input: z.infer<typeof priceUpdateInput>) {
      let row: Row;
      try {
        row = await model.setPrice(ctx.tenantId, ctx.userId, id, input);
      } catch (e) {
        if (e instanceof DbError && e.code === 'ERR_NOT_FOUND')
          throw new AppError(404, 'NOT_FOUND', 'No se encontró el producto.');
        throw e;
      }
      const dto = productDto(row);
      await s.audit.log(ctx, {
        action: 'product.price_change',
        entity: 'product',
        entityUuid: id,
        before: row.before_json,
        after: {
          current_price: dto.currentPrice,
          target_margin: dto.targetMargin,
          multiplier: dto.multiplier,
        },
      });
      return dto;
    },
  };
}

export type ProductController = ReturnType<typeof createProductController>;
