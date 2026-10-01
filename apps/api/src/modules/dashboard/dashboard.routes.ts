import type { FastifyPluginAsync } from 'fastify';
import { requirePermission, tenantCtx } from '../../core/auth/guards.js';
import type { DashboardController } from './dashboard.controller.js';

export function dashboardRoutes(c: DashboardController): FastifyPluginAsync {
  return async (app) => {
    app.get(
      '/dashboard',
      { preHandler: requirePermission('products.read'), schema: { tags: ['dashboard'] } },
      async (req) => c.summary(tenantCtx(req)),
    );
  };
}
