import { effectiveUnitCost } from '@aimargen/calculation-engine';
import type { Row } from '../../core/db/db.js';
import { bool, dec, iso } from '../../core/http/dto.js';
import { conversionsOf } from '../../core/costing/costing.service.js';

export function ingredientDto(r: Row) {
  const unitCost = dec(r.current_unit_cost);
  const yieldFraction = dec(r.yield_fraction) ?? '1';
  return {
    uuid: String(r.uuid),
    name: String(r.name),
    categoryUuid: r.category_uuid ?? null,
    categoryName: r.category_name ?? null,
    unit: String(r.unit),
    unitCost,
    /** Costo por unidad considerando el rendimiento (motor de cálculo). */
    effectiveUnitCost:
      unitCost === null ? null : effectiveUnitCost(unitCost, yieldFraction).toString(),
    yield: yieldFraction,
    supplierUuid: r.supplier_uuid ?? null,
    supplierName: r.supplier_name ?? null,
    lastCostAt: iso(r.last_cost_at),
    notes: r.notes ?? null,
    conversions: conversionsOf(r).map((c) => ({ ...c, factor: dec(c.factor)! })),
    usedInProducts: Number(r.used_in_products ?? 0),
    isDemo: bool(r.is_demo),
    archived: !!r.deleted_at,
    rowVersion: Number(r.row_version),
    updatedAt: iso(r.updated_at),
  };
}

export type IngredientDto = ReturnType<typeof ingredientDto>;

export function priceHistoryDto(r: Row) {
  return {
    effectiveAt: iso(r.effective_at),
    unitCost: dec(r.unit_cost),
    quantity: dec(r.quantity),
    source: String(r.source),
    voided: !!r.voided_at,
    supplierUuid: r.supplier_uuid ?? null,
    supplierName: r.supplier_name ?? null,
    purchaseUuid: r.purchase_uuid ?? null,
  };
}
