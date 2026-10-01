import {
  CalculationError,
  Decimal,
  assertNonNegative,
  safeDivide,
  toDecimal,
  type DecimalInput,
} from './decimal.js';
import { convertQuantity, type CustomConversion } from './units.js';

/** Escala de persistencia (DECIMAL(18,6)). */
const S = 6;
const out = (d: Decimal) => d.toDecimalPlaces(S, Decimal.ROUND_HALF_UP).toFixed(S);

export interface Warning {
  code: string;
  message: string;
  ref?: string;
}

// ---------------------------------------------------------------------------
// Costo unitario
// ---------------------------------------------------------------------------

/** Costo unitario = precio de compra / cantidad comprada (SOP §16). */
export function unitCost(purchasePrice: DecimalInput, quantity: DecimalInput): Decimal {
  const price = assertNonNegative(toDecimal(purchasePrice, 'precio'), 'precio');
  const qty = assertNonNegative(toDecimal(quantity, 'cantidad'), 'cantidad');
  return safeDivide(price, qty, 'cantidad');
}

/**
 * Costo unitario de una compra expresado en la unidad del ingrediente.
 * Ej.: compra 5 kg por ₡10.000; ingrediente en g → ₡2/g.
 */
export function purchaseUnitCost(input: {
  price: DecimalInput;
  quantity: DecimalInput;
  purchaseUnit: string;
  ingredientUnit: string;
  conversions?: readonly CustomConversion[];
}): string {
  const qtyInIngredientUnit = convertQuantity(
    input.quantity,
    input.purchaseUnit,
    input.ingredientUnit,
    input.conversions,
  );
  return out(unitCost(input.price, qtyInIngredientUnit));
}

/** Valida rendimiento 0 < r ≤ 1 (1 = sin merma del ingrediente). */
export function validateYield(yieldFraction: DecimalInput | null | undefined): Decimal {
  if (yieldFraction === null || yieldFraction === undefined || yieldFraction === '')
    return new Decimal(1);
  const y = toDecimal(yieldFraction, 'rendimiento');
  if (y.lte(0) || y.gt(1)) {
    throw new CalculationError('INVALID_NUMBER', 'rendimiento');
  }
  return y;
}

/** Costo efectivo considerando el rendimiento: costo unitario / rendimiento (ADR-0009). */
export function effectiveUnitCost(
  cost: DecimalInput,
  yieldFraction?: DecimalInput | null,
): Decimal {
  const c = assertNonNegative(toDecimal(cost, 'costo unitario'), 'costo unitario');
  return safeDivide(c, validateYield(yieldFraction), 'rendimiento');
}

/** Costo utilizado = cantidad utilizada × costo unitario (SOP §16). */
export function usedCost(quantityUsed: DecimalInput, cost: DecimalInput): Decimal {
  const q = assertNonNegative(toDecimal(quantityUsed, 'cantidad utilizada'), 'cantidad utilizada');
  const c = assertNonNegative(toDecimal(cost, 'costo unitario'), 'costo unitario');
  return q.times(c);
}

/** Promedio ponderado por cantidad de varias compras (método configurable por tenant). */
export function weightedAverageUnitCost(
  purchases: ReadonlyArray<{ quantity: DecimalInput; unitCost: DecimalInput }>,
): string | null {
  let qty = new Decimal(0);
  let total = new Decimal(0);
  for (const p of purchases) {
    const q = assertNonNegative(toDecimal(p.quantity, 'cantidad'), 'cantidad');
    const c = assertNonNegative(toDecimal(p.unitCost, 'costo unitario'), 'costo unitario');
    qty = qty.plus(q);
    total = total.plus(q.times(c));
  }
  if (qty.isZero()) return null;
  return out(total.dividedBy(qty));
}

/** Variación porcentual (fracción) entre dos costos. null si el anterior es 0. */
export function percentChange(previous: DecimalInput, current: DecimalInput): string | null {
  const p = toDecimal(previous, 'anterior');
  const c = toDecimal(current, 'actual');
  if (p.isZero()) return null;
  return out(c.minus(p).dividedBy(p));
}

// ---------------------------------------------------------------------------
// Receta
// ---------------------------------------------------------------------------

export type ComponentMode = 'fixed' | 'percent';

/** Empaque, mano de obra o indirectos: monto fijo por receta o % sobre el costo de ingredientes. */
export interface CostComponent {
  mode: ComponentMode;
  value: DecimalInput;
}

export interface RecipeItemInput {
  /** Identificador para relacionar resultados y advertencias (uuid del ingrediente o de la línea). */
  ref: string;
  name?: string;
  quantity: DecimalInput;
  unit: string;
  ingredientUnit: string;
  /** Costo por unidad del ingrediente; null si el ingrediente aún no tiene costo. */
  unitCost: DecimalInput | null;
  yield?: DecimalInput | null;
  conversions?: readonly CustomConversion[];
}

export interface RecipeInput {
  items: readonly RecipeItemInput[];
  portions: DecimalInput;
  packaging?: CostComponent | null;
  labor?: CostComponent | null;
  overhead?: CostComponent | null;
  /** Merma de la receta: fracción sobre el costo de ingredientes (0 ≤ x < 1). */
  wastePct?: DecimalInput | null;
}

export interface RecipeItemResult {
  ref: string;
  cost: string | null;
  quantityInIngredientUnit: string | null;
}

export interface RecipeBreakdown {
  items: RecipeItemResult[];
  ingredientsCost: string;
  packagingCost: string;
  laborCost: string;
  overheadCost: string;
  wasteCost: string;
  totalCost: string;
  costPerPortion: string | null;
  /** false si algún ingrediente no tiene costo o una unidad no se pudo convertir. */
  complete: boolean;
  warnings: Warning[];
}

function componentCost(c: CostComponent | null | undefined, base: Decimal, field: string): Decimal {
  if (!c) return new Decimal(0);
  const v = assertNonNegative(toDecimal(c.value, field), field);
  if (c.mode === 'fixed') return v;
  if (v.gte(1)) throw new CalculationError('INVALID_NUMBER', field);
  return base.times(v);
}

/**
 * Costo total = ingredientes + empaque + mano de obra + indirectos + merma (SOP §16).
 * Costo por porción = costo total / porciones.
 */
export function calculateRecipe(input: RecipeInput): RecipeBreakdown {
  const warnings: Warning[] = [];
  let ingredients = new Decimal(0);
  let complete = true;

  const items: RecipeItemResult[] = input.items.map((it) => {
    const label = it.name ?? it.ref;
    let qtyInUnit: Decimal;
    try {
      qtyInUnit = convertQuantity(it.quantity, it.unit, it.ingredientUnit, it.conversions);
    } catch (e) {
      if (e instanceof CalculationError && e.code === 'INCOMPATIBLE_UNITS') {
        complete = false;
        warnings.push({
          code: 'INCOMPATIBLE_UNITS',
          message: `No se puede convertir ${it.unit} a ${it.ingredientUnit} para ${label}. Defina una conversión.`,
          ref: it.ref,
        });
        return { ref: it.ref, cost: null, quantityInIngredientUnit: null };
      }
      throw e;
    }
    if (it.unitCost === null || it.unitCost === undefined || it.unitCost === '') {
      complete = false;
      warnings.push({
        code: 'MISSING_COST',
        message: `${label} no tiene costo registrado.`,
        ref: it.ref,
      });
      return { ref: it.ref, cost: null, quantityInIngredientUnit: out(qtyInUnit) };
    }
    const cost = usedCost(qtyInUnit, effectiveUnitCost(it.unitCost, it.yield));
    ingredients = ingredients.plus(cost);
    return { ref: it.ref, cost: out(cost), quantityInIngredientUnit: out(qtyInUnit) };
  });

  if (input.items.length === 0) {
    complete = false;
    warnings.push({ code: 'NO_ITEMS', message: 'La receta no tiene ingredientes.' });
  }

  const packaging = componentCost(input.packaging, ingredients, 'empaque');
  const labor = componentCost(input.labor, ingredients, 'mano de obra');
  const overhead = componentCost(input.overhead, ingredients, 'indirectos');

  let waste = new Decimal(0);
  if (input.wastePct !== null && input.wastePct !== undefined && input.wastePct !== '') {
    const w = assertNonNegative(toDecimal(input.wastePct, 'merma'), 'merma');
    if (w.gte(1)) throw new CalculationError('INVALID_NUMBER', 'merma');
    waste = ingredients.times(w);
  }

  const total = ingredients.plus(packaging).plus(labor).plus(overhead).plus(waste);

  let perPortion: string | null = null;
  const portions = toDecimal(input.portions, 'porciones');
  if (portions.lte(0)) {
    complete = false;
    warnings.push({ code: 'NO_PORTIONS', message: 'La receta no tiene porciones definidas.' });
  } else {
    perPortion = out(total.dividedBy(portions));
  }

  return {
    items,
    ingredientsCost: out(ingredients),
    packagingCost: out(packaging),
    laborCost: out(labor),
    overheadCost: out(overhead),
    wasteCost: out(waste),
    totalCost: out(total),
    costPerPortion: perPortion,
    complete,
    warnings,
  };
}
