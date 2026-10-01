import {
  CalculationError,
  Decimal,
  assertNonNegative,
  toDecimal,
  type DecimalInput,
} from './decimal.js';
import type { Warning } from './costing.js';

const S = 6;
const out = (d: Decimal) => d.toDecimalPlaces(S, Decimal.ROUND_HALF_UP).toFixed(S);

export interface BreakEven {
  /** Unidades exactas para cubrir los costos fijos. */
  units: string;
  /** Unidades enteras a vender (redondeo hacia arriba). */
  unitsRounded: string;
  /** Ventas en dinero necesarias (unidades exactas × precio). */
  revenue: string;
  /** Aporte de cada unidad a los costos fijos: precio − costo variable. */
  contributionPerUnit: string;
}

/**
 * Punto de equilibrio = costos fijos / (precio − costo variable unitario) (SOP §16).
 * Si el precio no supera el costo variable no existe equilibrio: error controlado.
 */
export function breakEven(input: {
  fixedCosts: DecimalInput;
  price: DecimalInput;
  variableUnitCost: DecimalInput;
}): BreakEven {
  const fixed = assertNonNegative(toDecimal(input.fixedCosts, 'costos fijos'), 'costos fijos');
  const price = assertNonNegative(toDecimal(input.price, 'precio'), 'precio');
  const variable = assertNonNegative(
    toDecimal(input.variableUnitCost, 'costo variable'),
    'costo variable',
  );
  const contribution = price.minus(variable);
  if (contribution.lte(0)) throw new CalculationError('DIVISION_BY_ZERO', 'precio');
  const units = fixed.dividedBy(contribution);
  return {
    units: out(units),
    unitsRounded: units.toDecimalPlaces(0, Decimal.ROUND_CEIL).toFixed(0),
    revenue: out(units.times(price)),
    contributionPerUnit: out(contribution),
  };
}

export interface ScenarioInput {
  price: DecimalInput;
  unitsPerDay: DecimalInput;
  daysPerMonth: DecimalInput;
  fixedCosts: DecimalInput;
  variableUnitCost: DecimalInput;
}

export interface ScenarioResult {
  unitsPerMonth: string;
  revenue: string;
  variableCosts: string;
  fixedCosts: string;
  totalCosts: string;
  profit: string;
  margin: string | null;
  breakEven: BreakEven | null;
  /** Unidades por día necesarias para el equilibrio (redondeo hacia arriba). */
  breakEvenUnitsPerDay: string | null;
  warnings: Warning[];
}

/** Simulación mensual (SOP §18). Nunca modifica recetas ni precios: es cálculo puro. */
export function simulateScenario(input: ScenarioInput): ScenarioResult {
  const price = assertNonNegative(toDecimal(input.price, 'precio'), 'precio');
  const perDay = assertNonNegative(
    toDecimal(input.unitsPerDay, 'unidades por día'),
    'unidades por día',
  );
  const days = assertNonNegative(toDecimal(input.daysPerMonth, 'días por mes'), 'días por mes');
  if (days.gt(31)) throw new CalculationError('INVALID_NUMBER', 'días por mes');
  const fixed = assertNonNegative(toDecimal(input.fixedCosts, 'costos fijos'), 'costos fijos');
  const variable = assertNonNegative(
    toDecimal(input.variableUnitCost, 'costo variable'),
    'costo variable',
  );

  const units = perDay.times(days);
  const revenue = units.times(price);
  const variableCosts = units.times(variable);
  const totalCosts = variableCosts.plus(fixed);
  const profitValue = revenue.minus(totalCosts);
  const warnings: Warning[] = [];

  let be: BreakEven | null = null;
  let bePerDay: string | null = null;
  try {
    be = breakEven({ fixedCosts: fixed, price, variableUnitCost: variable });
    if (days.gt(0)) {
      bePerDay = new Decimal(be.units)
        .dividedBy(days)
        .toDecimalPlaces(0, Decimal.ROUND_CEIL)
        .toFixed(0);
    }
  } catch (e) {
    if (!(e instanceof CalculationError)) throw e;
    warnings.push({
      code: 'NO_BREAK_EVEN',
      message: 'El precio no supera el costo variable: no hay punto de equilibrio.',
    });
  }

  if (profitValue.isNegative()) {
    warnings.push({
      code: 'NEGATIVE_PROFIT',
      message: 'Con estos supuestos el negocio pierde dinero en el mes.',
    });
  }

  return {
    unitsPerMonth: out(units),
    revenue: out(revenue),
    variableCosts: out(variableCosts),
    fixedCosts: out(fixed),
    totalCosts: out(totalCosts),
    profit: out(profitValue),
    margin: revenue.isZero() ? null : out(profitValue.dividedBy(revenue)),
    breakEven: be,
    breakEvenUnitsPerDay: bePerDay,
    warnings,
  };
}
