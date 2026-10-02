import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { pagination, queryBool, supplierInput, uuid } from '@aimargen/schemas';
import { requirePermission, tenantCtx } from '../../core/auth/guards.js';
import type { SupplierController } from './suppliers.controller.js';

const params = z.object({ uuid });
const listQuery = pagination.extend({
  q: z.string().max(120).optional(),
  archived: queryBool,
});

export function supplierRoutes(c: SupplierController): FastifyPluginAsync {
  return async (base) => {
    const app = base.withTypeProvider<ZodTypeProvider>();
    const tags = ['suppliers'];
    const read = requirePermission('suppliers.read');
    const write = requirePermission('suppliers.write');
    app.get(
      '/suppliers',
      { preHandler: read, schema: { tags, querystring: listQuery } },
      async (req) =>
        c.list(tenantCtx(req), req.query.q, req.query.archived, req.query.page, req.query.pageSize),
    );
    app.get('/suppliers/:uuid', { preHandler: read, schema: { tags, params } }, async (req) =>
      c.get(tenantCtx(req), req.params.uuid),
    );
    app.post(
      '/suppliers',
      { preHandler: write, schema: { tags, body: supplierInput } },
      async (req, reply) => reply.status(201).send(await c.save(tenantCtx(req), null, req.body)),
    );
    app.patch(
      '/suppliers/:uuid',
      { preHandler: write, schema: { tags, params, body: supplierInput } },
      async (req) => c.save(tenantCtx(req), req.params.uuid, req.body),
    );
    app.post(
      '/suppliers/:uuid/archive',
      { preHandler: write, schema: { tags, params } },
      async (req) => c.setArchived(tenantCtx(req), req.params.uuid, true),
    );
    app.post(
      '/suppliers/:uuid/restore',
      { preHandler: write, schema: { tags, params } },
      async (req) => c.setArchived(tenantCtx(req), req.params.uuid, false),
    );
  };
}
