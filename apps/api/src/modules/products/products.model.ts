import type { Db, Row } from '../../core/db/db.js';

export interface ProductSaveParams {
  name: string;
  categoryUuid: string | null;
  portions: string;
  currentPrice: string | null;
  targetMargin: string | null;
  multiplier: string | null;
  packaging: { mode: string; value: string };
  labor: { mode: string; value: string };
  overhead: { mode: string; value: string };
  wastePct: string;
  notes: string | null;
  items: Array<{ ingredientUuid: string; quantity: string; unit: string }>;
  costTotal: string | null;
  costPerPortion: string | null;
  costComplete: boolean;
  rowVersion?: number;
}

/** Modelo de productos y recetas: solo llamadas a SPs. */
export function createProductModel(db: Db) {
  return {
    list: (
      t: number,
      q: string | null,
      category: string | null,
      filter: string,
      limit: number,
      offset: number,
    ) => db.call<Row>('sp_product_list', [t, q, category, filter, limit, offset]),
    get: (t: number, uuid: string) => db.call<Row>('sp_product_get', [t, uuid]),
    save: async (
      t: number,
      userId: number,
      uuid: string | null,
      p: ProductSaveParams,
      isDemo = false,
    ) =>
      (
        await db.callOne<Row>('sp_product_save', [
          t,
          userId,
          uuid,
          p.name,
          p.categoryUuid,
          p.portions,
          p.currentPrice,
          p.targetMargin,
          p.multiplier,
          p.packaging.mode,
          p.packaging.value,
          p.labor.mode,
          p.labor.value,
          p.overhead.mode,
          p.overhead.value,
          p.wastePct,
          p.notes,
          JSON.stringify(
            p.items.map((i) => ({
              ingredient_uuid: i.ingredientUuid,
              quantity: i.quantity,
              unit: i.unit,
            })),
          ),
          p.costTotal,
          p.costPerPortion,
          p.costComplete ? 1 : 0,
          p.rowVersion ?? null,
          isDemo ? 1 : 0,
        ])
      )[0]!,
    duplicate: async (t: number, userId: number, uuid: string, name: string) =>
      (await db.callOne<Row>('sp_product_duplicate', [t, userId, uuid, name]))[0]!,
    setArchived: async (t: number, userId: number, uuid: string, archived: boolean) =>
      (await db.callOne<Row>('sp_product_set_archived', [t, userId, uuid, archived ? 1 : 0]))[0]!,
    setPrice: async (
      t: number,
      userId: number,
      uuid: string,
      p: {
        currentPrice: string | null;
        targetMargin: string | null;
        multiplier: string | null;
        rowVersion: number;
      },
    ) =>
      (
        await db.callOne<Row>('sp_product_price_set', [
          t,
          userId,
          uuid,
          p.currentPrice,
          p.targetMargin,
          p.multiplier,
          p.rowVersion,
        ])
      )[0]!,
    changes: (t: number, since: Date | null, sinceUuid: string | null, limit: number) =>
      db.callOne<Row>('sp_product_changes', [t, since, sinceUuid, limit]),
  };
}

export type ProductModel = ReturnType<typeof createProductModel>;
