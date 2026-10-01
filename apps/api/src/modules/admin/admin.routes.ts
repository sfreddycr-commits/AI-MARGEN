import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { pagination, uuid } from '@aimargen/schemas';
import { requireSuperAdmin } from '../../core/auth/guards.js';
import type { AdminController } from './admin.controller.js';

const params = z.object({ uuid });

/** Rutas /admin: solo super_admin (SOP §11, §38: un admin de tenant no accede al panel global). */
export function adminRoutes(c: AdminController): FastifyPluginAsync {
  return async (base) => {
    const app = base.withTypeProvider<ZodTypeProvider>();
    app.addHook('preHandler', async (req, reply) => {
      if (req.routeOptions.url?.startsWith('/api/v1/admin'))
        await requireSuperAdmin.call(app, req, reply);
    });
    const tags = ['admin'];
    app.get('/admin/metrics', { schema: { tags } }, async () => c.metrics());
    app.get(
      '/admin/tenants',
      {
        schema: {
          tags,
          querystring: pagination.extend({
            q: z.string().max(120).optional(),
            status: z.enum(['active', 'suspended']).optional(),
          }),
        },
      },
      async (req) => c.tenants(req.query),
    );
    app.get('/admin/tenants/:uuid', { schema: { tags, params } }, async (req) =>
      c.tenant(req.params.uuid),
    );
    app.post(
      '/admin/tenants/:uuid/status',
      {
        schema: { tags, params, body: z.object({ status: z.enum(['active', 'suspended']) }) },
      },
      async (req) => c.setTenantStatus(req.ctx, req.params.uuid, req.body.status),
    );
    app.get('/admin/tenants/:uuid/flags', { schema: { tags, params } }, async (req) =>
      c.flags(req.params.uuid),
    );
    app.put(
      '/admin/tenants/:uuid/flags/:code',
      {
        schema: {
          tags,
          params: z.object({ uuid, code: z.string().max(60) }),
          body: z.object({ enabled: z.boolean().nullable() }),
        },
      },
      async (req) => c.setFlag(req.ctx, req.params.uuid, req.params.code, req.body.enabled),
    );
    app.get(
      '/admin/users',
      { schema: { tags, querystring: z.object({ q: z.string().max(190).optional() }) } },
      async (req) => c.users(req.query.q),
    );
    app.get(
      '/admin/ai-usage',
      {
        schema: {
          tags,
          querystring: z.object({ from: z.iso.date().optional(), to: z.iso.date().optional() }),
        },
      },
      async (req) => {
        const to = req.query.to ?? new Date().toISOString().slice(0, 10);
        const from = req.query.from ?? `${to.slice(0, 7)}-01`;
        return c.aiUsage(from, to);
      },
    );
    app.get(
      '/admin/audit',
      {
        schema: {
          tags,
          querystring: pagination.extend({
            tenant: uuid.optional(),
            action: z.string().max(60).optional(),
          }),
        },
      },
      async (req) => c.audit(req.query),
    );
  };
}
