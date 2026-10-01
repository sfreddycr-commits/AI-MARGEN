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
export {
  UNITS,
  type UnitCode,
  type Dimension,
  type CustomConversion,
  isUnitCode,
  convertQuantity,
  canConvert,
  compatibleUnits,
} from './units.js';
export {
  type Warning,
  type ComponentMode,
  type CostComponent,
  type RecipeInput,
  type RecipeItemInput,
  type RecipeItemResult,
  type RecipeBreakdown,
  unitCost,
  purchaseUnitCost,
  validateYield,
  effectiveUnitCost,
  usedCost,
  weightedAverageUnitCost,
  percentChange,
  calculateRecipe,
} from './costing.js';
export {
  type PriceEvaluation,
  type PricingInput,
  type PricingAnalysis,
  validateMargin,
  priceByMargin,
  priceByMultiplier,
  profit,
  realMargin,
  multiplierForMargin,
  marginForMultiplier,
  analyzePricing,
} from './pricing.js';
export {
  type BreakEven,
  type ScenarioInput,
  type ScenarioResult,
  breakEven,
  simulateScenario,
} from './scenarios.js';

/** Versión del motor; se incluye en los desgloses para trazabilidad. */
export const ENGINE_VERSION = '1.0.0';
