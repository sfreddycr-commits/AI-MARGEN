import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { uuid } from '@aimargen/schemas';
import { requirePermission, tenantCtx } from '../../core/auth/guards.js';
import { REPORTS, type ReportController } from './reports.controller.js';

const reportId = z.enum([...REPORTS, 'product-sheet', 'backup']);

export function reportRoutes(c: ReportController): FastifyPluginAsync {
  return async (base) => {
    const app = base.withTypeProvider<ZodTypeProvider>();
    app.get(
      '/reports/:report',
      {
        preHandler: requirePermission('reports.export'),
        config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
        schema: {
          tags: ['reports'],
          params: z.object({ report: reportId }),
          querystring: z.object({
            format: z.enum(['pdf', 'csv', 'xlsx', 'json']).default('pdf'),
            from: z.iso.date().optional(),
            to: z.iso.date().optional(),
            product: uuid.optional(),
          }),
        },
      },
      async (req, reply) => {
        const file = await c.generate(
          tenantCtx(req),
          req.params.report,
          req.query.format,
          req.query,
        );
        return reply
          .header('content-type', file.contentType)
          .header('content-disposition', `attachment; filename="${file.filename}"`)
          .send(file.body);
      },
    );
  };
}
