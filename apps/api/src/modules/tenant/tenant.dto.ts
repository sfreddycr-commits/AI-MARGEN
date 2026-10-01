import type { Row } from '../../core/db/db.js';
import { bool, dec, iso } from '../../core/http/dto.js';

export function tenantDto(r: Row) {
  return {
    uuid: String(r.uuid),
    name: String(r.name),
    slug: String(r.slug),
    legalName: r.legal_name ?? null,
    email: r.email ?? null,
    phone: r.phone ?? null,
    businessType: r.business_type ?? null,
    country: String(r.country),
    currency: String(r.currency),
    timezone: String(r.timezone),
    status: String(r.status),
    plan: String(r.plan),
    isDemo: bool(r.is_demo),
    onboardingCompleted: !!r.onboarding_completed_at,
    rowVersion: Number(r.row_version),
    createdAt: iso(r.created_at),
    settings: {
      targetMargin: dec(r.default_target_margin),
      operatingDays:
        r.operating_days_per_month === null ? null : Number(r.operating_days_per_month),
      roundingScale: Number(r.rounding_scale),
      costMethod: String(r.cost_method) as 'last_purchase' | 'weighted_average',
      rowVersion: Number(r.settings_row_version),
    },
  };
}

export type TenantDto = ReturnType<typeof tenantDto>;

export function tenantUserDto(r: Row) {
  return {
    uuid: String(r.uuid),
    name: String(r.name),
    email: String(r.email),
    role: String(r.role),
    status: String(r.status),
    emailVerified: !!r.email_verified_at,
    lastLoginAt: iso(r.last_login_at),
    createdAt: iso(r.created_at),
  };
}

export function auditDto(r: Row) {
  return {
    createdAt: iso(r.created_at),
    action: String(r.action),
    entity: r.entity ?? null,
    entityUuid: r.entity_uuid ?? null,
    before: r.before_json ?? null,
    after: r.after_json ?? null,
    userUuid: r.user_uuid ?? null,
    userName: r.user_name ?? null,
  };
}
