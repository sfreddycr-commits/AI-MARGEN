import {
  CalculationError,
  Decimal,
  analyzePricing,
  type PricingAnalysis,
  type RecipeBreakdown,
} from '@aimargen/calculation-engine';
import type { Row } from '../../core/db/db.js';
import { bool, dec, iso } from '../../core/http/dto.js';

export type ProductStatus = 'incomplete' | 'no_price' | 'below_cost' | 'below_target' | 'healthy';

/** Estado de rentabilidad de un producto, calculado con el motor. */
export function pricingSummary(
  costPerPortion: string | null,
  price: string | null,
  target: string | null,
  multiplier: string | null,
  complete: boolean,
) {
  let analysis: PricingAnalysis | null = null;
  if (costPerPortion !== null) {
    try {
      analysis = analyzePricing({
        cost: costPerPortion,
        currentPrice: price,
        targetMargin: target,
        multiplier,
      });
    } catch (e) {
      if (!(e instanceof CalculationError)) throw e;
    }
  }
  const codes = new Set(analysis?.warnings.map((w) => w.code) ?? []);
  const hasPrice = price !== null && !new Decimal(price).isZero();
  let status: ProductStatus = 'healthy';
  if (!complete || costPerPortion === null) status = 'incomplete';
  else if (!hasPrice) status = 'no_price';
  else if (codes.has('PRICE_BELOW_COST')) status = 'below_cost';
  else if (codes.has('MARGIN_BELOW_TARGET')) status = 'below_target';
  return {
    status,
    profit: hasPrice ? (analysis?.current?.profit ?? null) : null,
    margin: hasPrice ? (analysis?.current?.margin ?? null) : null,
    recommendedPrice: analysis?.byMargin?.price ?? null,
    analysis,
  };
}

export function productDto(r: Row) {
  const costPerPortion = dec(r.cost_per_portion);
  const price = dec(r.current_price);
  const target = dec(r.effective_target_margin);
  const multiplier = dec(r.multiplier);
  const complete = bool(r.cost_complete);
  const summary = pricingSummary(costPerPortion, price, target, multiplier, complete);
  const pricing = {
    status: summary.status,
    profit: dec(summary.profit),
    margin: dec(summary.margin),
    recommendedPrice: dec(summary.recommendedPrice),
  };
  return {
    uuid: String(r.uuid),
    name: String(r.name),
    categoryUuid: r.category_uuid ?? null,
    categoryName: r.category_name ?? null,
    portions: dec(r.portions)!,
    currentPrice: price,
    targetMargin: dec(r.target_margin),
    effectiveTargetMargin: target,
    multiplier,
    packaging: { mode: String(r.packaging_mode), value: dec(r.packaging_value)! },
    labor: { mode: String(r.labor_mode), value: dec(r.labor_value)! },
    overhead: { mode: String(r.overhead_mode), value: dec(r.overhead_value)! },
    wastePct: dec(r.waste_pct)!,
    notes: r.notes ?? null,
    costTotal: dec(r.cost_total),
    costPerPortion,
    costComplete: complete,
    costedAt: iso(r.costed_at),
    itemsCount: Number(r.items_count ?? 0),
    pricing,
    isDemo: bool(r.is_demo),
    archived: !!r.deleted_at,
    rowVersion: Number(r.row_version),
    updatedAt: iso(r.updated_at),
  };
}

export type ProductDto = ReturnType<typeof productDto>;

export function breakdownDto(b: RecipeBreakdown, lines: Row[]) {
  const byRef = new Map(b.items.map((i) => [i.ref, i]));
  return {
    items: lines.map((l) => {
      const res = byRef.get(String(l.ingredient_uuid));
      return {
        ingredientUuid: String(l.ingredient_uuid),
        ingredientName: String(l.ingredient_name),
        quantity: dec(l.quantity),
        unit: String(l.unit),
        ingredientUnit: String(l.ingredient_unit),
        unitCost: dec(l.current_unit_cost),
        yield: dec(l.yield_fraction),
        cost: res?.cost ? dec(res.cost) : null,
        archived: !!l.ingredient_deleted_at,
      };
    }),
    ingredientsCost: dec(b.ingredientsCost),
    packagingCost: dec(b.packagingCost),
    laborCost: dec(b.laborCost),
    overheadCost: dec(b.overheadCost),
    wasteCost: dec(b.wasteCost),
    totalCost: dec(b.totalCost),
    costPerPortion: dec(b.costPerPortion),
    complete: b.complete,
    warnings: b.warnings,
  };
}

export function analysisDto(a: PricingAnalysis | null) {
  if (!a) return null;
  const ev = (e: PricingAnalysis['current']) =>
    e ? { price: dec(e.price), profit: dec(e.profit), margin: dec(e.margin) } : null;
  return {
    current: ev(a.current),
    byMargin: ev(a.byMargin),
    byMultiplier: ev(a.byMultiplier),
    equivalentMultiplier: dec(a.equivalentMultiplier),
    multiplierMargin: dec(a.multiplierMargin),
    differenceToRecommended: dec(a.differenceToRecommended),
    warnings: a.warnings,
  };
}
