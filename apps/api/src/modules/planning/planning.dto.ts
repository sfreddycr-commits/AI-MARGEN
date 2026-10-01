import type { ScenarioResult } from '@aimargen/calculation-engine';
import type { Row } from '../../core/db/db.js';
import { bool, dec, iso } from '../../core/http/dto.js';

export const fixedCostDto = (r: Row) => ({
  uuid: String(r.uuid),
  name: String(r.name),
  monthlyAmount: dec(r.monthly_amount)!,
  notes: r.notes ?? null,
  isDemo: bool(r.is_demo),
  archived: !!r.deleted_at,
  rowVersion: Number(r.row_version),
  updatedAt: iso(r.updated_at),
});

export const scenarioDto = (r: Row) => ({
  uuid: String(r.uuid),
  name: String(r.name),
  productUuid: r.product_uuid ?? null,
  productName: r.product_name ?? null,
  price: dec(r.price)!,
  unitsPerDay: dec(r.units_per_day)!,
  daysPerMonth: Number(r.days_per_month),
  fixedCosts: dec(r.fixed_costs),
  variableUnitCost: dec(r.variable_unit_cost)!,
  variableSource: String(r.variable_source) as 'product' | 'manual',
  notes: r.notes ?? null,
  isDemo: bool(r.is_demo),
  archived: !!r.deleted_at,
  rowVersion: Number(r.row_version),
  updatedAt: iso(r.updated_at),
});

export function scenarioResultDto(r: ScenarioResult) {
  return {
    unitsPerMonth: dec(r.unitsPerMonth),
    revenue: dec(r.revenue),
    variableCosts: dec(r.variableCosts),
    fixedCosts: dec(r.fixedCosts),
    totalCosts: dec(r.totalCosts),
    profit: dec(r.profit),
    margin: dec(r.margin),
    breakEven: r.breakEven
      ? {
          units: dec(r.breakEven.units),
          unitsRounded: r.breakEven.unitsRounded,
          revenue: dec(r.breakEven.revenue),
          contributionPerUnit: dec(r.breakEven.contributionPerUnit),
        }
      : null,
    breakEvenUnitsPerDay: r.breakEvenUnitsPerDay,
    warnings: r.warnings,
  };
}
