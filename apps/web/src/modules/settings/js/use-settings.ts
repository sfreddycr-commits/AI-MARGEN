import { useMemo, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  changePasswordInput,
  INVITABLE_ROLES,
  inviteUserInput,
  settingsUpdateInput,
  tenantUpdateInput,
  updateUserInput,
} from '@aimargen/schemas';
import { useEntityMutation, useLocalList } from '../../../core/data/js/use-entity';
import { ApiRequestError, errorMessage } from '../../../core/js/api-client';
import {
  fractionToPercentInput,
  percentInputToFraction,
  serverFieldErrors,
  validate,
  type FieldErrors,
} from '../../../core/js/form';
import { useSession } from '../../../core/session/js/session-context';
import type { Tenant, TenantSettings } from '../../../core/session/js/session-types';
import {
  AUDIT_PAGE_SIZE,
  settingsService,
  type Category,
  type CategoryKind,
  type TenantUser,
} from './settings.service';
import { ROLE_RANK, type InvitableRole } from './settings-labels';

/** Controlador del módulo Configuración: estado de pantalla, validación y mutaciones. */

/** Estado de formulario común: errores por campo, error general y manejo de errores del servidor. */
function useFormErrors() {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const onError = (e: unknown) => {
    const fields = serverFieldErrors(e);
    if (fields) setErrors(fields);
    else setFormError(errorMessage(e));
  };
  const reset = () => {
    setErrors({});
    setFormError(null);
  };
  return { errors, setErrors, formError, setFormError, onError, reset };
}

// ---------------------------------------------------------------------------
// Datos del negocio
// ---------------------------------------------------------------------------

export function useTenantProfile() {
  return useQuery({ queryKey: ['api', 'tenant'], queryFn: settingsService.getTenant });
}

export interface BusinessFormValues {
  name: string;
  legalName: string;
  email: string;
  phone: string;
  businessType: string;
  country: string;
  currency: string;
  timezone: string;
}

export function toBusinessValues(t: Tenant): BusinessFormValues {
  return {
    name: t.name,
    legalName: t.legalName ?? '',
    email: t.email ?? '',
    phone: t.phone ?? '',
    businessType: t.businessType ?? 'other',
    country: t.country,
    currency: t.currency,
    timezone: t.timezone,
  };
}

export function useSaveBusiness(tenant: Tenant, onSaved: () => void) {
  const qc = useQueryClient();
  const { reload } = useSession();
  const f = useFormErrors();
  const mutation = useMutation({
    mutationFn: settingsService.updateTenant,
    onSuccess: async (t) => {
      qc.setQueryData(['api', 'tenant'], t);
      await reload().catch(() => null);
      onSaved();
    },
  });
  const submit = (values: BusinessFormValues) => {
    f.reset();
    const v = validate(tenantUpdateInput, {
      ...values,
      email: values.email.trim() || null,
      rowVersion: tenant.rowVersion,
    });
    if (!v.ok) {
      f.setErrors(v.errors);
      return;
    }
    mutation.mutate(v.data, { onError: f.onError });
  };
  return { submit, errors: f.errors, formError: f.formError, saving: mutation.isPending };
}

// ---------------------------------------------------------------------------
// Costeo y márgenes
// ---------------------------------------------------------------------------

export function useCostingSettings() {
  return useQuery({ queryKey: ['api', 'tenant-settings'], queryFn: settingsService.getSettings });
}

export interface CostingFormValues {
  targetMargin: string;
  operatingDays: string;
  roundingScale: string;
  costMethod: TenantSettings['costMethod'];
}

export function toCostingValues(s: TenantSettings): CostingFormValues {
  return {
    targetMargin: fractionToPercentInput(s.targetMargin),
    operatingDays: s.operatingDays === null ? '' : String(s.operatingDays),
    roundingScale: String(s.roundingScale),
    costMethod: s.costMethod,
  };
}

export function useSaveCosting(settings: TenantSettings, onSaved: () => void) {
  const qc = useQueryClient();
  const { reload } = useSession();
  const f = useFormErrors();
  const mutation = useMutation({
    mutationFn: settingsService.updateSettings,
    onSuccess: async (t) => {
      qc.setQueryData(['api', 'tenant-settings'], t.settings);
      qc.setQueryData(['api', 'tenant'], t);
      // Los cálculos (costos, márgenes) dependen de esta configuración.
      void qc.invalidateQueries({ queryKey: ['api'] });
      await reload().catch(() => null);
      onSaved();
    },
  });
  const submit = (values: CostingFormValues) => {
    f.reset();
    const v = validate(settingsUpdateInput, {
      targetMargin: percentInputToFraction(values.targetMargin),
      operatingDays: values.operatingDays.trim() || null,
      roundingScale: Number(values.roundingScale),
      costMethod: values.costMethod,
      rowVersion: settings.rowVersion,
    });
    if (!v.ok) {
      f.setErrors(v.errors);
      return;
    }
    mutation.mutate(v.data, { onError: f.onError });
  };
  return { submit, errors: f.errors, formError: f.formError, saving: mutation.isPending };
}

// ---------------------------------------------------------------------------
// Equipo
// ---------------------------------------------------------------------------

export function useTeam() {
  const { me, can } = useSession();
  const query = useQuery({ queryKey: ['api', 'tenant-users'], queryFn: settingsService.listUsers });
  const myRank = ROLE_RANK[me?.user.role ?? ''] ?? 0;
  const canManage = can('users.manage');
  /** Roles que esta persona puede asignar (siempre por debajo del suyo). */
  const assignableRoles = INVITABLE_ROLES.filter((r) => (ROLE_RANK[r] ?? 0) < myRank);
  const isEditable = (u: TenantUser) =>
    canManage && u.uuid !== me?.user.uuid && (ROLE_RANK[u.role] ?? 0) < myRank;
  const users = useMemo(
    () =>
      [...(query.data ?? [])].sort(
        (a, b) =>
          (ROLE_RANK[b.role] ?? 0) - (ROLE_RANK[a.role] ?? 0) || a.name.localeCompare(b.name, 'es'),
      ),
    [query.data],
  );
  return { ...query, users, canManage, assignableRoles, isEditable, myUuid: me?.user.uuid };
}

export interface InviteFormValues {
  name: string;
  email: string;
  role: InvitableRole | '';
}

export function useInviteUser(onSaved: (u: TenantUser) => void) {
  const qc = useQueryClient();
  const f = useFormErrors();
  const mutation = useMutation({
    mutationFn: settingsService.inviteUser,
    onSuccess: (u) => {
      void qc.invalidateQueries({ queryKey: ['api', 'tenant-users'] });
      onSaved(u);
    },
  });
  const submit = (values: InviteFormValues) => {
    f.reset();
    const v = validate(inviteUserInput, values);
    if (!v.ok) {
      f.setErrors(v.errors);
      return;
    }
    mutation.mutate(v.data, { onError: f.onError });
  };
  return {
    submit,
    errors: f.errors,
    formError: f.formError,
    saving: mutation.isPending,
    reset: f.reset,
  };
}

export function useUpdateUser(onSaved: (u: TenantUser) => void) {
  const qc = useQueryClient();
  const f = useFormErrors();
  const mutation = useMutation({
    mutationFn: ({ uuid, ...input }: { uuid: string; role: string; status: string }) => {
      const v = validate(updateUserInput, input);
      if (!v.ok) throw new Error(Object.values(v.errors)[0]);
      return settingsService.updateUser(uuid, v.data);
    },
    onSuccess: (u) => {
      void qc.invalidateQueries({ queryKey: ['api', 'tenant-users'] });
      onSaved(u);
    },
  });
  const save = (uuid: string, role: string, status: 'active' | 'blocked') => {
    f.reset();
    mutation.mutate({ uuid, role, status }, { onError: f.onError });
  };
  return {
    save,
    formError: f.formError,
    saving: mutation.isPending,
    pendingStatus: mutation.isPending ? mutation.variables?.status : undefined,
    reset: f.reset,
  };
}

// ---------------------------------------------------------------------------
// Categorías
// ---------------------------------------------------------------------------

const ENTITY_OF: Record<CategoryKind, 'ingredient_categories' | 'product_categories'> = {
  ingredient: 'ingredient_categories',
  product: 'product_categories',
};

export function useCategories(kind: CategoryKind) {
  const { can } = useSession();
  const query = useLocalList<Category>(ENTITY_OF[kind]);
  const canWrite = can(kind === 'ingredient' ? 'ingredients.write' : 'products.write');
  return { ...query, items: query.data ?? [], canWrite };
}

export function useSaveCategory(onSaved: (c: Category) => void) {
  const f = useFormErrors();
  const mutation = useEntityMutation<
    { kind: CategoryKind; name: string; existing: Category | null },
    Category
  >({
    entities: ['ingredient_categories', 'product_categories'],
    mutationFn: ({ kind, name, existing }) =>
      existing
        ? settingsService.updateCategory(kind, existing.uuid, name, false)
        : settingsService.createCategory(kind, name),
    onSuccess: onSaved,
  });
  const submit = (kind: CategoryKind, name: string, existing: Category | null) => {
    f.reset();
    if (!name.trim()) {
      f.setErrors({ name: 'Ingrese un nombre.' });
      return;
    }
    mutation.mutate({ kind, name: name.trim(), existing }, { onError: f.onError });
  };
  return {
    submit,
    errors: f.errors,
    formError: f.formError,
    saving: mutation.isPending,
    reset: f.reset,
  };
}

export function useArchiveCategory() {
  return useEntityMutation<{ kind: CategoryKind; category: Category; archived: boolean }, Category>(
    {
      entities: ['ingredient_categories', 'product_categories'],
      mutationFn: ({ kind, category, archived }) =>
        settingsService.updateCategory(kind, category.uuid, category.name, archived),
    },
  );
}

// ---------------------------------------------------------------------------
// Mi cuenta
// ---------------------------------------------------------------------------

/**
 * Cierra la sesión y lleva al login. El `logout()` del núcleo puede quedarse esperando al
 * borrar IndexedDB (deleteDB bloqueado por la conexión abierta); por eso, tras un margen,
 * se recarga en /login: la cookie ya quedó invalidada y la recarga libera la conexión.
 */
export function useSignOut() {
  const { logout } = useSession();
  return async (next = '/login') => {
    await Promise.race([logout(), new Promise((r) => setTimeout(r, 1500))]);
    window.location.assign(next);
  };
}

export interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirm: string;
}

export function useChangePassword(onDone: () => void) {
  const f = useFormErrors();
  const mutation = useMutation({ mutationFn: settingsService.changePassword, onSuccess: onDone });
  const submit = (values: PasswordFormValues) => {
    f.reset();
    const v = validate(changePasswordInput, values);
    const errors: FieldErrors = v.ok ? {} : { ...v.errors };
    if (!values.currentPassword) errors.currentPassword = 'Ingrese su contraseña actual.';
    if (values.confirm !== values.newPassword) errors.confirm = 'Las contraseñas no coinciden.';
    if (values.newPassword && values.newPassword === values.currentPassword)
      errors.newPassword ??= 'La contraseña nueva debe ser distinta de la actual.';
    if (!v.ok || Object.keys(errors).length > 0) {
      f.setErrors(errors);
      return;
    }
    mutation.mutate(v.data, {
      onError: (e) => {
        if (e instanceof ApiRequestError && e.code === 'INVALID_PASSWORD') {
          f.setErrors({ currentPassword: e.message });
        } else f.onError(e);
      },
    });
  };
  return { submit, errors: f.errors, formError: f.formError, saving: mutation.isPending };
}

// ---------------------------------------------------------------------------
// Auditoría
// ---------------------------------------------------------------------------

export function useAuditLog(entity: string | undefined) {
  const query = useInfiniteQuery({
    queryKey: ['api', 'tenant-audit', entity ?? 'all'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => settingsService.audit(pageParam, entity),
    getNextPageParam: (last, pages) =>
      last.length < AUDIT_PAGE_SIZE ? undefined : pages.length + 1,
  });
  const items = useMemo(() => query.data?.pages.flat() ?? [], [query.data]);
  return { ...query, items };
}
