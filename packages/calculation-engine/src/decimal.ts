import DecimalLib from 'decimal.js';

/**
 * Instancia de Decimal aislada para AImargen (ADR-0006).
 * Precisión 34 dígitos y redondeo HALF_UP. No se modifica la configuración global de decimal.js.
 */
export const Decimal = DecimalLib.clone({
  precision: 34,
  rounding: DecimalLib.ROUND_HALF_UP,
  toExpNeg: -30,
  toExpPos: 30,
});
export type Decimal = InstanceType<typeof Decimal>;

/** Valor numérico aceptado por el motor. Los montos deben viajar como string decimal. */
export type DecimalInput = string | number | Decimal;

const DECIMAL_STRING = /^-?\d+(\.\d+)?$/;

/**
 * Convierte una entrada a Decimal validando que sea un número finito.
 * Los `number` se aceptan solo si son finitos; se recomienda usar string.
 */
export function toDecimal(value: DecimalInput, field = 'valor'): Decimal {
  if (value instanceof Decimal) {
    if (!value.isFinite()) throw new CalculationError('INVALID_NUMBER', field);
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new CalculationError('INVALID_NUMBER', field);
    return new Decimal(value);
  }
  const trimmed = value.trim();
  if (!DECIMAL_STRING.test(trimmed)) throw new CalculationError('INVALID_NUMBER', field);
  return new Decimal(trimmed);
}

/** Redondea a la escala indicada (default 2) con HALF_UP y devuelve string fijo. */
export function round(value: Decimal, scale = 2): string {
  if (!Number.isInteger(scale) || scale < 0 || scale > 6) {
    throw new CalculationError('INVALID_SCALE', 'scale');
  }
  return value.toDecimalPlaces(scale, Decimal.ROUND_HALF_UP).toFixed(scale);
}

export type CalculationErrorCode =
  | 'INVALID_NUMBER'
  | 'NEGATIVE_VALUE'
  | 'DIVISION_BY_ZERO'
  | 'INVALID_MARGIN'
  | 'INVALID_SCALE'
  | 'INCOMPATIBLE_UNITS';

const MESSAGES: Record<CalculationErrorCode, string> = {
  INVALID_NUMBER: 'El valor no es un número válido.',
  NEGATIVE_VALUE: 'El valor no puede ser negativo.',
  DIVISION_BY_ZERO: 'No se puede dividir entre cero.',
  INVALID_MARGIN: 'El margen debe ser mayor o igual a 0% y menor que 100%.',
  INVALID_SCALE: 'La escala de redondeo no es válida.',
  INCOMPATIBLE_UNITS: 'Las unidades no son compatibles.',
};

/** Error controlado del motor. `message` está en español y listo para mostrar. */
export class CalculationError extends Error {
  readonly code: CalculationErrorCode;
  readonly field: string;

  constructor(code: CalculationErrorCode, field: string) {
    super(`${MESSAGES[code]} (${field})`);
    this.name = 'CalculationError';
    this.code = code;
    this.field = field;
  }
}

/** Valida que el valor sea >= 0. */
export function assertNonNegative(value: Decimal, field: string): Decimal {
  if (value.isNegative() && !value.isZero()) throw new CalculationError('NEGATIVE_VALUE', field);
  return value;
}

/** División segura: lanza DIVISION_BY_ZERO si el divisor es 0. */
export function safeDivide(dividend: Decimal, divisor: Decimal, field: string): Decimal {
  if (divisor.isZero()) throw new CalculationError('DIVISION_BY_ZERO', field);
  return dividend.dividedBy(divisor);
}
