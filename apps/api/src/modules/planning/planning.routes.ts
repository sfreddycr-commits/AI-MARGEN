import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { fixedCostInput, scenarioCalculateInput, scenarioInput, uuid } from '@aimargen/schemas';
import { requirePermission, tenantCtx } from '../../core/auth/guards.js';
import type { PlanningController } from './planning.controller.js';

const params = z.object({ uuid });

export function planningRoutes(c: PlanningController): FastifyPluginAsync {
  return async (base) => {
    const app = base.withTypeProvider<ZodTypeProvider>();
    const read = requirePermission('scenarios.read');
    const write = requirePermission('scenarios.write');

    // Costos fijos
    let tags = ['fixed-costs'];
    app.get('/fixed-costs', { preHandler: read, schema: { tags } }, async (req) =>
      c.listFixedCosts(tenantCtx(req)),
    );
    app.post(
      '/fixed-costs',
      { preHandler: write, schema: { tags, body: fixedCostInput } },
      async (req, reply) =>
        reply.status(201).send(await c.saveFixedCost(tenantCtx(req), null, req.body)),
    );
    app.patch(
      '/fixed-costs/:uuid',
      { preHandler: write, schema: { tags, params, body: fixedCostInput } },
      async (req) => c.saveFixedCost(tenantCtx(req), req.params.uuid, req.body),
    );
    app.post(
      '/fixed-costs/:uuid/archive',
      { preHandler: write, schema: { tags, params } },
      async (req) => c.setFixedCostArchived(tenantCtx(req), req.params.uuid, true),
    );

    // Escenarios
    tags = ['scenarios'];
    app.get('/scenarios', { preHandler: read, schema: { tags } }, async (req) =>
      c.listScenarios(tenantCtx(req)),
    );
    app.get('/scenarios/:uuid', { preHandler: read, schema: { tags, params } }, async (req) =>
      c.getScenario(tenantCtx(req), req.params.uuid),
    );
    app.post(
      '/scenarios/calculate',
      { preHandler: read, schema: { tags, body: scenarioCalculateInput } },
      async (req) => c.calculate(tenantCtx(req), req.body),
    );
    app.post(
      '/scenarios',
      { preHandler: write, schema: { tags, body: scenarioInput } },
      async (req, reply) =>
        reply.status(201).send(await c.saveScenario(tenantCtx(req), null, req.body)),
    );
    app.patch(
      '/scenarios/:uuid',
      { preHandler: write, schema: { tags, params, body: scenarioInput } },
      async (req) => c.saveScenario(tenantCtx(req), req.params.uuid, req.body),
    );
    app.post(
      '/scenarios/:uuid/archive',
      { preHandler: write, schema: { tags, params } },
      async (req) => c.setScenarioArchived(tenantCtx(req), req.params.uuid, true),
    );
  };
}
