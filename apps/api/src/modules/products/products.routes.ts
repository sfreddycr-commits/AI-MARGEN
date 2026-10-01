import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  duplicateProductInput,
  pagination,
  priceUpdateInput,
  productInput,
  productPreviewInput,
  uuid,
} from '@aimargen/schemas';
import { requirePermission, tenantCtx } from '../../core/auth/guards.js';
import type { ProductController } from './products.controller.js';

const params = z.object({ uuid });
const listQuery = pagination.extend({
  q: z.string().max(120).optional(),
  category: uuid.optional(),
  filter: z
    .enum(['active', 'archived', 'no_price', 'incomplete', 'below_cost', 'below_target'])
    .default('active'),
});

export function productRoutes(c: ProductController): FastifyPluginAsync {
  return async (base) => {
    const app = base.withTypeProvider<ZodTypeProvider>();
    const tags = ['products'];
    const read = requirePermission('products.read');
    const write = requirePermission('products.write');

    app.get(
      '/products',
      { preHandler: read, schema: { tags, querystring: listQuery } },
      async (req) => c.list(tenantCtx(req), req.query),
    );
    app.get('/products/:uuid', { preHandler: read, schema: { tags, params } }, async (req) =>
      c.get(tenantCtx(req), req.params.uuid),
    );
    app.post(
      '/products/preview',
      { preHandler: read, schema: { tags, body: productPreviewInput } },
      async (req) => c.preview(tenantCtx(req), req.body),
    );
    app.post(
      '/products',
      { preHandler: write, schema: { tags, body: productInput } },
      async (req, reply) => reply.status(201).send(await c.save(tenantCtx(req), null, req.body)),
    );
    app.patch(
      '/products/:uuid',
      { preHandler: write, schema: { tags, params, body: productInput } },
      async (req) => c.save(tenantCtx(req), req.params.uuid, req.body),
    );
    app.post(
      '/products/:uuid/duplicate',
      { preHandler: write, schema: { tags, params, body: duplicateProductInput } },
      async (req, reply) =>
        reply.status(201).send(await c.duplicate(tenantCtx(req), req.params.uuid, req.body.name)),
    );
    app.post(
      '/products/:uuid/archive',
      { preHandler: write, schema: { tags, params } },
      async (req) => c.setArchived(tenantCtx(req), req.params.uuid, true),
    );
    app.post(
      '/products/:uuid/restore',
      { preHandler: write, schema: { tags, params } },
      async (req) => c.setArchived(tenantCtx(req), req.params.uuid, false),
    );
    app.patch(
      '/products/:uuid/price',
      {
        preHandler: requirePermission('pricing.write'),
        schema: { tags, params, body: priceUpdateInput },
      },
      async (req) => c.setPrice(tenantCtx(req), req.params.uuid, req.body),
    );
  };
}
