export {
  Decimal,
  type DecimalInput,
  toDecimal,
  round,
  CalculationError,
  type CalculationErrorCode,
  assertNonNegative,
  safeDivide,
} from './decimal.js';

/** Versión del motor; se incluye en los desgloses para trazabilidad. */
export const ENGINE_VERSION = '0.1.0';
