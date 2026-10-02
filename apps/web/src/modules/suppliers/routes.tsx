import { lazy } from 'react';
import type { RouteObject } from 'react-router';
import { RequirePermission } from '../../core/session/views/Guards';

const SuppliersListView = lazy(() => import('./views/SuppliersListView'));
const SupplierDetailView = lazy(() => import('./views/SupplierDetailView'));
const SupplierFormView = lazy(() => import('./views/SupplierFormView'));

/** Rutas del módulo Proveedores (relativas a /app). */
export const suppliersRoutes: RouteObject[] = [
  {
    path: 'suppliers',
    element: (
      <RequirePermission permission="suppliers.read">
        <SuppliersListView />
      </RequirePermission>
    ),
  },
  {
    path: 'suppliers/new',
    element: (
      <RequirePermission permission="suppliers.write">
        <SupplierFormView />
      </RequirePermission>
    ),
  },
  {
    path: 'suppliers/:uuid',
    element: (
      <RequirePermission permission="suppliers.read">
        <SupplierDetailView />
      </RequirePermission>
    ),
  },
  {
    path: 'suppliers/:uuid/edit',
    element: (
      <RequirePermission permission="suppliers.write">
        <SupplierFormView />
      </RequirePermission>
    ),
  },
];
