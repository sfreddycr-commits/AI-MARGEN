import type { Db, Row } from '../../core/db/db.js';

/** Modelo del catálogo: unidades (referencia global) y categorías. */
export function createCatalogModel(db: Db) {
  return {
    units: () => db.callOne<Row>('sp_units_list'),
    listCategories: (tenantId: number, kind: string) =>
      db.callOne<Row>('sp_category_list', [tenantId, kind]),
    createCategory: async (tenantId: number, kind: string, name: string) =>
      (await db.callOne<Row>('sp_category_create', [tenantId, kind, name]))[0]!,
    updateCategory: async (
      tenantId: number,
      kind: string,
      uuid: string,
      name: string,
      archived: boolean,
    ) =>
      (
        await db.callOne<Row>('sp_category_update', [tenantId, kind, uuid, name, archived ? 1 : 0])
      )[0]!,
    changes: (
      tenantId: number,
      kind: string,
      since: Date | null,
      sinceUuid: string | null,
      limit: number,
    ) => db.callOne<Row>('sp_category_changes', [tenantId, kind, since, sinceUuid, limit]),
  };
}
export type CatalogModel = ReturnType<typeof createCatalogModel>;
