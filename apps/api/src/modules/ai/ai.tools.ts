import { z } from 'zod';
import {
  CalculationError,
  Decimal,
  breakEven,
  priceByMargin,
  priceByMultiplier,
  marginForMultiplier,
  profit,
} from '@aimargen/calculation-engine';
import { formatMoney, formatPercent } from '@aimargen/types';
import { uuid } from '@aimargen/schemas';
import { AppError } from '../../core/http/app-error.js';
import type { TenantContext } from '../../core/http/request-context.js';
import type { ProductController } from '../products/products.controller.js';
import type { IngredientController } from '../ingredients/ingredients.controller.js';
import type { PurchaseController } from '../purchases/purchases.controller.js';
import type { PlanningController } from '../planning/planning.controller.js';
import type { DashboardController } from '../dashboard/dashboard.controller.js';
import type { AiToolSpec } from './provider.js';

/**
 * Herramientas autorizadas del AI Gateway (SOP §21). El modelo NUNCA accede a la BD:
 * cada herramienta llama a un controlador existente, que usa SPs y el motor de cálculo.
 * El tenant sale de la sesión (ctx) y no es un parámetro que el modelo pueda enviar.
 */
export interface ToolDeps {
  products: ProductController;
  ingredients: IngredientController;
  purchases: PurchaseController;
  planning: PlanningController;
  dashboard: DashboardController;
  supplierPrices: (ctx: TenantContext, ingredientUuid: string | null) => Promise<unknown>;
  createDraft: (
    ctx: TenantContext,
    kind: 'recipe' | 'scenario',
    input: unknown,
  ) => Promise<unknown>;
  currency: (ctx: TenantContext) => Promise<{ currency: string; scale: number }>;
}

export interface ToolDef {
  name: string;
  description: string;
  permission: string;
  /** Herramientas que generan borradores (requieren confirmación humana posterior). */
  writes?: boolean;
  schema: z.ZodType;
  run: (ctx: TenantContext, input: never, deps: ToolDeps) => Promise<unknown>;
}

const fraction = z.string().regex(/^\d(\.\d{1,6})?$/);
const money = z.string().regex(/^\d{1,12}(\.\d{1,6})?$/);

function tool<S extends z.ZodType>(
  def: Omit<ToolDef, 'schema' | 'run'> & {
    schema: S;
    run: (ctx: TenantContext, input: z.infer<S>, deps: ToolDeps) => Promise<unknown>;
  },
): ToolDef {
  return def as unknown as ToolDef;
}

export const TOOLS: ToolDef[] = [
  tool({
    name: 'get_tenant_summary',
    description:
      'Resumen del negocio: indicadores, alertas e insights calculados. Úselo para preguntas generales.',
    permission: 'products.read',
    schema: z.object({}),
    run: async (ctx, _i, d) => {
      const s = await d.dashboard.summary(ctx);
      return {
        currency: s.currency,
        kpis: s.kpis,
        alerts: s.alerts.map((a) => ({ title: a.title, detail: a.detail })),
        insights: s.insights.map((i) => i.text),
      };
    },
  }),
  tool({
    name: 'search_ingredients',
    description:
      'Busca ingredientes por nombre. Devuelve costo por unidad, costo efectivo (con rendimiento) y proveedor.',
    permission: 'ingredients.read',
    schema: z.object({
      query: z.string().max(80).optional(),
      only_missing_cost: z.boolean().optional(),
    }),
    run: async (ctx, i, d) => {
      const r = await d.ingredients.list(ctx, {
        q: i.query,
        filter: i.only_missing_cost ? 'missing_cost' : 'active',
        page: 1,
        pageSize: 25,
      });
      return {
        total: r.total,
        items: r.items.map((x) => ({
          uuid: x.uuid,
          name: x.name,
          unit: x.unit,
          unit_cost: x.unitCost,
          effective_unit_cost: x.effectiveUnitCost,
          yield: x.yield,
          supplier: x.supplierName,
          last_cost_at: x.lastCostAt,
          used_in_products: x.usedInProducts,
        })),
      };
    },
  }),
  tool({
    name: 'get_ingredient',
    description: 'Detalle de un ingrediente por uuid.',
    permission: 'ingredients.read',
    schema: z.object({ uuid }),
    run: async (ctx, i, d) => d.ingredients.get(ctx, i.uuid),
  }),
  tool({
    name: 'get_ingredient_price_history',
    description:
      'Historial de costos de un ingrediente (más reciente primero), con proveedor y origen.',
    permission: 'ingredients.read',
    schema: z.object({ uuid }),
    run: async (ctx, i, d) => (await d.ingredients.history(ctx, i.uuid)).slice(0, 30),
  }),
  tool({
    name: 'search_products',
    description:
      'Busca productos. Devuelve costo por porción, precio, utilidad, margen real, margen objetivo y estado (healthy, below_target, below_cost, no_price, incomplete).',
    permission: 'products.read',
    schema: z.object({ query: z.string().max(80).optional() }),
    run: async (ctx, i, d) => {
      const r = await d.products.list(ctx, { q: i.query, filter: 'active', page: 1, pageSize: 40 });
      return {
        total: r.total,
        items: r.items.map((p) => ({
          uuid: p.uuid,
          name: p.name,
          cost_per_portion: p.costPerPortion,
          price: p.currentPrice,
          profit: p.pricing.profit,
          margin: p.pricing.margin,
          target_margin: p.effectiveTargetMargin,
          status: p.pricing.status,
          recommended_price: p.pricing.recommendedPrice,
          cost_complete: p.costComplete,
        })),
      };
    },
  }),
  tool({
    name: 'get_product',
    description: 'Detalle de un producto: receta, costos, precio y análisis de margen.',
    permission: 'products.read',
    schema: z.object({ uuid }),
    run: async (ctx, i, d) => {
      const p = await d.products.get(ctx, i.uuid);
      return {
        uuid: p.uuid,
        name: p.name,
        portions: p.portions,
        price: p.currentPrice,
        target_margin: p.effectiveTargetMargin,
        breakdown: p.breakdown,
        analysis: p.analysis,
      };
    },
  }),
  tool({
    name: 'get_product_cost_breakdown',
    description:
      'Desglose del costo de un producto por ingrediente y componente (empaque, mano de obra, indirectos, merma).',
    permission: 'products.read',
    schema: z.object({ uuid }),
    run: async (ctx, i, d) => (await d.products.get(ctx, i.uuid)).breakdown,
  }),
  tool({
    name: 'get_product_margin',
    description:
      'Análisis de precio y margen de un producto: actual, por margen objetivo y por multiplicador.',
    permission: 'pricing.read',
    schema: z.object({ uuid }),
    run: async (ctx, i, d) => {
      const p = await d.products.get(ctx, i.uuid);
      return {
        name: p.name,
        cost_per_portion: p.breakdown.costPerPortion,
        price: p.currentPrice,
        target_margin: p.effectiveTargetMargin,
        analysis: p.analysis,
      };
    },
  }),
  tool({
    name: 'get_purchase_history',
    description:
      'Compras registradas, opcionalmente filtradas por ingrediente, proveedor o fechas (YYYY-MM-DD).',
    permission: 'purchases.read',
    schema: z.object({
      ingredient_uuid: uuid.optional(),
      supplier_uuid: uuid.optional(),
      from: z.iso.date().optional(),
      to: z.iso.date().optional(),
    }),
    run: async (ctx, i, d) =>
      (
        await d.purchases.list(ctx, {
          ingredient: i.ingredient_uuid,
          supplier: i.supplier_uuid,
          from: i.from,
          to: i.to,
          includeVoid: false,
          page: 1,
          pageSize: 20,
        })
      ).items,
  }),
  tool({
    name: 'get_supplier_history',
    description:
      'Costos por proveedor de los últimos 180 días (para comparar quién vende más barato un ingrediente).',
    permission: 'suppliers.read',
    schema: z.object({ ingredient_uuid: uuid.optional() }),
    run: async (ctx, i, d) => d.supplierPrices(ctx, i.ingredient_uuid ?? null),
  }),
  tool({
    name: 'get_scenario',
    description: 'Lista los escenarios guardados con sus resultados (o uno por uuid).',
    permission: 'scenarios.read',
    schema: z.object({ uuid: uuid.optional() }),
    run: async (ctx, i, d) =>
      i.uuid ? d.planning.getScenario(ctx, i.uuid) : d.planning.listScenarios(ctx),
  }),
  tool({
    name: 'calculate_break_even',
    description:
      'Punto de equilibrio: costos fijos / (precio − costo variable). Si no se envían costos fijos se usan los del negocio.',
    permission: 'scenarios.read',
    schema: z.object({ price: money, variable_unit_cost: money, fixed_costs: money.optional() }),
    run: async (ctx, i, d) => {
      const fixed = i.fixed_costs ?? (await d.planning.fixedTotal(ctx));
      try {
        return {
          fixed_costs: fixed,
          ...breakEven({
            fixedCosts: fixed,
            price: i.price,
            variableUnitCost: i.variable_unit_cost,
          }),
        };
      } catch (e) {
        if (e instanceof CalculationError)
          return { error: 'El precio no supera el costo variable: no hay punto de equilibrio.' };
        throw e;
      }
    },
  }),
  tool({
    name: 'simulate_scenario',
    description:
      'Simula ventas mensuales sin guardar nada: ingresos, costos, utilidad y equilibrio. Use product_uuid para tomar su costo por porción.',
    permission: 'scenarios.read',
    schema: z.object({
      price: money,
      units_per_day: money,
      days_per_month: z.number().int().min(1).max(31).default(26),
      product_uuid: uuid.optional(),
      variable_unit_cost: money.optional(),
      fixed_costs: money.optional(),
    }),
    run: async (ctx, i, d) => {
      if (!i.product_uuid && !i.variable_unit_cost) {
        return { error: 'Falta el costo variable por unidad o el producto para tomar su costo.' };
      }
      return d.planning.calculate(ctx, {
        price: i.price,
        unitsPerDay: i.units_per_day,
        daysPerMonth: i.days_per_month,
        fixedCosts: i.fixed_costs ?? null,
        variableUnitCost: i.variable_unit_cost ?? '0',
        variableSource: i.product_uuid ? 'product' : 'manual',
        productUuid: i.product_uuid ?? null,
      });
    },
  }),
  tool({
    name: 'compare_margin_options',
    description:
      'Compara precios para varios márgenes (fracciones, ej. "0.45") y multiplicadores, a partir del costo de un producto o de un costo dado.',
    permission: 'pricing.read',
    schema: z.object({
      product_uuid: uuid.optional(),
      cost: money.optional(),
      margins: z.array(fraction).max(6).default(['0.35', '0.4', '0.45', '0.5']),
      multipliers: z.array(money).max(6).default([]),
    }),
    run: async (ctx, i, d) => {
      let cost = i.cost;
      let name: string | null = null;
      if (i.product_uuid) {
        const p = await d.products.get(ctx, i.product_uuid);
        cost = p.breakdown.costPerPortion ?? undefined;
        name = p.name;
      }
      if (!cost)
        return {
          error:
            'No hay costo para comparar. El producto tiene la receta incompleta o no se indicó un costo.',
        };
      const { currency, scale } = await d.currency(ctx);
      const byMargin = i.margins.map((m) => {
        try {
          const price = priceByMargin(cost!, m);
          return {
            margin: m,
            price,
            profit: profit(price, cost!),
            price_fmt: formatMoney(price, currency, scale),
          };
        } catch {
          return { margin: m, error: 'Margen inválido (debe ser menor que 100%).' };
        }
      });
      const byMultiplier = i.multipliers.map((k) => {
        const price = priceByMultiplier(cost!, k);
        return {
          multiplier: k,
          price,
          margin: marginForMultiplier(k),
          margin_fmt: formatPercent(marginForMultiplier(k)),
        };
      });
      return {
        product: name,
        cost,
        cost_fmt: formatMoney(cost, currency, scale),
        by_margin: byMargin,
        by_multiplier: byMultiplier,
      };
    },
  }),
  tool({
    name: 'list_low_margin_products',
    description:
      'Productos con margen real por debajo de un umbral (fracción) o de su margen objetivo si no se indica umbral.',
    permission: 'pricing.read',
    schema: z.object({ threshold: fraction.optional() }),
    run: async (ctx, i, d) => {
      const all = await d.products.all(ctx);
      const items = all.filter((p) =>
        i.threshold
          ? p.pricing.margin !== null && new Decimal(p.pricing.margin).lt(i.threshold)
          : p.pricing.status === 'below_target' || p.pricing.status === 'below_cost',
      );
      return items
        .sort((a, b) => new Decimal(a.pricing.margin ?? 0).cmp(b.pricing.margin ?? 0))
        .map((p) => ({
          uuid: p.uuid,
          name: p.name,
          margin: p.pricing.margin,
          target: p.effectiveTargetMargin,
          price: p.currentPrice,
          cost: p.costPerPortion,
          recommended_price: p.pricing.recommendedPrice,
        }));
    },
  }),
  tool({
    name: 'draft_recipe',
    description:
      'Prepara un BORRADOR de receta a partir de lo que dijo la persona. No guarda nada: la persona revisa y confirma en pantalla. Nunca invente costos; solo nombres, cantidades y unidades dichos por la persona.',
    permission: 'products.write',
    writes: true,
    schema: z.object({
      name: z.string().min(1).max(120),
      portions: z
        .string()
        .regex(/^\d+(\.\d+)?$/)
        .optional(),
      lines: z
        .array(
          z.object({
            ingredient_name: z.string().min(1).max(120),
            quantity: money,
            unit: z.string().max(20),
          }),
        )
        .max(40),
      packaging_amount: money.optional(),
    }),
    run: async (ctx, i, d) => d.createDraft(ctx, 'recipe', i),
  }),
  tool({
    name: 'create_scenario',
    description:
      'Prepara un BORRADOR de escenario para guardar. No guarda nada: la persona revisa y confirma en pantalla. Use simulate_scenario si solo quiere ver números.',
    permission: 'scenarios.write',
    writes: true,
    schema: z.object({
      name: z.string().min(1).max(120),
      price: money,
      units_per_day: money,
      days_per_month: z.number().int().min(1).max(31).default(26),
      product_uuid: uuid.optional(),
      variable_unit_cost: money.optional(),
      fixed_costs: money.optional(),
    }),
    run: async (ctx, i, d) => d.createDraft(ctx, 'scenario', i),
  }),
];

/** Especificación JSON Schema de cada herramienta para el proveedor. */
export function toolSpecs(permissions: ReadonlySet<string>): AiToolSpec[] {
  return TOOLS.filter((t) => permissions.has(t.permission)).map((t) => {
    const schema = z.toJSONSchema(t.schema, { io: 'input' }) as Record<string, unknown>;
    delete schema.$schema;
    return { name: t.name, description: t.description, inputSchema: schema };
  });
}

export function findTool(name: string): ToolDef | undefined {
  return TOOLS.find((t) => t.name === name);
}

export { AppError };
