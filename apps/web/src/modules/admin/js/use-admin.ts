import { useEffect, useMemo, useState } from 'react';
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { ADMIN_PAGE_SIZE, adminService, type TenantStatus } from './admin.service';

/** Controlador del panel de plataforma: filtros, búsquedas y mutaciones. */

/** Valor con retardo para no consultar la API en cada tecla. */
export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function useAdminMetrics() {
  return useQuery({ queryKey: ['api', 'admin', 'metrics'], queryFn: adminService.metrics });
}

export type TenantFilter = 'all' | TenantStatus;

export function useAdminTenants() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<TenantFilter>('all');
  const [page, setPage] = useState(1);
  const term = useDebounced(q.trim());
  const query = useQuery({
    queryKey: ['api', 'admin', 'tenants', term, status, page],
    queryFn: () =>
      adminService.tenants({
        q: term || undefined,
        status: status === 'all' ? undefined : status,
        page,
      }),
    placeholderData: keepPreviousData,
  });
  const total = query.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  return {
    ...query,
    items: query.data?.items ?? [],
    total,
    page,
    pages,
    setPage,
    q,
    setQ: (v: string) => {
      setQ(v);
      setPage(1);
    },
    status,
    setStatus: (v: TenantFilter) => {
      setStatus(v);
      setPage(1);
    },
    filtered: !!term || status !== 'all',
  };
}

export function useAdminTenant(uuid: string | undefined) {
  return useQuery({
    queryKey: ['api', 'admin', 'tenant', uuid],
    enabled: !!uuid,
    queryFn: () => adminService.tenant(uuid!),
  });
}

export function useSetTenantStatus(uuid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: TenantStatus) => adminService.setTenantStatus(uuid, status),
    onSuccess: (t) => {
      qc.setQueryData(['api', 'admin', 'tenant', uuid], t);
      void qc.invalidateQueries({ queryKey: ['api', 'admin', 'tenants'] });
      void qc.invalidateQueries({ queryKey: ['api', 'admin', 'metrics'] });
      void qc.invalidateQueries({ queryKey: ['api', 'admin', 'audit'] });
    },
  });
}

export type FlagMode = 'default' | 'on' | 'off';

export const flagModeOf = (override: boolean | null): FlagMode =>
  override === null ? 'default' : override ? 'on' : 'off';

export function useTenantFlags(uuid: string | undefined) {
  const qc = useQueryClient();
  const key = ['api', 'admin', 'flags', uuid];
  const query = useQuery({
    queryKey: key,
    enabled: !!uuid,
    queryFn: () => adminService.flags(uuid!),
  });
  const mutation = useMutation({
    mutationFn: ({ code, mode }: { code: string; mode: FlagMode }) =>
      adminService.setFlag(uuid!, code, mode === 'default' ? null : mode === 'on'),
    onSuccess: (flags) => {
      qc.setQueryData(key, flags);
      void qc.invalidateQueries({ queryKey: ['api', 'admin', 'audit'] });
    },
  });
  return { ...query, items: query.data ?? [], mutation };
}

export function useAdminUsers() {
  const [q, setQ] = useState('');
  const term = useDebounced(q.trim());
  const query = useQuery({
    queryKey: ['api', 'admin', 'users', term],
    queryFn: () => adminService.users(term),
    placeholderData: keepPreviousData,
  });
  return { ...query, items: query.data ?? [], q, setQ, term };
}

/** "2026-10" → primer y último día del mes (el último se limita a hoy). */
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const last = new Date(y, m, 0).getDate();
  const p = (n: number) => String(n).padStart(2, '0');
  return { from: `${y}-${p(m)}-01`, to: `${y}-${p(m)}-${p(last)}` };
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function useAiUsage() {
  const [month, setMonth] = useState(currentMonth());
  const { from, to } = monthRange(month || currentMonth());
  const query = useQuery({
    queryKey: ['api', 'admin', 'ai', from, to],
    queryFn: () => adminService.aiUsage(from, to),
    placeholderData: keepPreviousData,
  });
  const items = useMemo(
    () => [...(query.data ?? [])].sort((a, b) => Number(b.costUsd ?? 0) - Number(a.costUsd ?? 0)),
    [query.data],
  );
  const totals = useMemo(
    () =>
      items.reduce(
        (acc, r) => ({
          calls: acc.calls + r.calls,
          tokens: acc.tokens + r.inputTokens + r.outputTokens,
          toolErrors: acc.toolErrors + r.toolErrors,
        }),
        { calls: 0, tokens: 0, toolErrors: 0 },
      ),
    [items],
  );
  return { ...query, items, totals, month, setMonth };
}

export function useAdminAudit(initial: { tenant?: string }) {
  const [action, setAction] = useState('');
  const [tenant, setTenant] = useState(initial.tenant);
  const term = useDebounced(action.trim());
  const query = useInfiniteQuery({
    queryKey: ['api', 'admin', 'audit', term, tenant ?? ''],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      adminService.audit({ action: term || undefined, tenant, page: pageParam }),
    getNextPageParam: (last, pages) =>
      last.length < ADMIN_PAGE_SIZE ? undefined : pages.length + 1,
  });
  const items = useMemo(() => query.data?.pages.flat() ?? [], [query.data]);
  return { ...query, items, action, setAction, tenant, clearTenant: () => setTenant(undefined) };
}
