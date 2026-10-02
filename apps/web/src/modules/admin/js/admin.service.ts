import { api, qs } from '../../../core/js/api-client';

/** Capa de datos del panel de plataforma (solo super_admin): tipos de la API y llamadas HTTP. */

export interface AdminMetrics {
  tenantsActive: number;
  tenantsSuspended: number;
  usersActive: number;
  usersActive30d: number;
  signups7d: number;
  signups30d: number;
  aiCallsMonth: number;
  aiCostMonth: string | null;
  aiToolErrorsMonth: number;
  storageBytes: number;
  exportsMonth: number;
  usersLocked: number;
  failedLogins24h: number;
}

export type TenantStatus = 'active' | 'suspended';

export interface AdminTenantRow {
  uuid: string;
  name: string;
  slug: string;
  email: string | null;
  status: string;
  plan: string;
  isDemo: boolean;
  createdAt: string | null;
  lastActivityAt: string | null;
  onboardingCompleted: boolean;
  usersCount: number;
  productsCount: number;
}

export interface AdminTenantPage {
  items: AdminTenantRow[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AdminTenantDetail extends AdminTenantRow {
  legalName: string | null;
  phone: string | null;
  businessType: string | null;
  country: string;
  currency: string;
  usage: {
    ingredients: number;
    products: number;
    purchases: number;
    storageBytes: number;
    exports: number;
    aiCallsMonth: number;
    aiCostMonth: string | null;
  };
  users: Array<{
    uuid: string;
    name: string;
    email: string;
    role: string;
    status: string;
    lastLoginAt: string | null;
  }>;
}

export interface AdminFlag {
  code: string;
  description: string;
  defaultEnabled: boolean;
  override: boolean | null;
  enabled: boolean;
}

export interface AdminUser {
  uuid: string;
  name: string;
  email: string;
  role: string;
  status: string;
  emailVerified: boolean;
  locked: boolean;
  lastLoginAt: string | null;
  createdAt: string | null;
  tenantUuid: string | null;
  tenantName: string | null;
}

export interface AdminAiUsage {
  tenantUuid: string;
  tenantName: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: string | null;
  toolCalls: number;
  toolErrors: number;
}

export interface AdminAuditEntry {
  createdAt: string | null;
  action: string;
  entity: string | null;
  entityUuid: string | null;
  before: unknown;
  after: unknown;
  ip: string | null;
  requestId: string | null;
  userEmail: string | null;
  tenantUuid: string | null;
  tenantName: string | null;
}

export const ADMIN_PAGE_SIZE = 25;

export const adminService = {
  metrics: () => api.get<AdminMetrics>('/admin/metrics'),
  tenants: (p: { q?: string; status?: TenantStatus; page: number }) =>
    api.get<AdminTenantPage>(`/admin/tenants${qs({ ...p, pageSize: ADMIN_PAGE_SIZE })}`),
  tenant: (uuid: string) => api.get<AdminTenantDetail>(`/admin/tenants/${uuid}`),
  setTenantStatus: (uuid: string, status: TenantStatus) =>
    api.post<AdminTenantDetail>(`/admin/tenants/${uuid}/status`, { status }),
  flags: (uuid: string) => api.get<AdminFlag[]>(`/admin/tenants/${uuid}/flags`),
  setFlag: (uuid: string, code: string, enabled: boolean | null) =>
    api.put<AdminFlag[]>(`/admin/tenants/${uuid}/flags/${encodeURIComponent(code)}`, { enabled }),
  users: (q: string) => api.get<AdminUser[]>(`/admin/users${qs({ q })}`),
  aiUsage: (from: string, to: string) =>
    api.get<AdminAiUsage[]>(`/admin/ai-usage${qs({ from, to })}`),
  audit: (p: { tenant?: string; action?: string; page: number }) =>
    api.get<AdminAuditEntry[]>(`/admin/audit${qs({ ...p, pageSize: ADMIN_PAGE_SIZE })}`),
};
