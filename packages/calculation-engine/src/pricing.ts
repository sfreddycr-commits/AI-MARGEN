import {
  CalculationError,
  Decimal,
  assertNonNegative,
  safeDivide,
  toDecimal,
  type DecimalInput,
} from './decimal.js';
import type { Warning } from './costing.js';

const S = 6;
const out = (d: Decimal) => d.toDecimalPlaces(S, Decimal.ROUND_HALF_UP).toFixed(S);

/** Valida margen como fracción: 0 ≤ m < 1 (ADR-0009). */
export function validateMargin(margin: DecimalInput, field = 'margen'): Decimal {
  const m = toDecimal(margin, field);
  if (m.isNegative() || m.gte(1)) throw new CalculationError('INVALID_MARGIN', field);
  return m;
}

/** Precio por margen = costo / (1 − margen) (SOP §16). */
export function priceByMargin(cost: DecimalInput, margin: DecimalInput): string {
  const c = assertNonNegative(toDecimal(cost, 'costo'), 'costo');
  const m = validateMargin(margin);
  return out(safeDivide(c, new Decimal(1).minus(m), 'margen'));
}

/** Precio por multiplicador = costo × multiplicador (SOP §16). */
export function priceByMultiplier(cost: DecimalInput, multiplier: DecimalInput): string {
  const c = assertNonNegative(toDecimal(cost, 'costo'), 'costo');
  const k = toDecimal(multiplier, 'multiplicador');
  if (k.lte(0)) throw new CalculationError('INVALID_NUMBER', 'multiplicador');
  return out(c.times(k));
}

/** Utilidad = precio − costo. */
export function profit(price: DecimalInput, cost: DecimalInput): string {
  const p = assertNonNegative(toDecimal(price, 'precio'), 'precio');
  const c = assertNonNegative(toDecimal(cost, 'costo'), 'costo');
  return out(p.minus(c));
}

/** Margen real = utilidad / precio. Puede ser negativo si el precio es menor al costo. */
export function realMargin(price: DecimalInput, cost: DecimalInput): string {
  const p = assertNonNegative(toDecimal(price, 'precio'), 'precio');
  const c = assertNonNegative(toDecimal(cost, 'costo'), 'costo');
  return out(safeDivide(p.minus(c), p, 'precio'));
}

/** Multiplicador equivalente a un margen: 1 / (1 − m). Explica "margen ≠ multiplicador". */
export function multiplierForMargin(margin: DecimalInput): string {
  const m = validateMargin(margin);
  return out(new Decimal(1).dividedBy(new Decimal(1).minus(m)));
}

/** Margen que produce un multiplicador: 1 − 1/k. */
export function marginForMultiplier(multiplier: DecimalInput): string {
  const k = toDecimal(multiplier, 'multiplicador');
  if (k.lte(0)) throw new CalculationError('INVALID_NUMBER', 'multiplicador');
  return out(new Decimal(1).minus(new Decimal(1).dividedBy(k)));
}

export interface PriceEvaluation {
  price: string;
  profit: string;
  margin: string | null;
}

function evaluate(price: Decimal, cost: Decimal): PriceEvaluation {
  return {
    price: out(price),
    profit: out(price.minus(cost)),
    margin: price.isZero() ? null : out(price.minus(cost).dividedBy(price)),
  };
}

export interface PricingInput {
  /** Costo por porción (unidad vendible). */
  cost: DecimalInput;
  currentPrice?: DecimalInput | null;
  targetMargin?: DecimalInput | null;
  multiplier?: DecimalInput | null;
}

export interface PricingAnalysis {
  current: PriceEvaluation | null;
  byMargin: PriceEvaluation | null;
  byMultiplier: PriceEvaluation | null;
  /** Multiplicador que equivale al margen objetivo. */
  equivalentMultiplier: string | null;
  /** Margen que produce el multiplicador indicado. */
  multiplierMargin: string | null;
  /** Precio recomendado (por margen) − precio actual. Positivo = conviene subir. */
  differenceToRecommended: string | null;
  warnings: Warning[];
}

/** Análisis completo de precio y rentabilidad (SOP §17). */
export function analyzePricing(input: PricingInput): PricingAnalysis {
  const cost = assertNonNegative(toDecimal(input.cost, 'costo'), 'costo');
  const warnings: Warning[] = [];
  const has = (v: DecimalInput | null | undefined): v is DecimalInput =>
    v !== null && v !== undefined && v !== '';

  let current: PriceEvaluation | null = null;
  if (has(input.currentPrice)) {
    const p = assertNonNegative(toDecimal(input.currentPrice, 'precio actual'), 'precio actual');
    current = evaluate(p, cost);
    if (p.isZero()) {
      warnings.push({ code: 'NO_PRICE', message: 'El producto no tiene precio de venta.' });
    } else if (p.lt(cost)) {
      warnings.push({
        code: 'PRICE_BELOW_COST',
        message: 'El precio actual es menor al costo: cada venta pierde dinero.',
      });
    }
  } else {
    warnings.push({ code: 'NO_PRICE', message: 'El producto no tiene precio de venta.' });
  }

  let byMargin: PriceEvaluation | null = null;
  let equivalentMultiplier: string | null = null;
  if (has(input.targetMargin)) {
    const m = validateMargin(input.targetMargin, 'margen objetivo');
    byMargin = evaluate(cost.dividedBy(new Decimal(1).minus(m)), cost);
    equivalentMultiplier = multiplierForMargin(m);
    if (
      current?.margin &&
      new Decimal(current.margin).lt(m) &&
      !new Decimal(current.price).isZero()
    ) {
      warnings.push({
        code: 'MARGIN_BELOW_TARGET',
        message: 'El margen actual está por debajo del margen objetivo.',
      });
    }
  }

  let byMultiplier: PriceEvaluation | null = null;
  let multiplierMargin: string | null = null;
  if (has(input.multiplier)) {
    const k = toDecimal(input.multiplier, 'multiplicador');
    if (k.lte(0)) throw new CalculationError('INVALID_NUMBER', 'multiplicador');
    byMultiplier = evaluate(cost.times(k), cost);
    multiplierMargin = marginForMultiplier(k);
    if (k.lt(1)) {
      warnings.push({
        code: 'MULTIPLIER_BELOW_ONE',
        message: 'Un multiplicador menor a 1 da un precio menor al costo.',
      });
    }
  }

  const differenceToRecommended =
    byMargin && current ? out(new Decimal(byMargin.price).minus(current.price)) : null;

  return {
    current,
    byMargin,
    byMultiplier,
    equivalentMultiplier,
    multiplierMargin,
    differenceToRecommended,
    warnings,
  };
}
