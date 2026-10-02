import { lazy } from 'react';
import type { RouteObject } from 'react-router';
import { RequirePermission } from '../../core/session/views/Guards';

const ReportsView = lazy(() => import('./views/ReportsView'));

/** Rutas del módulo Reportes (relativas a /app). */
export const reportsRoutes: RouteObject[] = [
  {
    path: 'reports',
    element: (
      <RequirePermission permission="reports.read">
        <ReportsView />
      </RequirePermission>
    ),
  },
];
