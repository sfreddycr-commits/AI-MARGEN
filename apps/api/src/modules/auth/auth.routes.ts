import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import {
  changePasswordInput,
  emailInput,
  loginInput,
  registerInput,
  resetPasswordInput,
  tokenInput,
} from '@aimargen/schemas';
import { REFRESH_COOKIE, type SessionCookies } from '../../core/auth/auth.plugin.js';
import { requireAuth } from '../../core/auth/guards.js';
import type { AuthController } from './auth.controller.js';
import type { RequestContext } from '../../core/http/request-context.js';

const ok = z.object({ ok: z.literal(true) });
const tags = ['auth'];
/** Límites estrictos contra fuerza bruta y abuso (SOP §29). */
const strict = { rateLimit: { max: 10, timeWindow: '1 minute' } };
const veryStrict = { rateLimit: { max: 5, timeWindow: '1 minute' } };

export function authRoutes(
  controller: AuthController,
  cookies: SessionCookies,
): FastifyPluginAsync {
  return async (base) => {
    const app = base.withTypeProvider<ZodTypeProvider>();

    app.post(
      '/auth/register',
      { config: veryStrict, schema: { tags, body: registerInput } },
      async (req, reply) => {
        const result = await controller.register(req.body, req.ctx);
        return reply.status(201).send(result);
      },
    );

    app.post(
      '/auth/login',
      { config: strict, schema: { tags, body: loginInput } },
      async (req, reply) => {
        const session = await controller.login(req.body, req.ctx);
        cookies.setAccess(reply, session.access);
        cookies.setRefresh(reply, session.refresh, session.remember);
        return reply.send(await controller.me(await reloadCtx(req, session.access)));
      },
    );

    app.post(
      '/auth/refresh',
      { config: { rateLimit: { max: 60, timeWindow: '1 minute' } }, schema: { tags } },
      async (req, reply) => {
        try {
          const session = await controller.refresh(req.cookies[REFRESH_COOKIE], req.ctx);
          cookies.setAccess(reply, session.access);
          cookies.setRefresh(reply, session.refresh, session.remember);
          return reply.send({ ok: true });
        } catch (e) {
          if ((e as { code?: string }).code === 'SESSION_EXPIRED') cookies.clear(reply);
          throw e;
        }
      },
    );

    app.post('/auth/logout', { schema: { tags, response: { 200: ok } } }, async (req, reply) => {
      await controller.logout(req.cookies[REFRESH_COOKIE], req.ctx);
      cookies.clear(reply);
      return reply.send({ ok: true });
    });

    app.post(
      '/auth/forgot-password',
      { config: veryStrict, schema: { tags, body: emailInput, response: { 200: ok } } },
      async (req) => {
        await controller.forgotPassword(req.body.email, req.ctx);
        return { ok: true as const };
      },
    );

    app.post(
      '/auth/reset-password',
      { config: strict, schema: { tags, body: resetPasswordInput, response: { 200: ok } } },
      async (req) => {
        await controller.resetPassword(req.body.token, req.body.password, req.ctx);
        return { ok: true as const };
      },
    );

    app.post(
      '/auth/accept-invite',
      { config: strict, schema: { tags, body: resetPasswordInput, response: { 200: ok } } },
      async (req) => {
        await controller.acceptInvite(req.body.token, req.body.password, req.ctx);
        return { ok: true as const };
      },
    );

    app.post(
      '/auth/verify-email',
      { config: strict, schema: { tags, body: tokenInput, response: { 200: ok } } },
      async (req) => {
        await controller.verifyEmail(req.body.token, req.ctx);
        return { ok: true as const };
      },
    );

    app.post(
      '/auth/resend-verification',
      { config: veryStrict, schema: { tags, body: emailInput, response: { 200: ok } } },
      async (req) => {
        await controller.resendVerification(req.body.email);
        return { ok: true as const };
      },
    );

    app.post(
      '/auth/change-password',
      {
        preHandler: requireAuth,
        config: strict,
        schema: { tags, body: changePasswordInput, response: { 200: ok } },
      },
      async (req, reply) => {
        await controller.changePassword(req.ctx, req.body.currentPassword, req.body.newPassword);
        cookies.clear(reply);
        return reply.send({ ok: true });
      },
    );

    app.get('/auth/me', { preHandler: requireAuth, schema: { tags } }, async (req) =>
      controller.me(req.ctx),
    );
  };

  /** Tras iniciar sesión, el contexto de esta solicitud aún no tiene usuario: se completa con el token nuevo. */
  async function reloadCtx(
    req: { ctx: RequestContext; server: FastifyInstance },
    access: string,
  ): Promise<RequestContext> {
    const claims = await req.server.services.codec.verify(access);
    const perms = claims ? req.server.services.roles.permissions.get(claims.role) : undefined;
    return {
      ...req.ctx,
      userId: claims?.uid ?? null,
      userUuid: claims?.uu ?? null,
      tenantId: claims?.tid ?? null,
      tenantUuid: claims?.tu ?? null,
      role: claims?.role ?? null,
      permissions: perms ?? new Set<string>(),
    };
  }
}
