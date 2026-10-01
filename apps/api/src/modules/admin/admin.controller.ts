import { AppError } from '../../core/http/app-error.js';
import { DbError } from '../../core/db/db-error.js';
import { bool, dec, iso, search } from '../../core/http/dto.js';
import type { Row } from '../../core/db/db.js';
import type { RequestContext } from '../../core/http/request-context.js';
import type { Services } from '../../core/services.js';
import type { AdminModel } from './admin.model.js';

const tenantRow = (r: Row) => ({
  uuid: String(r.uuid),
  name: String(r.name),
  slug: String(r.slug),
  email: r.email ?? null,
  status: String(r.status),
  plan: String(r.plan),
  isDemo: bool(r.is_demo),
  createdAt: iso(r.created_at),
  lastActivityAt: iso(r.last_activity_at),
  onboardingCompleted: !!r.onboarding_completed_at,
  usersCount: Number(r.users_count ?? 0),
  productsCount: Number(r.products_count ?? 0),
});

/**
 * Panel administrativo global (SOP §11). Solo super_admin. Toda acción queda auditada.
 * No expone datos de recetas ni costos de los negocios: solo métricas de uso.
 */
export function createAdminController(model: AdminModel, s: Services) {
  return {
    async tenants(q: { q?: string; status?: string; page: number; pageSize: number }) {
      const [rows, total] = await model.tenants(
        search(q.q),
        q.status ?? null,
        q.pageSize,
        (q.page - 1) * q.pageSize,
      );
      return {
        items: (rows ?? []).map(tenantRow),
        page: q.page,
        pageSize: q.pageSize,
        total: Number(total?.[0]?.total ?? 0),
      };
    },

    async tenant(uuid: string) {
      try {
        const [t, users] = await model.tenant(uuid);
        const r = t?.[0];
        if (!r) throw new AppError(404, 'NOT_FOUND', 'No se encontró el negocio.');
        return {
          ...tenantRow(r),
          legalName: r.legal_name ?? null,
          phone: r.phone ?? null,
          businessType: r.business_type ?? null,
          country: String(r.country),
          currency: String(r.currency),
          usage: {
            ingredients: Number(r.ingredients_count),
            products: Number(r.products_count),
            purchases: Number(r.purchases_count),
            storageBytes: Number(r.storage_bytes),
            exports: Number(r.exports_count),
            aiCallsMonth: Number(r.ai_calls_month),
            aiCostMonth: dec(r.ai_cost_month),
          },
          users: (users ?? []).map((u) => ({
            uuid: String(u.uuid),
            name: String(u.name),
            email: String(u.email),
            role: String(u.role),
            status: String(u.status),
            lastLoginAt: iso(u.last_login_at),
          })),
        };
      } catch (e) {
        if (e instanceof DbError && e.code === 'ERR_NOT_FOUND')
          throw new AppError(404, 'NOT_FOUND', 'No se encontró el negocio.');
        throw e;
      }
    },

    async setTenantStatus(ctx: RequestContext, uuid: string, status: 'active' | 'suspended') {
      let r: Row;
      try {
        r = await model.setTenantStatus(uuid, status);
      } catch (e) {
        if (e instanceof DbError && e.code === 'ERR_NOT_FOUND')
          throw new AppError(404, 'NOT_FOUND', 'No se encontró el negocio.');
        throw e;
      }
      await s.audit.log(ctx, {
        action: status === 'suspended' ? 'admin.tenant_suspend' : 'admin.tenant_activate',
        entity: 'tenant',
        entityUuid: uuid,
        before: { status: r.before_status },
        after: { status },
      });
      return this.tenant(uuid);
    },

    async users(q: string | undefined) {
      return (await model.users(search(q), 50)).map((u) => ({
        uuid: String(u.uuid),
        name: String(u.name),
        email: String(u.email),
        role: String(u.role),
        status: String(u.status),
        emailVerified: !!u.email_verified_at,
        locked: bool(u.is_locked),
        lastLoginAt: iso(u.last_login_at),
        createdAt: iso(u.created_at),
        tenantUuid: u.tenant_uuid ?? null,
        tenantName: u.tenant_name ?? null,
      }));
    },

    async metrics() {
      const m = await model.metrics();
      return {
        tenantsActive: Number(m.tenants_active),
        tenantsSuspended: Number(m.tenants_suspended),
        usersActive: Number(m.users_active),
        usersActive30d: Number(m.users_active_30d),
        signups7d: Number(m.signups_7d),
        signups30d: Number(m.signups_30d),
        aiCallsMonth: Number(m.ai_calls_month),
        aiCostMonth: dec(m.ai_cost_month),
        aiToolErrorsMonth: Number(m.ai_tool_errors_month),
        storageBytes: Number(m.storage_bytes),
        exportsMonth: Number(m.exports_month),
        usersLocked: Number(m.users_locked),
        failedLogins24h: Number(m.failed_logins_24h),
      };
    },

    async aiUsage(from: string, to: string) {
      return (await model.aiUsage(from, to)).map((r) => ({
        tenantUuid: String(r.tenant_uuid),
        tenantName: String(r.tenant_name),
        calls: Number(r.calls),
        inputTokens: Number(r.input_tokens),
        outputTokens: Number(r.output_tokens),
        costUsd: dec(r.cost_usd),
        toolCalls: Number(r.tool_calls),
        toolErrors: Number(r.tool_errors),
      }));
    },

    async audit(q: { tenant?: string; action?: string; page: number; pageSize: number }) {
      return (
        await model.audit(q.tenant ?? null, q.action ?? null, q.pageSize, (q.page - 1) * q.pageSize)
      ).map((a) => ({
        createdAt: iso(a.created_at),
        action: String(a.action),
        entity: a.entity ?? null,
        entityUuid: a.entity_uuid ?? null,
        before: a.before_json ?? null,
        after: a.after_json ?? null,
        ip: a.ip ?? null,
        requestId: a.request_id ?? null,
        userEmail: a.user_email ?? null,
        tenantUuid: a.tenant_uuid ?? null,
        tenantName: a.tenant_name ?? null,
      }));
    },

    async flags(tenantUuid: string) {
      return (await model.flags(tenantUuid)).map((f) => ({
        code: String(f.code),
        description: String(f.description),
        defaultEnabled: bool(f.default_enabled),
        override: f.tenant_override === null ? null : bool(f.tenant_override),
        enabled: bool(f.enabled),
      }));
    },

    async setFlag(ctx: RequestContext, tenantUuid: string, code: string, enabled: boolean | null) {
      try {
        await model.setFlag(tenantUuid, code, enabled);
      } catch (e) {
        if (e instanceof DbError && e.code === 'ERR_NOT_FOUND')
          throw new AppError(404, 'NOT_FOUND', 'No se encontró el negocio o la función.');
        throw e;
      }
      await s.audit.log(ctx, {
        action: 'admin.flag_set',
        entity: 'tenant',
        entityUuid: tenantUuid,
        after: { code, enabled },
      });
      return this.flags(tenantUuid);
    },
  };
}

export type AdminController = ReturnType<typeof createAdminController>;
