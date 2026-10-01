import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import { AppError } from '../http/app-error.js';
import type { TenantContext } from '../http/request-context.js';

/**
 * Guards de autorización. Se usan como preHandler en cada ruta.
 * El orden siempre es: autenticado → con negocio → permiso.
 */

export const requireAuth: preHandlerAsyncHookHandler = async (req: FastifyRequest) => {
  if (!req.ctx.userId) throw new AppError(401, 'UNAUTHENTICATED', 'Inicie sesión para continuar.');
};

export const requireTenant: preHandlerAsyncHookHandler = async (req: FastifyRequest) => {
  if (!req.ctx.userId) throw new AppError(401, 'UNAUTHENTICATED', 'Inicie sesión para continuar.');
  if (!req.ctx.tenantId) {
    throw new AppError(409, 'ONBOARDING_REQUIRED', 'Primero configure su negocio.');
  }
};

export function requirePermission(...codes: string[]): preHandlerAsyncHookHandler {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    await requireTenant.call(req.server, req, reply);
    const perms = req.ctx.permissions ?? new Set<string>();
    if (!codes.every((c) => perms.has(c))) {
      throw new AppError(403, 'FORBIDDEN', 'No tiene permiso para realizar esta acción.');
    }
  };
}

export const requireSuperAdmin: preHandlerAsyncHookHandler = async (req: FastifyRequest) => {
  if (!req.ctx.userId) throw new AppError(401, 'UNAUTHENTICATED', 'Inicie sesión para continuar.');
  if (req.ctx.role !== 'super_admin' || !req.ctx.permissions?.has('platform.admin')) {
    throw new AppError(403, 'FORBIDDEN', 'No tiene permiso para realizar esta acción.');
  }
};

/** Obtiene el contexto con negocio garantizado (usar solo detrás de requireTenant/requirePermission). */
export function tenantCtx(req: FastifyRequest): TenantContext {
  const c = req.ctx;
  if (!c.tenantId || !c.userId || !c.tenantUuid || !c.userUuid || !c.role || !c.permissions) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Inicie sesión para continuar.');
  }
  return c as TenantContext;
}
