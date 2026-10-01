import type { FastifyRequest } from 'fastify';

/**
 * Contexto de cada solicitud. `tenantId`/`userId` son internos (BIGINT) y solo los completa
 * el middleware de autenticación a partir de la sesión — nunca desde el cuerpo,
 * query ni headers enviados por el cliente (SOP §5).
 */
export interface RequestContext {
  requestId: string;
  ip: string;
  userAgent: string | null;
  tenantId: number | null;
  tenantUuid?: string | null;
  userId: number | null;
  userUuid?: string | null;
  role?: string | null;
  permissions?: ReadonlySet<string>;
}

/** Contexto con negocio garantizado (rutas que pasaron requireTenant). */
export interface TenantContext extends RequestContext {
  tenantId: number;
  tenantUuid: string;
  userId: number;
  userUuid: string;
  role: string;
  permissions: ReadonlySet<string>;
}

declare module 'fastify' {
  interface FastifyRequest {
    ctx: RequestContext;
  }
}

export function buildRequestContext(req: FastifyRequest): RequestContext {
  const ua = req.headers['user-agent'];
  return {
    requestId: req.id,
    ip: req.ip,
    userAgent: typeof ua === 'string' ? ua.slice(0, 255) : null,
    tenantId: null,
    userId: null,
  };
}

/** Contexto para procesos internos (seed, CLI, jobs) que actúan dentro de un tenant. */
export function systemContext(
  tenantId: number,
  userId: number,
  extra: Partial<TenantContext> = {},
): TenantContext {
  return {
    requestId: 'system',
    ip: '127.0.0.1',
    userAgent: 'aimargen-system',
    tenantId,
    tenantUuid: extra.tenantUuid ?? '',
    userId,
    userUuid: extra.userUuid ?? '',
    role: extra.role ?? 'tenant_owner',
    permissions: extra.permissions ?? new Set(),
  };
}
