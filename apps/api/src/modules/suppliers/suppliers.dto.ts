import type { Row } from '../../core/db/db.js';
import { bool, day, iso } from '../../core/http/dto.js';

export const supplierDto = (r: Row) => ({
  uuid: String(r.uuid),
  name: String(r.name),
  contactName: r.contact_name ?? null,
  phone: r.phone ?? null,
  email: r.email ?? null,
  notes: r.notes ?? null,
  purchasesCount: Number(r.purchases_count ?? 0),
  lastPurchaseAt: day(r.last_purchase_at),
  isDemo: bool(r.is_demo),
  archived: !!r.deleted_at,
  rowVersion: Number(r.row_version),
  updatedAt: iso(r.updated_at),
});
