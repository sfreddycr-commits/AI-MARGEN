import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { pricingCalculateInput } from '@aimargen/schemas';
import { requirePermission, tenantCtx } from '../../core/auth/guards.js';
import type { PricingController } from './pricing.controller.js';

export function pricingRoutes(c: PricingController): FastifyPluginAsync {
  return async (base) => {
    const app = base.withTypeProvider<ZodTypeProvider>();
    const tags = ['pricing'];
    const read = requirePermission('pricing.read');
    app.get('/pricing', { preHandler: read, schema: { tags } }, async (req) =>
      c.overview(tenantCtx(req)),
    );
    app.post(
      '/pricing/calculate',
      { preHandler: read, schema: { tags, body: pricingCalculateInput } },
      async (req) => c.calculate(req.body),
    );
  };
}
