import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { queryBool } from '@aimargen/schemas';
import { requireTenant, tenantCtx } from '../../core/auth/guards.js';
import type { SyncController } from './sync.controller.js';

export function syncRoutes(c: SyncController): FastifyPluginAsync {
  return async (base) => {
    const app = base.withTypeProvider<ZodTypeProvider>();
    const tags = ['sync'];
    // Consulta muy liviana: se llama cada 60 s mientras la app está visible (ADR-0007).
    app.get(
      '/sync/versions',
      {
        preHandler: requireTenant,
        config: { rateLimit: { max: 240, timeWindow: '1 minute' } },
        schema: { tags },
      },
      async (req) => c.versions(tenantCtx(req)),
    );
    app.get(
      '/sync/changes',
      {
        preHandler: requireTenant,
        schema: {
          tags,
          querystring: z.object({
            entity: z.string().max(40),
            cursor: z.string().max(200).optional(),
            rewind: queryBool,
          }),
        },
      },
      async (req) =>
        c.changes(tenantCtx(req), req.query.entity, req.query.cursor, req.query.rewind),
    );
  };
}
