import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { pagination, purchaseInput, uuid } from '@aimargen/schemas';
import { requirePermission, tenantCtx } from '../../core/auth/guards.js';
import type { PurchaseController } from './purchases.controller.js';

const params = z.object({ uuid });
const listQuery = pagination.extend({
  supplier: uuid.optional(),
  ingredient: uuid.optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  includeVoid: z.coerce.boolean().default(false),
});

export function purchaseRoutes(c: PurchaseController): FastifyPluginAsync {
  return async (base) => {
    const app = base.withTypeProvider<ZodTypeProvider>();
    const tags = ['purchases'];
    const read = requirePermission('purchases.read');
    const write = requirePermission('purchases.write');
    app.get(
      '/purchases',
      { preHandler: read, schema: { tags, querystring: listQuery } },
      async (req) => c.list(tenantCtx(req), req.query),
    );
    app.get('/purchases/:uuid', { preHandler: read, schema: { tags, params } }, async (req) =>
      c.get(tenantCtx(req), req.params.uuid),
    );
    app.post(
      '/purchases',
      { preHandler: write, schema: { tags, body: purchaseInput } },
      async (req, reply) => reply.status(201).send(await c.create(tenantCtx(req), req.body)),
    );
    app.post(
      '/purchases/:uuid/void',
      { preHandler: write, schema: { tags, params } },
      async (req) => c.void(tenantCtx(req), req.params.uuid),
    );
  };
}
