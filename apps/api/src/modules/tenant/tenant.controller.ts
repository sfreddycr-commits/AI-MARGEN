import type { z } from 'zod';
import type {
  inviteUserInput,
  OnboardingBusinessInput,
  settingsUpdateInput,
  tenantUpdateInput,
  updateUserInput,
} from '@aimargen/schemas';
import { AppError } from '../../core/http/app-error.js';
import { DbError } from '../../core/db/db-error.js';
import type { RequestContext, TenantContext } from '../../core/http/request-context.js';
import { hashPassword } from '../../core/auth/password.js';
import { randomToken, sha256 } from '../../core/auth/tokens.js';
import { inviteMessage } from '../../core/mail/templates.js';
import type { Services } from '../../core/services.js';
import type { AuthModel } from '../auth/auth.model.js';
import type { TenantModel } from './tenant.model.js';
import { auditDto, tenantDto, tenantUserDto } from './tenant.dto.js';

const INVITE_TTL_MIN = 7 * 24 * 60;

export function slugify(name: string): string {
  const s = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return s || 'negocio';
}

export function createTenantController(model: TenantModel, auth: AuthModel, s: Services) {
  return {
    /** Paso 1 del onboarding: crea el negocio y deja al usuario como propietario. */
    async createBusiness(ctx: RequestContext, input: OnboardingBusinessInput, isDemo = false) {
      if (ctx.tenantId)
        throw new AppError(409, 'TENANT_EXISTS', 'Su cuenta ya tiene un negocio configurado.');
      if (ctx.role === 'super_admin')
        throw new AppError(403, 'FORBIDDEN', 'No tiene permiso para realizar esta acción.');
      let created: { id: number; uuid: string };
      try {
        created = await model.create({
          userId: ctx.userId!,
          name: input.name,
          slug: slugify(input.name),
          businessType: input.businessType,
          country: input.country,
          currency: input.currency,
          timezone: input.timezone,
          targetMargin: input.targetMargin,
          operatingDays: input.operatingDays,
          isDemo,
        });
      } catch (e) {
        if (e instanceof DbError && e.code === 'ERR_CONFLICT') {
          throw new AppError(409, 'TENANT_EXISTS', 'Su cuenta ya tiene un negocio configurado.');
        }
        throw e;
      }
      await s.audit.log(
        { ...ctx, tenantId: created.id },
        { action: 'tenant.create', entity: 'tenant', entityUuid: created.uuid, after: input },
      );
      return tenantDto((await model.get(created.id))!);
    },

    async completeOnboarding(ctx: TenantContext) {
      await model.completeOnboarding(ctx.tenantId);
      await s.audit.log(ctx, {
        action: 'tenant.onboarding_completed',
        entity: 'tenant',
        entityUuid: ctx.tenantUuid,
      });
      return tenantDto((await model.get(ctx.tenantId))!);
    },

    async get(ctx: TenantContext) {
      const row = await model.get(ctx.tenantId);
      if (!row) throw new AppError(404, 'NOT_FOUND', 'No se encontró el negocio.');
      return tenantDto(row);
    },

    async update(ctx: TenantContext, input: z.infer<typeof tenantUpdateInput>) {
      const before = await model.get(ctx.tenantId);
      await model.update(ctx.tenantId, input);
      const after = tenantDto((await model.get(ctx.tenantId))!);
      await s.audit.log(ctx, {
        action: 'tenant.update',
        entity: 'tenant',
        entityUuid: ctx.tenantUuid,
        before: before ? tenantDto(before) : null,
        after,
      });
      return after;
    },

    async updateSettings(ctx: TenantContext, input: z.infer<typeof settingsUpdateInput>) {
      const before = await model.get(ctx.tenantId);
      await model.updateSettings(ctx.tenantId, input);
      const after = tenantDto((await model.get(ctx.tenantId))!);
      await s.audit.log(ctx, {
        action: 'tenant_settings.update',
        entity: 'tenant_settings',
        entityUuid: ctx.tenantUuid,
        before: before ? tenantDto(before).settings : null,
        after: after.settings,
      });
      return after;
    },

    async listUsers(ctx: TenantContext) {
      return (await model.listUsers(ctx.tenantId)).map(tenantUserDto);
    },

    async inviteUser(ctx: TenantContext, input: z.infer<typeof inviteUserInput>) {
      const tenant = await model.get(ctx.tenantId);
      // Contraseña aleatoria inutilizable hasta que el invitado cree la suya.
      const placeholder = await hashPassword(randomToken());
      let created;
      try {
        created = await model.inviteUser(ctx.tenantId, { ...input, passwordHash: placeholder });
      } catch (e) {
        if (e instanceof DbError && e.code === 'ERR_DUPLICATE') {
          throw new AppError(409, 'EMAIL_TAKEN', 'Ese correo ya tiene una cuenta en AImargen.');
        }
        throw e;
      }
      const token = randomToken();
      await auth.createToken(Number(created.id), 'invite', sha256(token), INVITE_TTL_MIN);
      const url = `${s.config.APP_URL}/accept-invite?token=${encodeURIComponent(token)}`;
      await s.mailer.send(
        inviteMessage(input.email, input.name, String(tenant?.name ?? 'su negocio'), url),
      );
      await s.audit.log(ctx, {
        action: 'user.invite',
        entity: 'user',
        entityUuid: String(created.uuid),
        after: { name: input.name, email: input.email, role: input.role },
      });
      return (await model.listUsers(ctx.tenantId))
        .map(tenantUserDto)
        .find((u) => u.uuid === String(created.uuid))!;
    },

    async updateUser(ctx: TenantContext, userUuid: string, input: z.infer<typeof updateUserInput>) {
      if (userUuid === ctx.userUuid) {
        throw new AppError(400, 'SELF_UPDATE', 'No puede cambiar su propio rol ni bloquearse.');
      }
      const actorRank = s.roles.rank.get(ctx.role) ?? 0;
      const targetRank = s.roles.rank.get(input.role) ?? 0;
      if (targetRank >= actorRank) {
        throw new AppError(403, 'FORBIDDEN', 'No puede asignar un rol igual o superior al suyo.');
      }
      const users = await model.listUsers(ctx.tenantId);
      const current = users.find((u) => u.uuid === userUuid);
      if (current && (s.roles.rank.get(String(current.role)) ?? 0) >= actorRank) {
        throw new AppError(
          403,
          'FORBIDDEN',
          'No puede modificar a un usuario con rol igual o superior al suyo.',
        );
      }
      // Quien nunca aceptó la invitación (correo sin verificar) vuelve a "invitado", no a "activo".
      const neverAccepted = current?.status === 'invited' || (current && !current.email_verified_at);
      const status = input.status === 'active' && neverAccepted ? 'invited' : input.status;
      const result = await model.updateUser(ctx.tenantId, userUuid, input.role, status);
      await s.audit.log(ctx, {
        action: 'user.update',
        entity: 'user',
        entityUuid: userUuid,
        before: result.before_json,
        after: { role: input.role, status },
      });
      return (await model.listUsers(ctx.tenantId))
        .map(tenantUserDto)
        .find((u) => u.uuid === userUuid)!;
    },

    async audit(ctx: TenantContext, entity: string | null, pageNo: number, pageSize: number) {
      const rows = await model.auditList(ctx.tenantId, entity, pageSize, (pageNo - 1) * pageSize);
      return rows.map(auditDto);
    },
  };
}

export type TenantController = ReturnType<typeof createTenantController>;
