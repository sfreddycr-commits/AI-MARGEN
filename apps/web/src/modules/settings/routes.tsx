import { lazy } from 'react';
import type { RouteObject } from 'react-router';
import { RequirePermission } from '../../core/session/views/Guards';

const SettingsHomeView = lazy(() => import('./views/SettingsHomeView'));
const BusinessView = lazy(() => import('./views/BusinessView'));
const CostingView = lazy(() => import('./views/CostingView'));
const UsersView = lazy(() => import('./views/UsersView'));
const CategoriesView = lazy(() => import('./views/CategoriesView'));
const AccountView = lazy(() => import('./views/AccountView'));
const AuditView = lazy(() => import('./views/AuditView'));

/** Rutas del módulo Configuración (relativas a /app). */
export const settingsRoutes: RouteObject[] = [
  {
    path: 'settings',
    element: (
      <RequirePermission permission="settings.read">
        <SettingsHomeView />
      </RequirePermission>
    ),
  },
  {
    path: 'settings/business',
    element: (
      <RequirePermission permission="tenant.read">
        <BusinessView />
      </RequirePermission>
    ),
  },
  {
    path: 'settings/costing',
    element: (
      <RequirePermission permission="settings.read">
        <CostingView />
      </RequirePermission>
    ),
  },
  {
    path: 'settings/users',
    element: (
      <RequirePermission permission="users.read">
        <UsersView />
      </RequirePermission>
    ),
  },
  {
    path: 'settings/categories',
    element: (
      <RequirePermission permission="tenant.read">
        <CategoriesView />
      </RequirePermission>
    ),
  },
  // Mi cuenta: disponible para cualquier usuario con sesión.
  { path: 'settings/account', element: <AccountView /> },
  {
    path: 'settings/audit',
    element: (
      <RequirePermission permission="audit.read">
        <AuditView />
      </RequirePermission>
    ),
  },
];
