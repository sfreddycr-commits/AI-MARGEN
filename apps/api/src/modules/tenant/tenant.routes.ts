import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  inviteUserInput,
  onboardingBusinessInput,
  pagination,
  settingsUpdateInput,
  tenantUpdateInput,
  updateUserInput,
  uuid,
} from '@aimargen/schemas';
import {
  requireAuth,
  requirePermission,
  requireTenant,
  tenantCtx,
} from '../../core/auth/guards.js';
import type { SessionCookies } from '../../core/auth/auth.plugin.js';
import type { TenantController } from './tenant.controller.js';
import type { AuthController } from '../auth/auth.controller.js';

const tags = ['tenant'];
const params = z.object({ uuid });

export function tenantRoutes(
  controller: TenantController,
  auth: AuthController,
  cookies: SessionCookies,
): FastifyPluginAsync {
  return async (base) => {
    const app = base.withTypeProvider<ZodTypeProvider>();

    // --- Onboarding (SOP §8) ---
    app.post(
      '/onboarding/business',
      { preHandler: requireAuth, schema: { tags: ['onboarding'], body: onboardingBusinessInput } },
      async (req, reply) => {
        const tenant = await controller.createBusiness(req.ctx, req.body);
        // El usuario ahora pertenece a un negocio: se reemite el token de acceso con el tenant.
        cookies.setAccess(reply, await auth.reissueAccess(req.ctx.userId!));
        return reply.status(201).send(tenant);
      },
    );
    app.post(
      '/onboarding/complete',
      { preHandler: requireTenant, schema: { tags: ['onboarding'] } },
      async (req) => controller.completeOnboarding(tenantCtx(req)),
    );

    // --- Negocio y configuración ---
    app.get(
      '/tenant',
      { preHandler: requirePermission('tenant.read'), schema: { tags } },
      async (req) => controller.get(tenantCtx(req)),
    );
    app.patch(
      '/tenant',
      { preHandler: requirePermission('tenant.update'), schema: { tags, body: tenantUpdateInput } },
      async (req) => controller.update(tenantCtx(req), req.body),
    );
    app.get(
      '/tenant/settings',
      { preHandler: requirePermission('settings.read'), schema: { tags } },
      async (req) => (await controller.get(tenantCtx(req))).settings,
    );
    app.patch(
      '/tenant/settings',
      {
        preHandler: requirePermission('settings.update'),
        schema: { tags, body: settingsUpdateInput },
      },
      async (req) => controller.updateSettings(tenantCtx(req), req.body),
    );

    // --- Usuarios del negocio ---
    app.get(
      '/tenant/users',
      { preHandler: requirePermission('users.read'), schema: { tags } },
      async (req) => controller.listUsers(tenantCtx(req)),
    );
    app.post(
      '/tenant/users',
      {
        preHandler: requirePermission('users.manage'),
        config: { rateLimit: { max: 20, timeWindow: '1 hour' } },
        schema: { tags, body: inviteUserInput },
      },
      async (req, reply) =>
        reply.status(201).send(await controller.inviteUser(tenantCtx(req), req.body)),
    );
    app.patch(
      '/tenant/users/:uuid',
      {
        preHandler: requirePermission('users.manage'),
        schema: { tags, params, body: updateUserInput },
      },
      async (req) => controller.updateUser(tenantCtx(req), req.params.uuid, req.body),
    );

    // --- Auditoría del negocio ---
    app.get(
      '/tenant/audit',
      {
        preHandler: requirePermission('audit.read'),
        schema: { tags, querystring: pagination.extend({ entity: z.string().max(60).optional() }) },
      },
      async (req) =>
        controller.audit(
          tenantCtx(req),
          req.query.entity ?? null,
          req.query.page,
          req.query.pageSize,
        ),
    );
  };
}
