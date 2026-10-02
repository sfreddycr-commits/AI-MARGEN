import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiRequestError, setSessionExpiredHandler } from '../../js/api-client';
import { clearAllLocalData, localStore, openLocalDb, type LocalStore } from '../../js/local-db';
import { SyncEngine, type ChangeSet } from '../../js/sync-engine';
import { SessionContext, type SessionApi, type SessionStatus } from '../js/session-context';
import type { Me } from '../js/session-types';

/**
 * Sesión del usuario y cache local.
 * - Carga /auth/me al iniciar (la renovación del token es automática en api-client).
 * - Con negocio activo abre la base IndexedDB del par negocio+usuario y arranca la sincronización.
 * - Al cerrar sesión (o si expira) borra toda la información local del dispositivo.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [me, setMeState] = useState<Me | null>(null);
  const [store, setStore] = useState<LocalStore | null>(null);
  const [engine, setEngine] = useState<SyncEngine | null>(null);
  const readyRef = useRef<Promise<void>>(Promise.resolve());
  const meRef = useRef<Me | null>(null);

  const setMe = useCallback((next: Me | null) => {
    meRef.current = next;
    setMeState(next);
    setStatus(next ? 'authenticated' : 'anonymous');
  }, []);

  const reload = useCallback(async () => {
    try {
      const m = await api.get<Me>('/auth/me');
      setMe(m);
      return m;
    } catch (e) {
      if (e instanceof ApiRequestError && (e.status === 401 || e.status === 403)) {
        setMe(null);
        return null;
      }
      // Sin conexión: se mantiene lo que había (la app puede seguir mostrando el cache).
      if (meRef.current === null) setStatus('anonymous');
      throw e;
    }
  }, [setMe]);

  useEffect(() => {
    // Carga inicial de la sesión: el setState ocurre tras la respuesta (asíncrono).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload().catch(() => undefined);
  }, [reload]);

  const wipe = useCallback(async () => {
    const current = meRef.current;
    engine?.stop();
    store?.close();
    setEngine(null);
    setStore(null);
    qc.clear();
    await clearAllLocalData(
      current?.tenant
        ? { tenantUuid: current.tenant.uuid, userUuid: current.user.uuid }
        : undefined,
    ).catch(() => undefined);
  }, [engine, store, qc]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', undefined, { noRefresh: true });
    } catch {
      // Aunque falle la red, se limpia el dispositivo.
    }
    await wipe();
    setMe(null);
  }, [setMe, wipe]);

  // Sesión expirada (refresh rechazado): limpiar y mandar al login.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      if (meRef.current) {
        void wipe().then(() => setMe(null));
      }
    });
    return () => setSessionExpiredHandler(null);
  }, [setMe, wipe]);

  // Cache local + sincronización por negocio y usuario.
  const tenantUuid = me?.tenant?.uuid ?? null;
  const userUuid = me?.user.uuid ?? null;
  const permissionsKey = me?.permissions.join(',') ?? '';
  useEffect(() => {
    if (!tenantUuid || !userUuid) return;
    let cancelled = false;
    let stop: (() => void) | null = null;
    let opened: LocalStore | null = null;
    let release!: () => void;
    readyRef.current = new Promise<void>((r) => (release = r));

    (async () => {
      let st: LocalStore | null = null;
      let db: Awaited<ReturnType<typeof openLocalDb>> | null = null;
      try {
        db = await openLocalDb(tenantUuid, userUuid);
        st = localStore(db);
        opened = st;
      } catch {
        // IndexedDB no disponible (modo privado estricto): las vistas consultan la API directamente.
        release();
        return;
      }
      if (cancelled) {
        db.close();
        return;
      }
      const versions = await api
        .get<{ versions: Record<string, number>; entities: string[] }>('/sync/versions')
        .catch(() => null);
      const entities = versions?.entities ?? [];
      const eng = new SyncEngine({
        store: st,
        entities,
        transport: {
          getVersions: async () =>
            (await api.get<{ versions: Record<string, number> }>('/sync/versions')).versions,
          getChanges: (entity, cursor, rewind) =>
            api.get<ChangeSet>(
              `/sync/changes?entity=${encodeURIComponent(entity)}${
                cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''
              }${rewind ? '&rewind=true' : ''}`,
            ),
        },
        onEntityChanged: (entity) => {
          void qc.invalidateQueries({ queryKey: ['local', entity] });
          void qc.invalidateQueries({ queryKey: ['api', entity] });
          if (entity === 'ingredients')
            void qc.invalidateQueries({ queryKey: ['api', 'products'] });
          void qc.invalidateQueries({ queryKey: ['api', 'dashboard'] });
        },
      });
      if (cancelled) return;
      setStore(st);
      setEngine(eng);
      stop = eng.start();
      void eng.sync('start').finally(release);
    })().catch(() => release());

    return () => {
      cancelled = true;
      stop?.();
      opened?.close();
    };
  }, [tenantUuid, userUuid, permissionsKey, qc]);

  const value = useMemo<SessionApi>(() => {
    const perms = new Set(me?.permissions ?? []);
    return {
      status,
      me,
      reload,
      setMe,
      logout,
      can: (p) => perms.has(p),
      feature: (code) => me?.flags[code] !== false,
      store,
      engine,
      whenReady: () => readyRef.current,
      isSuperAdmin: me?.user.role === 'super_admin',
    };
  }, [status, me, reload, setMe, logout, store, engine]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
