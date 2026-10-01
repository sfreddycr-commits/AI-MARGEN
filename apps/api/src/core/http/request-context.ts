import type { FastifyRequest } from 'fastify';

/**
 * Contexto de cada solicitud. `tenantId`/`userId` son internos (BIGINT) y solo los completa
 * el middleware de autenticación (Etapa 3) a partir de la sesión — nunca desde el cuerpo,
 * query ni headers enviados por el cliente (SOP §5).
 */
export interface RequestContext {
  requestId: string;
  ip: string;
  userAgent: string | null;
  tenantId: number | null;
  userId: number | null;
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
