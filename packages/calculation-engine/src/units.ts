import {
  CalculationError,
  Decimal,
  assertNonNegative,
  safeDivide,
  toDecimal,
  type DecimalInput,
} from './decimal.js';

/**
 * Unidades soportadas (SOP §12). Cada unidad pertenece a una dimensión y tiene un factor
 * respecto a la unidad base de su dimensión (g, ml, unidad).
 */
export const UNITS = {
  g: { dimension: 'mass', factor: '1', label: 'g' },
  kg: { dimension: 'mass', factor: '1000', label: 'kg' },
  ml: { dimension: 'volume', factor: '1', label: 'ml' },
  l: { dimension: 'volume', factor: '1000', label: 'l' },
  unidad: { dimension: 'count', factor: '1', label: 'unidad' },
} as const;

export type UnitCode = keyof typeof UNITS;
export type Dimension = (typeof UNITS)[UnitCode]['dimension'];

export function isUnitCode(value: string): value is UnitCode {
  return Object.prototype.hasOwnProperty.call(UNITS, value);
}

/**
 * Conversión propia de un ingrediente entre dimensiones distintas:
 * "1 `from` equivale a `factor` `to`" (ej. 1 unidad de huevo = 50 g).
 */
export interface CustomConversion {
  from: UnitCode;
  to: UnitCode;
  factor: DecimalInput;
}

function unitInfo(code: string) {
  if (!isUnitCode(code)) throw new CalculationError('INCOMPATIBLE_UNITS', `unidad:${code}`);
  return UNITS[code];
}

/**
 * Convierte una cantidad entre unidades.
 * - Misma dimensión: usa los factores estándar (1 kg = 1000 g, 1 l = 1000 ml).
 * - Distinta dimensión: solo si existe una conversión propia definida; si no, error
 *   (SOP: no convertir unidades incompatibles sin factor definido).
 */
export function convertQuantity(
  quantity: DecimalInput,
  from: string,
  to: string,
  conversions: readonly CustomConversion[] = [],
): Decimal {
  const qty = assertNonNegative(toDecimal(quantity, 'cantidad'), 'cantidad');
  const f = unitInfo(from);
  const t = unitInfo(to);
  if (from === to) return qty;

  const inBase = qty.times(f.factor);
  if (f.dimension === t.dimension) return inBase.dividedBy(t.factor);

  for (const c of conversions) {
    const cf = unitInfo(c.from);
    const ct = unitInfo(c.to);
    const factor = toDecimal(c.factor, 'factor');
    if (factor.lte(0)) throw new CalculationError('INVALID_NUMBER', 'factor');
    // 1 base(cf.dimension) = factor * ct.factor / cf.factor base(ct.dimension)
    const perBase = factor.times(ct.factor).dividedBy(cf.factor);
    if (cf.dimension === f.dimension && ct.dimension === t.dimension) {
      return inBase.times(perBase).dividedBy(t.factor);
    }
    if (ct.dimension === f.dimension && cf.dimension === t.dimension) {
      return safeDivide(inBase, perBase, 'factor').dividedBy(t.factor);
    }
  }
  throw new CalculationError('INCOMPATIBLE_UNITS', `${from}→${to}`);
}

/** ¿Se puede convertir entre estas unidades con las conversiones dadas? */
export function canConvert(
  from: string,
  to: string,
  conversions: readonly CustomConversion[] = [],
): boolean {
  try {
    convertQuantity('1', from, to, conversions);
    return true;
  } catch {
    return false;
  }
}

/** Unidades compatibles con una unidad dada (misma dimensión o con conversión propia). */
export function compatibleUnits(
  unit: string,
  conversions: readonly CustomConversion[] = [],
): UnitCode[] {
  return (Object.keys(UNITS) as UnitCode[]).filter((u) => canConvert(unit, u, conversions));
}

export { Decimal };
