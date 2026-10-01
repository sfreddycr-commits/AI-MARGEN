import { randomUUID } from 'node:crypto';
import type { RegisterInput, LoginInput } from '@aimargen/schemas';
import { AppError } from '../../core/http/app-error.js';
import { DbError } from '../../core/db/db-error.js';
import type { RequestContext } from '../../core/http/request-context.js';
import { hashPassword, verifyDummy, verifyPassword } from '../../core/auth/password.js';
import { randomToken, sha256 } from '../../core/auth/tokens.js';
import { REMEMBER_DAYS, SESSION_DAYS } from '../../core/auth/auth.plugin.js';
import { resetPasswordMessage, verifyEmailMessage } from '../../core/mail/templates.js';
import type { Services } from '../../core/services.js';
import type { Row } from '../../core/db/db.js';
import type { AuthModel } from './auth.model.js';
import type { TenantModel } from '../tenant/tenant.model.js';
import { tenantDto } from '../tenant/tenant.dto.js';
import { bool, iso } from '../../core/http/dto.js';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const VERIFY_TTL_MIN = 24 * 60;
const RESET_TTL_MIN = 60;

export interface IssuedSession {
  access: string;
  refresh: string;
  remember: boolean;
}

/**
 * Lógica de autenticación (SOP §7, §29; ADR-0008).
 * - Nunca revela si una cuenta existe en recuperación ni en reenvío de verificación.
 * - Errores de credenciales con un único mensaje; bloqueo tras 5 intentos fallidos.
 */
export function createAuthController(model: AuthModel, tenants: TenantModel, s: Services) {
  async function issueAccess(user: Row): Promise<string> {
    return s.codec.sign({
      uid: Number(user.id),
      uu: String(user.uuid),
      tid: user.tenant_id ? Number(user.tenant_id) : null,
      tu: user.tenant_uuid ? String(user.tenant_uuid) : null,
      role: String(user.role),
    });
  }

  async function startSession(
    user: Row,
    remember: boolean,
    ctx: RequestContext,
  ): Promise<IssuedSession> {
    const refresh = randomToken();
    await model.createSession({
      userId: Number(user.id),
      family: randomUUID(),
      tokenHash: sha256(refresh),
      remember,
      ttlDays: remember ? REMEMBER_DAYS : SESSION_DAYS,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return { access: await issueAccess(user), refresh, remember };
  }

  async function sendVerification(userId: number, email: string, name: string): Promise<void> {
    const token = randomToken();
    await model.createToken(userId, 'verify_email', sha256(token), VERIFY_TTL_MIN);
    const url = `${s.config.APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
    await s.mailer.send(verifyEmailMessage(email, name, url));
  }

  function audit(
    ctx: RequestContext,
    action: string,
    user: Row | null,
    extra: Record<string, unknown> = {},
  ) {
    return s.audit.log(
      {
        ...ctx,
        userId: user ? Number(user.id) : null,
        tenantId: user?.tenant_id ? Number(user.tenant_id) : null,
      },
      {
        action,
        entity: 'user',
        entityUuid: user ? String(user.uuid) : null,
        after: Object.keys(extra).length ? extra : undefined,
      },
    );
  }

  return {
    async register(input: RegisterInput, ctx: RequestContext): Promise<{ email: string }> {
      const hash = await hashPassword(input.password);
      let created: { id: number; uuid: string };
      try {
        created = await model.createUser(input.name, input.email, hash);
      } catch (e) {
        if (e instanceof DbError && e.code === 'ERR_DUPLICATE') {
          throw new AppError(
            409,
            'EMAIL_TAKEN',
            'Ya existe una cuenta con ese correo. Inicie sesión o recupere su contraseña.',
          );
        }
        throw e;
      }
      await s.audit.log(
        { ...ctx, userId: created.id },
        { action: 'auth.register', entity: 'user', entityUuid: created.uuid },
      );
      await sendVerification(created.id, input.email, input.name);
      return { email: input.email };
    },

    async login(input: LoginInput, ctx: RequestContext): Promise<IssuedSession> {
      const user = await model.getByEmail(input.email);
      if (!user) {
        await verifyDummy(input.password);
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.');
      }
      if (bool(user.is_locked)) {
        throw new AppError(
          423,
          'ACCOUNT_LOCKED',
          `Cuenta bloqueada temporalmente por intentos fallidos. Intente en ${LOCK_MINUTES} minutos o recupere su contraseña.`,
        );
      }
      const ok = await verifyPassword(String(user.password_hash), input.password);
      if (!ok) {
        await model.loginFailed(Number(user.id), MAX_ATTEMPTS, LOCK_MINUTES);
        await audit(ctx, 'auth.login_failed', user);
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.');
      }
      if (user.status === 'blocked') {
        throw new AppError(
          403,
          'ACCOUNT_BLOCKED',
          'Su cuenta está bloqueada. Contacte al administrador de su negocio.',
        );
      }
      if (user.status === 'invited') {
        throw new AppError(
          403,
          'INVITATION_PENDING',
          'Acepte la invitación desde su correo para crear su contraseña.',
        );
      }
      if (user.tenant_status === 'suspended') {
        throw new AppError(
          403,
          'TENANT_SUSPENDED',
          'El acceso de este negocio está suspendido. Escríbanos para ayudarle.',
        );
      }
      if (!user.email_verified_at) {
        throw new AppError(
          403,
          'EMAIL_NOT_VERIFIED',
          'Confirme su correo para ingresar. Revise su bandeja de entrada.',
        );
      }
      await model.loginSucceeded(Number(user.id));
      await audit(ctx, 'auth.login', user);
      return startSession(user, input.remember, ctx);
    },

    async refresh(refreshToken: string | undefined, ctx: RequestContext): Promise<IssuedSession> {
      if (!refreshToken)
        throw new AppError(401, 'SESSION_EXPIRED', 'Su sesión venció. Ingrese de nuevo.');
      const next = randomToken();
      let rotated: Row;
      try {
        // El TTL real lo decide el SP según "recordarme" de la familia; aquí se envía el máximo.
        rotated = await model.rotateSession(
          sha256(refreshToken),
          sha256(next),
          REMEMBER_DAYS,
          ctx.ip,
          ctx.userAgent,
        );
      } catch (e) {
        if (e instanceof DbError && e.code === 'ERR_CONFLICT') {
          throw new AppError(409, 'REFRESH_IN_PROGRESS', 'Reintente la solicitud.');
        }
        if (e instanceof DbError && (e.code === 'ERR_NOT_FOUND' || e.code === 'ERR_FORBIDDEN')) {
          throw new AppError(401, 'SESSION_EXPIRED', 'Su sesión venció. Ingrese de nuevo.');
        }
        throw e;
      }
      const user = await model.getUser(Number(rotated.user_id));
      if (!user) throw new AppError(401, 'SESSION_EXPIRED', 'Su sesión venció. Ingrese de nuevo.');
      return { access: await issueAccess(user), refresh: next, remember: bool(rotated.remember) };
    },

    /** Reemite el token de acceso (tras el onboarding, cuando el usuario obtiene un tenant). */
    async reissueAccess(userId: number): Promise<string> {
      const user = await model.getUser(userId);
      if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Inicie sesión para continuar.');
      return issueAccess(user);
    },

    async logout(refreshToken: string | undefined, ctx: RequestContext): Promise<void> {
      if (refreshToken) await model.revokeSession(sha256(refreshToken));
      if (ctx.userId)
        await s.audit.log(ctx, {
          action: 'auth.logout',
          entity: 'user',
          entityUuid: ctx.userUuid ?? null,
        });
    },

    async forgotPassword(email: string, ctx: RequestContext): Promise<void> {
      const user = await model.getByEmail(email);
      if (!user || user.status === 'blocked') return;
      const token = randomToken();
      await model.createToken(Number(user.id), 'reset_password', sha256(token), RESET_TTL_MIN);
      const url = `${s.config.APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
      // Sin await: la respuesta tarda lo mismo exista o no la cuenta.
      void s.mailer
        .send(resetPasswordMessage(String(user.email), String(user.name), url))
        .catch((err) => {
          s.log.error({ err }, 'no se pudo enviar el correo de recuperación');
        });
      await audit(ctx, 'auth.password_reset_requested', user);
    },

    async resetPassword(token: string, password: string, ctx: RequestContext): Promise<void> {
      let user: Row;
      try {
        user = await model.consumeToken(sha256(token), 'reset_password');
      } catch (e) {
        if (e instanceof DbError && e.code === 'ERR_NOT_FOUND') {
          throw new AppError(
            400,
            'TOKEN_INVALID',
            'El enlace no es válido o ya venció. Solicite uno nuevo.',
          );
        }
        throw e;
      }
      await model.setPassword(Number(user.id), await hashPassword(password));
      await s.audit.log(
        { ...ctx, userId: Number(user.id) },
        { action: 'auth.password_reset', entity: 'user', entityUuid: String(user.uuid) },
      );
    },

    async acceptInvite(token: string, password: string, ctx: RequestContext): Promise<void> {
      let user: Row;
      try {
        user = await model.consumeToken(sha256(token), 'invite');
      } catch (e) {
        if (e instanceof DbError && e.code === 'ERR_NOT_FOUND') {
          throw new AppError(
            400,
            'TOKEN_INVALID',
            'La invitación no es válida o ya venció. Pida una nueva.',
          );
        }
        throw e;
      }
      await model.setPassword(Number(user.id), await hashPassword(password));
      await s.audit.log(
        { ...ctx, userId: Number(user.id) },
        { action: 'auth.invite_accepted', entity: 'user', entityUuid: String(user.uuid) },
      );
    },

    async verifyEmail(token: string, ctx: RequestContext): Promise<void> {
      let user: Row;
      try {
        user = await model.consumeToken(sha256(token), 'verify_email');
      } catch (e) {
        if (e instanceof DbError && e.code === 'ERR_NOT_FOUND') {
          throw new AppError(
            400,
            'TOKEN_INVALID',
            'El enlace no es válido o ya venció. Solicite uno nuevo.',
          );
        }
        throw e;
      }
      await model.verifyEmail(Number(user.id));
      await s.audit.log(
        { ...ctx, userId: Number(user.id) },
        { action: 'auth.email_verified', entity: 'user', entityUuid: String(user.uuid) },
      );
    },

    async resendVerification(email: string): Promise<void> {
      const user = await model.getByEmail(email);
      if (!user || user.email_verified_at || user.status !== 'active') return;
      void sendVerification(Number(user.id), String(user.email), String(user.name)).catch((err) => {
        s.log.error({ err }, 'no se pudo reenviar la verificación');
      });
    },

    async changePassword(ctx: RequestContext, current: string, next: string): Promise<void> {
      const user = await model.getUser(ctx.userId!);
      const full = user ? await model.getByEmail(String(user.email)) : null;
      if (!full || !(await verifyPassword(String(full.password_hash), current))) {
        throw new AppError(400, 'INVALID_PASSWORD', 'La contraseña actual no es correcta.');
      }
      await model.setPassword(ctx.userId!, await hashPassword(next));
      await s.audit.log(ctx, {
        action: 'auth.password_changed',
        entity: 'user',
        entityUuid: ctx.userUuid ?? null,
      });
    },

    async me(ctx: RequestContext) {
      const user = await model.getUser(ctx.userId!);
      if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Inicie sesión para continuar.');
      const tenantRow = ctx.tenantId ? await tenants.get(ctx.tenantId) : null;
      const flags = ctx.tenantId ? await tenants.flags(ctx.tenantId) : [];
      return {
        user: {
          uuid: String(user.uuid),
          name: String(user.name),
          email: String(user.email),
          role: String(user.role),
          emailVerified: !!user.email_verified_at,
          lastLoginAt: iso(user.last_login_at),
        },
        tenant: tenantRow ? tenantDto(tenantRow) : null,
        permissions: [...(ctx.permissions ?? [])].sort(),
        flags: Object.fromEntries(flags.map((f) => [String(f.code), bool(f.enabled)])),
        aiEnabled: !!s.ai,
      };
    },

    async createSuperAdmin(name: string, email: string, password: string): Promise<string> {
      return model.createSuperAdmin(name, email, await hashPassword(password));
    },
  };
}

export type AuthController = ReturnType<typeof createAuthController>;
