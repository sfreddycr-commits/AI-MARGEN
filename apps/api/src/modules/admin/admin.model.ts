import type { Db, Row } from '../../core/db/db.js';

/** Modelo del panel super_admin (SOP §11). SPs globales declarados con "scope: global". */
export function createAdminModel(db: Db) {
  return {
    tenants: (q: string | null, status: string | null, limit: number, offset: number) =>
      db.call<Row>('sp_admin_tenant_list', [q, status, limit, offset]),
    tenant: (uuid: string) => db.call<Row>('sp_admin_tenant_get', [uuid]),
    setTenantStatus: async (uuid: string, status: string) =>
      (await db.callOne<Row>('sp_admin_tenant_set_status', [uuid, status]))[0]!,
    users: (q: string | null, limit: number) => db.callOne<Row>('sp_admin_user_search', [q, limit]),
    metrics: async () => (await db.callOne<Row>('sp_admin_metrics'))[0]!,
    aiUsage: (from: string, to: string) => db.callOne<Row>('sp_admin_ai_usage', [from, to]),
    audit: (tenantUuid: string | null, action: string | null, limit: number, offset: number) =>
      db.callOne<Row>('sp_admin_audit_list', [tenantUuid, action, limit, offset]),
    flags: (tenantUuid: string) => db.callOne<Row>('sp_admin_flags_list', [tenantUuid]),
    setFlag: async (tenantUuid: string, code: string, enabled: boolean | null) =>
      (
        await db.callOne<Row>('sp_admin_flag_set', [
          tenantUuid,
          code,
          enabled === null ? null : enabled ? 1 : 0,
        ])
      )[0]!,
  };
}

export type AdminModel = ReturnType<typeof createAdminModel>;
