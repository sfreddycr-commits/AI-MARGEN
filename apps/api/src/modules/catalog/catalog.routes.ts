import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { categoryInput, categoryUpdateInput, uuid } from '@aimargen/schemas';
import { requireAuth, requirePermission, tenantCtx } from '../../core/auth/guards.js';
import type { CatalogController } from './catalog.controller.js';

const kindQuery = z.object({ kind: z.enum(['ingredient', 'product']) });
const writePerm = (kind: string) =>
  kind === 'ingredient' ? 'ingredients.write' : 'products.write';

export function catalogRoutes(c: CatalogController): FastifyPluginAsync {
  return async (base) => {
    const app = base.withTypeProvider<ZodTypeProvider>();
    const tags = ['catalog'];
    app.get('/reference/units', { preHandler: requireAuth, schema: { tags } }, async () =>
      c.units(),
    );
    app.get(
      '/categories',
      { preHandler: requirePermission('tenant.read'), schema: { tags, querystring: kindQuery } },
      async (req) => c.categories(tenantCtx(req), req.query.kind),
    );
    app.post(
      '/categories',
      { preHandler: requirePermission('tenant.read'), schema: { tags, body: categoryInput } },
      async (req, reply) => {
        const ctx = tenantCtx(req);
        if (!ctx.permissions.has(writePerm(req.body.kind))) {
          return reply.status(403).send({
            error: {
              code: 'FORBIDDEN',
              message: 'No tiene permiso para realizar esta acción.',
              requestId: req.id,
            },
          });
        }
        return reply.status(201).send(await c.createCategory(ctx, req.body.kind, req.body.name));
      },
    );
    app.patch(
      '/categories/:uuid',
      {
        preHandler: requirePermission('tenant.read'),
        schema: {
          tags,
          params: z.object({ uuid }),
          querystring: kindQuery,
          body: categoryUpdateInput,
        },
      },
      async (req, reply) => {
        const ctx = tenantCtx(req);
        if (!ctx.permissions.has(writePerm(req.query.kind))) {
          return reply.status(403).send({
            error: {
              code: 'FORBIDDEN',
              message: 'No tiene permiso para realizar esta acción.',
              requestId: req.id,
            },
          });
        }
        return c.updateCategory(
          ctx,
          req.query.kind,
          req.params.uuid,
          req.body.name,
          req.body.archived,
        );
      },
    );
  };
}
