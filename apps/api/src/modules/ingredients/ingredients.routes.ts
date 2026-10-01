import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { ingredientCostInput, ingredientInput, pagination, uuid } from '@aimargen/schemas';
import { requirePermission, tenantCtx } from '../../core/auth/guards.js';
import type { IngredientController } from './ingredients.controller.js';

const params = z.object({ uuid });
const listQuery = pagination.extend({
  q: z.string().max(120).optional(),
  category: uuid.optional(),
  filter: z.enum(['active', 'archived', 'missing_cost']).default('active'),
});

export function ingredientRoutes(c: IngredientController): FastifyPluginAsync {
  return async (base) => {
    const app = base.withTypeProvider<ZodTypeProvider>();
    const tags = ['ingredients'];
    const read = requirePermission('ingredients.read');
    const write = requirePermission('ingredients.write');

    app.get(
      '/ingredients',
      { preHandler: read, schema: { tags, querystring: listQuery } },
      async (req) => c.list(tenantCtx(req), req.query),
    );
    app.get('/ingredients/:uuid', { preHandler: read, schema: { tags, params } }, async (req) =>
      c.get(tenantCtx(req), req.params.uuid),
    );
    app.get(
      '/ingredients/:uuid/history',
      { preHandler: read, schema: { tags, params } },
      async (req) => c.history(tenantCtx(req), req.params.uuid),
    );
    app.post(
      '/ingredients',
      { preHandler: write, schema: { tags, body: ingredientInput } },
      async (req, reply) => reply.status(201).send(await c.save(tenantCtx(req), null, req.body)),
    );
    app.patch(
      '/ingredients/:uuid',
      {
        preHandler: write,
        schema: { tags, params, body: ingredientInput.omit({ initialCost: true }) },
      },
      async (req) => c.save(tenantCtx(req), req.params.uuid, { ...req.body, initialCost: null }),
    );
    app.post(
      '/ingredients/:uuid/costs',
      { preHandler: write, schema: { tags, params, body: ingredientCostInput } },
      async (req) => c.addCost(tenantCtx(req), req.params.uuid, req.body),
    );
    app.post(
      '/ingredients/:uuid/archive',
      { preHandler: write, schema: { tags, params } },
      async (req) => c.setArchived(tenantCtx(req), req.params.uuid, true),
    );
    app.post(
      '/ingredients/:uuid/restore',
      { preHandler: write, schema: { tags, params } },
      async (req) => c.setArchived(tenantCtx(req), req.params.uuid, false),
    );
  };
}
