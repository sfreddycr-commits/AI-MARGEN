import type { Db, Row } from '../../core/db/db.js';

export interface PurchaseLineRow {
  ingredient_uuid: string;
  quantity: string;
  unit: string;
  line_total: string;
  unit_cost: string;
  quantity_base: string;
}

/** Modelo de compras: solo llamadas a SPs. */
export function createPurchaseModel(db: Db) {
  return {
    create: async (
      t: number,
      userId: number,
      p: {
        supplierUuid: string | null;
        purchasedAt: string;
        reference: string | null;
        notes: string | null;
        total: string;
        source: 'manual' | 'invoice_ai';
        documentUuid: string | null;
        lines: PurchaseLineRow[];
        isDemo?: boolean;
      },
    ) =>
      (
        await db.callOne<Row>('sp_purchase_create', [
          t,
          userId,
          p.supplierUuid,
          p.purchasedAt,
          p.reference,
          p.notes,
          p.total,
          p.source,
          p.documentUuid,
          JSON.stringify(p.lines),
          p.isDemo ? 1 : 0,
        ])
      )[0]!,
    list: (
      t: number,
      f: {
        supplier: string | null;
        ingredient: string | null;
        from: string | null;
        to: string | null;
        includeVoid: boolean;
      },
      limit: number,
      offset: number,
    ) =>
      db.call<Row>('sp_purchase_list', [
        t,
        f.supplier,
        f.ingredient,
        f.from,
        f.to,
        f.includeVoid ? 1 : 0,
        limit,
        offset,
      ]),
    get: (t: number, uuid: string) => db.call<Row>('sp_purchase_get', [t, uuid]),
    void: async (t: number, userId: number, uuid: string) =>
      (await db.callOne<Row>('sp_purchase_void', [t, userId, uuid]))[0]!,
  };
}

export type PurchaseModel = ReturnType<typeof createPurchaseModel>;
