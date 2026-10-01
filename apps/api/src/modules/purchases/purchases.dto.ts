import type { Row } from '../../core/db/db.js';
import { bool, day, dec, iso } from '../../core/http/dto.js';

export function purchaseDto(r: Row) {
  return {
    uuid: String(r.uuid),
    purchasedAt: day(r.purchased_at),
    reference: r.reference ?? null,
    notes: r.notes ?? null,
    total: dec(r.total),
    source: String(r.source) as 'manual' | 'invoice_ai',
    supplierUuid: r.supplier_uuid ?? null,
    supplierName: r.supplier_name ?? null,
    itemsCount: r.items_count === undefined ? undefined : Number(r.items_count),
    itemsSummary: r.items_summary ?? undefined,
    documentUuid: r.document_uuid ?? null,
    voided: !!r.voided_at,
    voidedAt: iso(r.voided_at),
    isDemo: bool(r.is_demo),
    createdAt: iso(r.created_at),
  };
}

export function purchaseItemDto(r: Row) {
  return {
    ingredientUuid: String(r.ingredient_uuid),
    ingredientName: String(r.ingredient_name),
    ingredientUnit: String(r.ingredient_unit),
    quantity: dec(r.quantity),
    unit: String(r.unit),
    lineTotal: dec(r.line_total),
    unitCost: dec(r.unit_cost),
  };
}
