import { Decimal, percentChange } from '@aimargen/calculation-engine';
import { formatMoney, formatPercent } from '@aimargen/types';
import type { TenantContext } from '../../core/http/request-context.js';
import { dec } from '../../core/http/dto.js';
import type { ProductController } from '../products/products.controller.js';
import type { PlanningController } from '../planning/planning.controller.js';
import type { TenantModel } from '../tenant/tenant.model.js';
import type { DashboardModel } from './dashboard.model.js';

export type AlertSeverity = 'danger' | 'warning' | 'info';
export interface Alert {
  code: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  link: string | null;
}
export interface Insight {
  code: string;
  text: string;
  link: string | null;
  /** Cifras exactas usadas en el texto (trazabilidad, SOP §43 Etapa 14). */
  figures: Record<string, string | null>;
}

/** Aumento de costo de ingrediente que se considera significativo. */
export const SIGNIFICANT_INCREASE = '0.10';

/**
 * Dashboard del tenant (SOP §10): KPIs, alertas (SOP §26) e insights.
 * Todas las cifras provienen del backend y del motor de cálculo; los textos son plantillas
 * deterministas, así que cada número es rastreable a sus datos.
 */
export function createDashboardController(
  model: DashboardModel,
  products: ProductController,
  planning: PlanningController,
  tenants: TenantModel,
) {
  return {
    async costIncreases(ctx: TenantContext, days = 30) {
      const rows = await model.costChanges(ctx.tenantId, days);
      return rows
        .map((r) => ({
          uuid: String(r.uuid),
          name: String(r.name),
          unit: String(r.unit),
          previousUnitCost: dec(r.previous_unit_cost),
          currentUnitCost: dec(r.current_unit_cost),
          change: percentChange(String(r.previous_unit_cost), String(r.current_unit_cost)),
        }))
        .filter((r) => r.change !== null)
        .sort((a, b) => new Decimal(b.change!).cmp(a.change!));
    },

    async summary(ctx: TenantContext) {
      const tenant = await tenants.get(ctx.tenantId);
      const currency = String(tenant?.currency ?? 'CRC');
      const scale = Number(tenant?.rounding_scale ?? 2);
      const money = (v: string | null) => (v === null ? '' : formatMoney(v, currency, scale));

      const [counts, list, scenarios, increases, fixedTotal] = await Promise.all([
        model.counts(ctx.tenantId),
        products.all(ctx),
        planning.listScenarios(ctx),
        this.costIncreases(ctx, 30),
        planning.fixedTotal(ctx),
      ]);

      const belowCost = list.filter((p) => p.pricing.status === 'below_cost');
      const belowTarget = list.filter((p) => p.pricing.status === 'below_target');
      const costed = list.filter((p) => p.costPerPortion !== null && p.costComplete);
      const averageCost = costed.length
        ? costed
            .reduce((acc, p) => acc.plus(p.costPerPortion!), new Decimal(0))
            .dividedBy(costed.length)
            .toFixed(6)
        : null;
      const priced = list.filter((p) => p.pricing.margin !== null);
      const averageMargin = priced.length
        ? priced
            .reduce((acc, p) => acc.plus(p.pricing.margin!), new Decimal(0))
            .dividedBy(priced.length)
            .toFixed(6)
        : null;
      const active = scenarios[0] ?? null;
      const significant = increases.filter((i) => new Decimal(i.change!).gte(SIGNIFICANT_INCREASE));

      // ---------- Alertas (SOP §26) ----------
      const alerts: Alert[] = [];
      for (const p of belowCost) {
        alerts.push({
          code: 'PRICE_BELOW_COST',
          severity: 'danger',
          title: `${p.name}: precio menor al costo`,
          detail: `Cuesta ${money(p.costPerPortion)} y se vende en ${money(p.currentPrice)}.`,
          link: `/app/products/${p.uuid}`,
        });
      }
      for (const sc of scenarios.filter(
        (s) => s.result && new Decimal(s.result.profit ?? 0).isNegative(),
      )) {
        alerts.push({
          code: 'SCENARIO_NEGATIVE',
          severity: 'danger',
          title: `Escenario "${sc.name}" con pérdida`,
          detail: `Utilidad estimada: ${money(sc.result!.profit)} al mes.`,
          link: `/app/scenarios/${sc.uuid}`,
        });
      }
      if (belowTarget.length) {
        alerts.push({
          code: 'MARGIN_BELOW_TARGET',
          severity: 'warning',
          title: `${belowTarget.length} ${belowTarget.length === 1 ? 'producto' : 'productos'} bajo el margen objetivo`,
          detail: belowTarget
            .slice(0, 3)
            .map((p) => p.name)
            .join(', '),
          link: '/app/products?filter=below_target',
        });
      }
      if (Number(counts.products_no_price) > 0) {
        alerts.push({
          code: 'NO_PRICE',
          severity: 'warning',
          title: `${counts.products_no_price} ${Number(counts.products_no_price) === 1 ? 'producto' : 'productos'} sin precio`,
          detail: 'Defina un precio para conocer su utilidad.',
          link: '/app/products?filter=no_price',
        });
      }
      if (Number(counts.ingredients_missing_cost) > 0) {
        alerts.push({
          code: 'INGREDIENT_NO_COST',
          severity: 'warning',
          title: `${counts.ingredients_missing_cost} ${Number(counts.ingredients_missing_cost) === 1 ? 'ingrediente' : 'ingredientes'} sin costo`,
          detail: 'Registre una compra o un costo para calcular sus recetas.',
          link: '/app/ingredients?filter=missing_cost',
        });
      }
      if (Number(counts.products_incomplete) > 0) {
        alerts.push({
          code: 'RECIPE_INCOMPLETE',
          severity: 'warning',
          title: `${counts.products_incomplete} ${Number(counts.products_incomplete) === 1 ? 'receta incompleta' : 'recetas incompletas'}`,
          detail: 'Les falta un ingrediente, un costo o una conversión de unidades.',
          link: '/app/products?filter=incomplete',
        });
      }
      for (const i of significant.slice(0, 5)) {
        alerts.push({
          code: 'COST_INCREASE',
          severity: 'info',
          title: `${i.name} subió ${formatPercent(i.change!)}`,
          detail: `De ${money(i.previousUnitCost)} a ${money(i.currentUnitCost)} por ${i.unit} en 30 días.`,
          link: `/app/ingredients/${i.uuid}`,
        });
      }

      // ---------- Insights ----------
      const insights: Insight[] = [];
      if (belowTarget.length) {
        insights.push({
          code: 'BELOW_TARGET_COUNT',
          text: `${belowTarget.length} ${belowTarget.length === 1 ? 'producto bajó' : 'productos bajaron'} de su margen objetivo.`,
          link: '/app/products?filter=below_target',
          figures: { count: String(belowTarget.length) },
        });
      }
      for (const i of significant.slice(0, 2)) {
        insights.push({
          code: 'COST_INCREASE',
          text: `${i.name} aumentó ${formatPercent(i.change!)} en los últimos 30 días.`,
          link: `/app/ingredients/${i.uuid}`,
          figures: { previous: i.previousUnitCost, current: i.currentUnitCost, change: i.change },
        });
      }
      const recoverable = [...belowTarget, ...belowCost]
        .filter((p) => p.pricing.recommendedPrice)
        .sort((a, b) =>
          new Decimal(b.pricing.recommendedPrice!)
            .minus(b.currentPrice ?? 0)
            .cmp(new Decimal(a.pricing.recommendedPrice!).minus(a.currentPrice ?? 0)),
        );
      for (const p of recoverable.slice(0, 2)) {
        insights.push({
          code: 'PRICE_REVIEW',
          text: `Cobrar ${money(p.pricing.recommendedPrice)} por ${p.name} recupera su margen objetivo de ${formatPercent(p.effectiveTargetMargin ?? '0')}.`,
          link: `/app/pricing?product=${p.uuid}`,
          figures: {
            currentPrice: p.currentPrice,
            recommendedPrice: p.pricing.recommendedPrice,
            costPerPortion: p.costPerPortion,
            targetMargin: p.effectiveTargetMargin,
          },
        });
      }

      return {
        currency,
        roundingScale: scale,
        kpis: {
          productsCount: Number(counts.products_active),
          productsNoPrice: Number(counts.products_no_price),
          productsBelowTarget: belowTarget.length,
          productsBelowCost: belowCost.length,
          ingredientsCount: Number(counts.ingredients_active),
          ingredientsMissingCost: Number(counts.ingredients_missing_cost),
          averageCostPerPortion: dec(averageCost),
          averageMargin: dec(averageMargin),
          fixedCostsMonthly: dec(fixedTotal),
          activeScenario: active
            ? {
                uuid: active.uuid,
                name: active.name,
                profit: active.result?.profit ?? null,
                breakEvenUnits: active.result?.breakEven?.unitsRounded ?? null,
                breakEvenRevenue: active.result?.breakEven?.revenue ?? null,
              }
            : null,
        },
        alerts,
        insights,
        setup: {
          hasIngredients: Number(counts.ingredients_active) > 0,
          hasProducts: Number(counts.products_active) > 0,
          hasPurchases: Number(counts.purchases_count) > 0,
          hasScenarios: Number(counts.scenarios_count) > 0,
          onboardingCompleted: !!tenant?.onboarding_completed_at,
        },
      };
    },
  };
}

export type DashboardController = ReturnType<typeof createDashboardController>;
