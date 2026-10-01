import type { SupplierInput } from '@aimargen/schemas';
import { page, search } from '../../core/http/dto.js';
import { AppError } from '../../core/http/app-error.js';
import type { TenantContext } from '../../core/http/request-context.js';
import type { Services } from '../../core/services.js';
import type { SupplierModel } from './suppliers.model.js';
import { supplierDto } from './suppliers.dto.js';

/** Lógica de proveedores (SOP §13). */
export function createSupplierController(model: SupplierModel, s: Services) {
  return {
    async list(
      ctx: TenantContext,
      q: string | undefined,
      archived: boolean,
      p: number,
      size: number,
    ) {
      const [rows, total] = await model.list(
        ctx.tenantId,
        search(q),
        archived,
        size,
        (p - 1) * size,
      );
      return page((rows ?? []).map(supplierDto), total as Array<{ total: number }>, p, size);
    },
    async get(ctx: TenantContext, id: string) {
      const row = await model.get(ctx.tenantId, id);
      if (!row) throw new AppError(404, 'NOT_FOUND', 'No se encontró el proveedor.');
      return supplierDto(row);
    },
    async save(ctx: TenantContext, id: string | null, input: SupplierInput) {
      if (id && !input.rowVersion)
        throw new AppError(400, 'ROW_VERSION_REQUIRED', 'Falta la versión del registro.');
      const before = id ? await model.get(ctx.tenantId, id) : null;
      const row = supplierDto(await model.save(ctx.tenantId, ctx.userId, id, input));
      await s.audit.log(ctx, {
        action: id ? 'supplier.update' : 'supplier.create',
        entity: 'supplier',
        entityUuid: row.uuid,
        before: before ? supplierDto(before) : null,
        after: row,
      });
      return row;
    },
    async setArchived(ctx: TenantContext, id: string, archived: boolean) {
      const row = supplierDto(await model.setArchived(ctx.tenantId, ctx.userId, id, archived));
      await s.audit.log(ctx, {
        action: archived ? 'supplier.archive' : 'supplier.restore',
        entity: 'supplier',
        entityUuid: id,
      });
      return row;
    },
  };
}
export type SupplierController = ReturnType<typeof createSupplierController>;
