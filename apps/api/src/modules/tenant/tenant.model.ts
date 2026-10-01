import type { Db, Row } from '../../core/db/db.js';

/** Modelo del módulo tenant: recibe datos y los envía a SPs. Sin lógica (ADR-0003). */
export function createTenantModel(db: Db) {
  return {
    async create(p: {
      userId: number;
      name: string;
      slug: string;
      businessType: string;
      country: string;
      currency: string;
      timezone: string;
      targetMargin: string | null;
      operatingDays: number | null;
      isDemo?: boolean;
    }): Promise<{ id: number; uuid: string }> {
      const [row] = await db.callOne<Row>('sp_tenant_create', [
        p.userId,
        p.name,
        p.slug,
        p.businessType,
        p.country,
        p.currency,
        p.timezone,
        p.targetMargin,
        p.operatingDays,
        p.isDemo ? 1 : 0,
      ]);
      return { id: Number(row!.id), uuid: String(row!.uuid) };
    },
    async get(tenantId: number): Promise<Row | null> {
      return (await db.callOne<Row>('sp_tenant_get', [tenantId]))[0] ?? null;
    },
    async update(
      tenantId: number,
      p: {
        name: string;
        legalName: string | null;
        email: string | null;
        phone: string | null;
        businessType: string;
        country: string;
        currency: string;
        timezone: string;
        rowVersion: number;
      },
    ): Promise<void> {
      await db.call('sp_tenant_update', [
        tenantId,
        p.name,
        p.legalName,
        p.email,
        p.phone,
        p.businessType,
        p.country,
        p.currency,
        p.timezone,
        p.rowVersion,
      ]);
    },
    async updateSettings(
      tenantId: number,
      p: {
        targetMargin: string | null;
        operatingDays: number | null;
        roundingScale: number;
        costMethod: string;
        rowVersion: number;
      },
    ): Promise<void> {
      await db.call('sp_tenant_settings_update', [
        tenantId,
        p.targetMargin,
        p.operatingDays,
        p.roundingScale,
        p.costMethod,
        p.rowVersion,
      ]);
    },
    async completeOnboarding(tenantId: number): Promise<void> {
      await db.call('sp_tenant_onboarding_complete', [tenantId]);
    },
    async flags(tenantId: number): Promise<Row[]> {
      return db.callOne<Row>('sp_tenant_flags', [tenantId]);
    },
    async listUsers(tenantId: number): Promise<Row[]> {
      return db.callOne<Row>('sp_tenant_user_list', [tenantId]);
    },
    async inviteUser(
      tenantId: number,
      p: { name: string; email: string; role: string; passwordHash: string },
    ): Promise<Row> {
      const [row] = await db.callOne<Row>('sp_tenant_user_invite', [
        tenantId,
        p.name,
        p.email,
        p.role,
        p.passwordHash,
      ]);
      return row!;
    },
    async updateUser(
      tenantId: number,
      userUuid: string,
      role: string,
      status: string,
    ): Promise<Row> {
      const [row] = await db.callOne<Row>('sp_tenant_user_update', [
        tenantId,
        userUuid,
        role,
        status,
      ]);
      return row!;
    },
    async auditList(
      tenantId: number,
      entity: string | null,
      limit: number,
      offset: number,
    ): Promise<Row[]> {
      return db.callOne<Row>('sp_audit_list', [tenantId, entity, limit, offset]);
    },
  };
}

export type TenantModel = ReturnType<typeof createTenantModel>;
