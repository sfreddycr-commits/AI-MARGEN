import type { IngredientInput } from '@aimargen/schemas';
import type { Db, Row } from '../../core/db/db.js';

/** Modelo de ingredientes: solo llamadas a SPs (ADR-0003). */
export function createIngredientModel(db: Db) {
  return {
    list: (
      t: number,
      q: string | null,
      categoryUuid: string | null,
      filter: string,
      limit: number,
      offset: number,
    ) => db.call<Row>('sp_ingredient_list', [t, q, categoryUuid, filter, limit, offset]),
    get: async (t: number, uuid: string) =>
      (await db.callOne<Row>('sp_ingredient_get', [t, uuid]))[0] ?? null,
    resolve: (t: number, uuids: string[]) =>
      db.callOne<Row>('sp_ingredient_resolve', [t, JSON.stringify(uuids)]),
    save: async (
      t: number,
      userId: number,
      uuid: string | null,
      p: IngredientInput,
      initial: { unitCost: string; supplierUuid: string | null; date: string | null } | null,
      isDemo = false,
    ) =>
      (
        await db.callOne<Row>('sp_ingredient_save', [
          t,
          userId,
          uuid,
          p.name,
          p.categoryUuid,
          p.unit,
          p.yield,
          p.notes,
          JSON.stringify(p.conversions ?? []),
          p.rowVersion ?? null,
          initial?.unitCost ?? null,
          initial?.supplierUuid ?? null,
          initial?.date ?? null,
          isDemo ? 1 : 0,
        ])
      )[0]!,
    setArchived: async (t: number, userId: number, uuid: string, archived: boolean) =>
      (
        await db.callOne<Row>('sp_ingredient_set_archived', [t, userId, uuid, archived ? 1 : 0])
      )[0]!,
    addCost: async (
      t: number,
      userId: number,
      uuid: string,
      unitCost: string,
      supplierUuid: string | null,
      date: string | null,
    ) =>
      Number(
        (
          await db.callOne<Row>('sp_ingredient_cost_add', [
            t,
            userId,
            uuid,
            unitCost,
            supplierUuid,
            date,
          ])
        )[0]!.id,
      ),
    history: (t: number, uuid: string, limit: number) =>
      db.callOne<Row>('sp_ingredient_price_history', [t, uuid, limit]),
    changes: (t: number, since: Date | null, sinceUuid: string | null, limit: number) =>
      db.callOne<Row>('sp_ingredient_changes', [t, since, sinceUuid, limit]),
    costChanges: (t: number, days: number) =>
      db.callOne<Row>('sp_ingredient_cost_changes', [t, days]),
  };
}

export type IngredientModel = ReturnType<typeof createIngredientModel>;
