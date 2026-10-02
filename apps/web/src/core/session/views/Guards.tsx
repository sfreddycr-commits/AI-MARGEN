import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { EmptyState } from '../../ui';
import { useSession } from '../js/session-context';
import { FullScreenLoader } from './FullScreenLoader';

/** Rutas de la app: exigen sesión. Sin negocio → onboarding; super admin → panel global. */
export function RequireApp() {
  const { status, me, isSuperAdmin } = useSession();
  const location = useLocation();
  if (status === 'loading') return <FullScreenLoader />;
  if (!me) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (isSuperAdmin && !me.tenant) {
    if (!location.pathname.startsWith('/app/admin')) return <Navigate to="/app/admin" replace />;
    return <Outlet />;
  }
  if (!me.tenant) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

/** Onboarding: requiere sesión y que el negocio aún no esté configurado del todo. */
export function RequireOnboarding() {
  const { status, me } = useSession();
  if (status === 'loading') return <FullScreenLoader />;
  if (!me) return <Navigate to="/login?next=%2Fonboarding" replace />;
  if (me.user.role === 'super_admin') return <Navigate to="/app/admin" replace />;
  if (me.tenant?.onboardingCompleted) return <Navigate to="/app" replace />;
  return <Outlet />;
}

/** Pantallas de acceso (login, registro): si ya hay sesión, a la app. */
export function GuestOnly() {
  const { status, me } = useSession();
  const location = useLocation();
  if (status === 'loading') return <FullScreenLoader />;
  if (me) {
    const next = new URLSearchParams(location.search).get('next');
    const safe = next && next.startsWith('/app') ? next : '/app';
    return <Navigate to={safe} replace />;
  }
  return <Outlet />;
}

/** Restringe una vista a un permiso; muestra un aviso claro en vez de una pantalla rota. */
export function RequirePermission({
  permission,
  children,
}: {
  permission: string | string[];
  children: ReactNode;
}) {
  const { can, isSuperAdmin } = useSession();
  const list = Array.isArray(permission) ? permission : [permission];
  const allowed =
    list.some((p) => can(p)) || (isSuperAdmin && list.includes('platform.admin'));
  if (!allowed) {
    return (
      <EmptyState
        icon="lock"
        title="No tiene acceso a esta sección"
        description="Su rol no incluye este permiso. Pida acceso al dueño o administrador del negocio."
      />
    );
  }
  return <>{children}</>;
}
