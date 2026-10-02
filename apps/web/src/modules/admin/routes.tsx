import { lazy } from 'react';
import type { RouteObject } from 'react-router';
import { RequirePermission } from '../../core/session/views/Guards';

const AdminOverviewView = lazy(() => import('./views/AdminOverviewView'));
const AdminTenantsView = lazy(() => import('./views/AdminTenantsView'));
const AdminTenantDetailView = lazy(() => import('./views/AdminTenantDetailView'));
const AdminUsersView = lazy(() => import('./views/AdminUsersView'));
const AdminAiView = lazy(() => import('./views/AdminAiView'));
const AdminAuditView = lazy(() => import('./views/AdminAuditView'));

const guard = (el: React.ReactNode) => (
  <RequirePermission permission="platform.admin">{el}</RequirePermission>
);

/** Rutas del panel de plataforma (relativas a /app). Solo super_admin (SOP §11). */
export const adminRoutes: RouteObject[] = [
  { path: 'admin', element: guard(<AdminOverviewView />) },
  { path: 'admin/tenants', element: guard(<AdminTenantsView />) },
  { path: 'admin/tenants/:uuid', element: guard(<AdminTenantDetailView />) },
  { path: 'admin/users', element: guard(<AdminUsersView />) },
  { path: 'admin/ai', element: guard(<AdminAiView />) },
  { path: 'admin/audit', element: guard(<AdminAuditView />) },
];
