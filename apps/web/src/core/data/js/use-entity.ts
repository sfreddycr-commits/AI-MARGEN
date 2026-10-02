import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../js/api-client';
import { useSession } from '../../session/js/session-context';

/**
 * Acceso a datos con cache local (ADR-0007).
 *
 * - Listados frecuentes (ingredientes, proveedores, productos, costos fijos, escenarios,
 *   categorías) se leen de IndexedDB, que la sincronización mantiene al día.
 * - Si IndexedDB no está disponible, se consulta la API directamente.
 * - Toda mutación confirmada por el servidor se refleja de inmediato en el cache
 *   (write-through) y dispara una sincronización por diferencias para traer efectos
 *   secundarios (ej. recalcular el costo de productos al cambiar un ingrediente).
 */

export type SyncEntity =
  | 'ingredients'
  | 'suppliers'
  | 'products'
  | 'fixed_costs'
  | 'scenarios'
  | 'ingredient_categories'
  | 'product_categories';

interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Descarga todas las páginas de un listado de la API (respaldo sin IndexedDB). */
export async function fetchAllPages<T>(path: string): Promise<T[]> {
  const sep = path.includes('?') ? '&' : '?';
  const out: T[] = [];
  for (let page = 1; page <= 50; page++) {
    const res = await api.get<Page<T> | T[]>(`${path}${sep}page=${page}&pageSize=100`);
    if (Array.isArray(res)) return res;
    out.push(...res.items);
    if (out.length >= res.total || res.items.length === 0) break;
  }
  return out;
}

/** Ruta de respaldo para cada entidad sincronizada. */
const FALLBACK_PATH: Record<SyncEntity, string> = {
  ingredients: '/ingredients?filter=active',
  suppliers: '/suppliers',
  products: '/products',
  fixed_costs: '/fixed-costs',
  scenarios: '/scenarios',
  ingredient_categories: '/categories?kind=ingredient',
  product_categories: '/categories?kind=product',
};

interface WithArchived {
  archived?: boolean;
}

/**
 * Lista local de una entidad, ordenada por nombre. Los archivados se excluyen salvo que se pidan.
 */
export function useLocalList<T extends WithArchived & { name?: string }>(
  entity: SyncEntity,
  opts: { includeArchived?: boolean; enabled?: boolean } = {},
) {
  const { store, whenReady } = useSession();
  return useQuery({
    queryKey: ['local', entity, store ? 'idb' : 'api', !!opts.includeArchived],
    enabled: opts.enabled ?? true,
    queryFn: async (): Promise<T[]> => {
      let rows: T[];
      if (store) {
        await whenReady();
        rows = await store.list<T>(entity);
        const state = await store.getSyncState(entity);
        // Aún sin sincronizar (primer uso sin conexión estable): se consulta la API.
        if (!state && rows.length === 0) rows = await fetchAllPages<T>(FALLBACK_PATH[entity]);
      } else {
        rows = await fetchAllPages<T>(FALLBACK_PATH[entity]);
      }
      if (!opts.includeArchived) rows = rows.filter((r) => !r.archived);
      return rows.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'es'));
    },
    staleTime: Infinity,
  });
}

/** Un registro del cache local (o de la API si no está). */
export function useLocalItem<T>(entity: SyncEntity, uuid: string | undefined, apiPath: string) {
  const { store, whenReady } = useSession();
  return useQuery({
    queryKey: ['local', entity, 'item', uuid],
    enabled: !!uuid,
    queryFn: async (): Promise<T> => {
      if (store) {
        await whenReady();
        const hit = await store.get<T>(entity, uuid!);
        if (hit) return hit;
      }
      return api.get<T>(apiPath);
    },
  });
}

/** Consulta directa a la API (detalles, historiales, cálculos). */
export function useApi<T>(key: unknown[], path: string | null, opts: { staleTime?: number } = {}) {
  return useQuery({
    queryKey: ['api', ...key],
    enabled: path !== null,
    queryFn: () => api.get<T>(path!),
    staleTime: opts.staleTime,
  });
}

interface MutationOptions<TVars, TRes> {
  mutationFn: (vars: TVars) => Promise<TRes>;
  /** Entidades afectadas: se actualiza el cache y se invalidan sus consultas. */
  entities: SyncEntity[];
  /** Además de las entidades, otras consultas de la API a invalidar (ej. 'dashboard'). */
  invalidate?: string[];
  onSuccess?: (res: TRes, vars: TVars) => void;
}

/** Mutación con write-through al cache local y sincronización posterior. */
export function useEntityMutation<TVars, TRes>(opts: MutationOptions<TVars, TRes>) {
  const qc = useQueryClient();
  const { engine } = useSession();
  return useMutation({
    mutationFn: opts.mutationFn,
    onSuccess: async (res, vars) => {
      const first = opts.entities[0];
      const r = res as unknown as { uuid?: string; updatedAt?: string; archived?: boolean } | null;
      if (engine && first && r?.uuid && r.updatedAt) {
        await engine.applyLocalWrite(first, r.uuid, r, r.updatedAt).catch(() => undefined);
      }
      for (const e of opts.entities) {
        void qc.invalidateQueries({ queryKey: ['local', e] });
        void qc.invalidateQueries({ queryKey: ['api', e] });
      }
      for (const k of opts.invalidate ?? []) void qc.invalidateQueries({ queryKey: ['api', k] });
      void qc.invalidateQueries({ queryKey: ['api', 'dashboard'] });
      void engine?.sync('manual');
      opts.onSuccess?.(res, vars);
    },
  });
}
