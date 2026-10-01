import type { Row } from '../../core/db/db.js';
import { dec, iso } from '../../core/http/dto.js';

export const unitDto = (r: Row) => ({
  code: String(r.code),
  name: String(r.name),
  dimension: String(r.dimension),
  factorToBase: dec(r.factor_to_base),
});
export const categoryDto = (r: Row) => ({
  uuid: String(r.uuid),
  name: String(r.name),
  rowVersion: Number(r.row_version),
  updatedAt: iso(r.updated_at),
  archived: !!r.deleted_at,
});
