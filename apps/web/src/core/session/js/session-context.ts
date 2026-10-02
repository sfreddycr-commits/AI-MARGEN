import { createContext, useContext } from 'react';
import type { LocalStore } from '../../js/local-db';
import type { SyncEngine } from '../../js/sync-engine';
import type { Me } from './session-types';

export type SessionStatus = 'loading' | 'anonymous' | 'authenticated';

export interface SessionApi {
  status: SessionStatus;
  me: Me | null;
  /** Vuelve a leer /auth/me (tras onboarding, cambios de negocio o permisos). */
  reload: () => Promise<Me | null>;
  /** Fija la sesión con la respuesta del login. */
  setMe: (me: Me) => void;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;
  /** Función habilitada para el negocio (feature flag). Sin flag definido = habilitada. */
  feature: (code: string) => boolean;
  /** Cache local (null mientras se abre o si IndexedDB no está disponible). */
  store: LocalStore | null;
  engine: SyncEngine | null;
  /** Se resuelve cuando la primera sincronización terminó (o falló). */
  whenReady: () => Promise<void>;
  isSuperAdmin: boolean;
}

export const SessionContext = createContext<SessionApi | null>(null);

export function useSession(): SessionApi {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession debe usarse dentro de <SessionProvider>');
  return ctx;
}

/** Atajo: la sesión ya autenticada con negocio (para vistas bajo /app). */
export function useTenant() {
  const s = useSession();
  const tenant = s.me?.tenant;
  if (!tenant) throw new Error('useTenant requiere un negocio activo');
  return { ...s, tenant, currency: tenant.currency };
}
