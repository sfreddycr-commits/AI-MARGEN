import type { SupplierInput } from '@aimargen/schemas';
import type { Db, Row } from '../../core/db/db.js';

/** Modelo de proveedores: solo llamadas a SPs (ADR-0003). */
export function createSupplierModel(db: Db) {
  return {
    list: (t: number, q: string | null, archived: boolean, limit: number, offset: number) =>
      db.call<Row>('sp_supplier_list', [t, q, archived ? 1 : 0, limit, offset]),
    get: async (t: number, id: string) =>
      (await db.callOne<Row>('sp_supplier_get', [t, id]))[0] ?? null,
    save: async (t: number, userId: number, id: string | null, p: SupplierInput, isDemo = false) =>
      (
        await db.callOne<Row>('sp_supplier_save', [
          t,
          userId,
          id,
          p.name,
          p.contactName,
          p.phone,
          p.email,
          p.notes,
          p.rowVersion ?? null,
          isDemo ? 1 : 0,
        ])
      )[0]!,
    setArchived: async (t: number, userId: number, id: string, archived: boolean) =>
      (await db.callOne<Row>('sp_supplier_set_archived', [t, userId, id, archived ? 1 : 0]))[0]!,
    changes: (t: number, since: Date | null, sinceUuid: string | null, limit: number) =>
      db.callOne<Row>('sp_supplier_changes', [t, since, sinceUuid, limit]),
  };
}
export type SupplierModel = ReturnType<typeof createSupplierModel>;
