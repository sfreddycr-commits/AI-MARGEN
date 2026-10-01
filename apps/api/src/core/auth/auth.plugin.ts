import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { AppConfig } from '../config/config.js';
import { AppError } from '../http/app-error.js';
import type { RolePermissions } from './permissions.js';
import { ACCESS_TTL_SECONDS, type AccessClaims, type AccessTokenCodec } from './tokens.js';

export const ACCESS_COOKIE = 'am_at';
export const REFRESH_COOKIE = 'am_rt';
export const REFRESH_PATH = '/api/v1/auth';
export const REMEMBER_DAYS = 30;
export const SESSION_DAYS = 7;

export interface SessionCookies {
  setAccess(reply: FastifyReply, token: string): void;
  setRefresh(reply: FastifyReply, token: string, remember: boolean): void;
  clear(reply: FastifyReply): void;
}

export function createSessionCookies(config: AppConfig): SessionCookies {
  const base = { httpOnly: true, secure: !!config.COOKIE_SECURE, sameSite: 'lax' as const };
  return {
    setAccess(reply, token) {
      reply.setCookie(ACCESS_COOKIE, token, { ...base, path: '/api', maxAge: ACCESS_TTL_SECONDS });
    },
    setRefresh(reply, token, remember) {
      reply.setCookie(REFRESH_COOKIE, token, {
        ...base,
        path: REFRESH_PATH,
        // Sin "recordarme": cookie de sesión del navegador (se borra al cerrarlo).
        ...(remember ? { maxAge: REMEMBER_DAYS * 24 * 3600 } : {}),
      });
    },
    clear(reply) {
      reply.clearCookie(ACCESS_COOKIE, { ...base, path: '/api' });
      reply.clearCookie(REFRESH_COOKIE, { ...base, path: REFRESH_PATH });
    },
  };
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Autenticación por cookie + defensa CSRF (ADR-0008).
 * - Lee la cookie de acceso, la verifica y completa req.ctx (usuario, tenant, rol, permisos).
 * - En métodos que modifican datos exige `X-Requested-With: aimargen-web` y un Origin permitido.
 */
export function registerAuth(
  app: FastifyInstance,
  deps: { codec: AccessTokenCodec; roles: RolePermissions; config: AppConfig },
): void {
  const allowedOrigins = new Set([
    ...deps.config.CORS_ORIGINS,
    new URL(deps.config.APP_URL).origin,
  ]);

  app.addHook('onRequest', async (req: FastifyRequest) => {
    if (!req.url.startsWith('/api/')) return;

    if (MUTATING.has(req.method)) {
      if (req.headers['x-requested-with'] !== 'aimargen-web') {
        throw new AppError(403, 'CSRF', 'Solicitud no permitida.');
      }
      const origin = req.headers.origin;
      if (origin && !allowedOrigins.has(origin)) {
        throw new AppError(403, 'CSRF', 'Solicitud no permitida.');
      }
    }

    const token = req.cookies[ACCESS_COOKIE];
    if (!token) return;
    const claims = await deps.codec.verify(token);
    if (!claims) return;
    applyClaims(req, claims, deps.roles);
  });
}

export function applyClaims(
  req: FastifyRequest,
  claims: AccessClaims,
  roles: RolePermissions,
): void {
  req.ctx.userId = claims.uid;
  req.ctx.userUuid = claims.uu;
  req.ctx.tenantId = claims.tid;
  req.ctx.tenantUuid = claims.tu;
  req.ctx.role = claims.role;
  req.ctx.permissions = roles.permissions.get(claims.role) ?? new Set();
}
