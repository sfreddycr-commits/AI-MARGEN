import type { TenantContext } from '../../core/http/request-context.js';
import type { Services } from '../../core/services.js';
import type { CatalogModel } from './catalog.model.js';
import { categoryDto, unitDto } from './catalog.dto.js';

export function createCatalogController(model: CatalogModel, s: Services) {
  return {
    units: async () => (await model.units()).map(unitDto),
    categories: async (ctx: TenantContext, kind: string) =>
      (await model.listCategories(ctx.tenantId, kind)).map(categoryDto),
    async createCategory(ctx: TenantContext, kind: string, name: string) {
      const row = categoryDto(await model.createCategory(ctx.tenantId, kind, name));
      await s.audit.log(ctx, {
        action: `${kind}_category.create`,
        entity: `${kind}_category`,
        entityUuid: row.uuid,
        after: row,
      });
      return row;
    },
    async updateCategory(
      ctx: TenantContext,
      kind: string,
      id: string,
      name: string,
      archived: boolean,
    ) {
      const row = categoryDto(await model.updateCategory(ctx.tenantId, kind, id, name, archived));
      await s.audit.log(ctx, {
        action: `${kind}_category.update`,
        entity: `${kind}_category`,
        entityUuid: row.uuid,
        after: row,
      });
      return row;
    },
  };
}
export type CatalogController = ReturnType<typeof createCatalogController>;
