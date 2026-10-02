import type { z } from 'zod';
import type {
  changePasswordInput,
  inviteUserInput,
  settingsUpdateInput,
  tenantUpdateInput,
  updateUserInput,
} from '@aimargen/schemas';
import { api, qs } from '../../../core/js/api-client';
import type { Tenant, TenantSettings } from '../../../core/session/js/session-types';

/** Capa de datos del módulo Configuración: tipos de la API y llamadas HTTP. */

export type TenantUpdate = z.output<typeof tenantUpdateInput>;
export type SettingsUpdate = z.output<typeof settingsUpdateInput>;
export type InviteUser = z.output<typeof inviteUserInput>;
export type UpdateUser = z.output<typeof updateUserInput>;
export type ChangePassword = z.output<typeof changePasswordInput>;

export interface TenantUser {
  uuid: string;
  name: string;
  email: string;
  role: string;
  status: string;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string | null;
}

export interface AuditEntry {
  createdAt: string | null;
  action: string;
  entity: string | null;
  entityUuid: string | null;
  before: unknown;
  after: unknown;
  userUuid: string | null;
  userName: string | null;
}

export type CategoryKind = 'ingredient' | 'product';

export interface Category {
  uuid: string;
  name: string;
  rowVersion: number;
  updatedAt: string | null;
  archived: boolean;
}

export const AUDIT_PAGE_SIZE = 25;

export const settingsService = {
  getTenant: () => api.get<Tenant>('/tenant'),
  updateTenant: (input: TenantUpdate) => api.patch<Tenant>('/tenant', input),
  getSettings: () => api.get<TenantSettings>('/tenant/settings'),
  updateSettings: (input: SettingsUpdate) => api.patch<Tenant>('/tenant/settings', input),

  listUsers: () => api.get<TenantUser[]>('/tenant/users'),
  inviteUser: (input: InviteUser) => api.post<TenantUser>('/tenant/users', input),
  updateUser: (uuid: string, input: UpdateUser) =>
    api.patch<TenantUser>(`/tenant/users/${uuid}`, input),

  audit: (page: number, entity?: string) =>
    api.get<AuditEntry[]>(`/tenant/audit${qs({ page, pageSize: AUDIT_PAGE_SIZE, entity })}`),

  createCategory: (kind: CategoryKind, name: string) =>
    api.post<Category>('/categories', { kind, name }),
  updateCategory: (kind: CategoryKind, uuid: string, name: string, archived: boolean) =>
    api.patch<Category>(`/categories/${uuid}${qs({ kind })}`, { name, archived }),

  changePassword: (input: ChangePassword) => api.post<{ ok: true }>('/auth/change-password', input),
};
