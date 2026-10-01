import {
  CalculationError,
  calculateRecipe,
  weightedAverageUnitCost,
  type CustomConversion,
  type RecipeBreakdown,
  type RecipeInput,
  type RecipeItemInput,
} from '@aimargen/calculation-engine';
import type { Db, Row } from '../db/db.js';
import { json } from '../http/dto.js';
import type { TenantContext } from '../http/request-context.js';

/**
 * Servicio de costeo compartido por ingredientes, compras y productos.
 * Toda cifra sale del motor de cálculo; la BD solo guarda y selecciona.
 */

export function conversionsOf(r: Row): CustomConversion[] {
  return json<Array<{ from: string; to: string; factor: string }>>(r.conversions, []).map((c) => ({
    from: c.from as CustomConversion['from'],
    to: c.to as CustomConversion['to'],
    factor: c.factor,
  }));
}

/** Construye la entrada del motor a partir de una fila de producto (componentes) y sus líneas. */
export function recipeInputFrom(product: Row, lines: Array<RecipeItemInput>): RecipeInput {
  return {
    portions: String(product.portions),
    items: lines,
    packaging: { mode: product.packaging_mode, value: String(product.packaging_value) },
    labor: { mode: product.labor_mode, value: String(product.labor_value) },
    overhead: { mode: product.overhead_mode, value: String(product.overhead_value) },
    wastePct: String(product.waste_pct),
  };
}

/** Línea de receta para el motor a partir de una fila con datos del ingrediente. */
export function recipeLineFrom(r: Row): RecipeItemInput {
  return {
    ref: String(r.ingredient_uuid),
    name: String(r.ingredient_name),
    quantity: String(r.quantity),
    unit: String(r.unit),
    ingredientUnit: String(r.ingredient_unit),
    unitCost:
      r.current_unit_cost === null || r.current_unit_cost === undefined
        ? null
        : String(r.current_unit_cost),
    yield:
      r.yield_fraction === null || r.yield_fraction === undefined ? '1' : String(r.yield_fraction),
    conversions: conversionsOf(r),
  };
}

export function createCostingService(db: Db) {
  /** Recalcula y persiste el costo de productos (null = todos los activos del tenant). */
  async function recalcProducts(tenantId: number, productUuids: string[] | null): Promise<number> {
    if (productUuids && productUuids.length === 0) return 0;
    const [products = [], lines = []] = await db.call<Row>('sp_product_costing_inputs', [
      tenantId,
      productUuids ? JSON.stringify(productUuids) : null,
    ]);
    const byProduct = new Map<string, RecipeItemInput[]>();
    for (const l of lines) {
      const key = String(l.product_uuid);
      if (!byProduct.has(key)) byProduct.set(key, []);
      byProduct.get(key)!.push(recipeLineFrom(l));
    }
    const costs = products.map((p) => {
      let b: RecipeBreakdown;
      try {
        b = calculateRecipe(recipeInputFrom(p, byProduct.get(String(p.uuid)) ?? []));
      } catch (e) {
        if (!(e instanceof CalculationError)) throw e;
        return { uuid: String(p.uuid), cost_total: null, cost_per_portion: null, complete: 0 };
      }
      return {
        uuid: String(p.uuid),
        cost_total: b.totalCost,
        cost_per_portion: b.costPerPortion,
        complete: b.complete ? 1 : 0,
      };
    });
    if (costs.length) await db.call('sp_product_costs_set', [tenantId, JSON.stringify(costs)]);
    return costs.length;
  }

  return {
    recalcProducts,

    /**
     * Tras cambiar el costo de ingredientes (compra, anulación, costo manual):
     * 1) si el negocio usa promedio ponderado, lo calcula con el motor y lo fija;
     * 2) recalcula los productos que usan esos ingredientes.
     */
    async afterIngredientCostChange(
      ctx: TenantContext,
      ingredientIds: number[],
      costMethod: string,
    ): Promise<void> {
      if (!ingredientIds.length) return;
      const ids = JSON.stringify(ingredientIds);
      if (costMethod === 'weighted_average') {
        const rows = await db.callOne<Row>('sp_ingredient_history_window', [ctx.tenantId, ids, 90]);
        const grouped = new Map<number, Array<{ quantity: string; unitCost: string }>>();
        for (const r of rows) {
          const k = Number(r.ingredient_id);
          if (!grouped.has(k)) grouped.set(k, []);
          grouped.get(k)!.push({ quantity: String(r.quantity), unitCost: String(r.unit_cost) });
        }
        const costs = [...grouped.entries()]
          .map(([id, purchases]) => ({ id, cost: weightedAverageUnitCost(purchases) }))
          .filter((c) => c.cost !== null);
        if (costs.length)
          await db.call('sp_ingredient_current_cost_set', [ctx.tenantId, JSON.stringify(costs)]);
      }
      const products = await db.callOne<Row>('sp_product_uuids_by_ingredients', [
        ctx.tenantId,
        ids,
      ]);
      await recalcProducts(
        ctx.tenantId,
        products.map((p) => String(p.uuid)),
      );
    },
  };
}

export type CostingService = ReturnType<typeof createCostingService>;
