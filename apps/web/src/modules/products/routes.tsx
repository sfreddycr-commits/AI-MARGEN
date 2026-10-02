import { lazy } from 'react';
import type { RouteObject } from 'react-router';
import { RequirePermission } from '../../core/session/views/Guards';

const ProductsListView = lazy(() => import('./views/ProductsListView'));
const ProductDetailView = lazy(() => import('./views/ProductDetailView'));
const ProductFormView = lazy(() => import('./views/ProductFormView'));

/** Rutas del módulo Productos y recetas (relativas a /app). */
export const productsRoutes: RouteObject[] = [
  {
    path: 'products',
    element: (
      <RequirePermission permission="products.read">
        <ProductsListView />
      </RequirePermission>
    ),
  },
  {
    path: 'products/new',
    element: (
      <RequirePermission permission="products.write">
        <ProductFormView />
      </RequirePermission>
    ),
  },
  {
    path: 'products/:uuid',
    element: (
      <RequirePermission permission="products.read">
        <ProductDetailView />
      </RequirePermission>
    ),
  },
  {
    path: 'products/:uuid/edit',
    element: (
      <RequirePermission permission="products.write">
        <ProductFormView />
      </RequirePermission>
    ),
  },
];
