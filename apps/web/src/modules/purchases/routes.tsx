import { lazy } from 'react';
import type { RouteObject } from 'react-router';
import { RequirePermission } from '../../core/session/views/Guards';

const PurchasesListView = lazy(() => import('./views/PurchasesListView'));
const PurchaseDetailView = lazy(() => import('./views/PurchaseDetailView'));
const PurchaseFormView = lazy(() => import('./views/PurchaseFormView'));

/** Rutas del módulo Compras (relativas a /app). */
export const purchasesRoutes: RouteObject[] = [
  {
    path: 'purchases',
    element: (
      <RequirePermission permission="purchases.read">
        <PurchasesListView />
      </RequirePermission>
    ),
  },
  {
    path: 'purchases/new',
    element: (
      <RequirePermission permission="purchases.write">
        <PurchaseFormView />
      </RequirePermission>
    ),
  },
  {
    path: 'purchases/:uuid',
    element: (
      <RequirePermission permission="purchases.read">
        <PurchaseDetailView />
      </RequirePermission>
    ),
  },
];
