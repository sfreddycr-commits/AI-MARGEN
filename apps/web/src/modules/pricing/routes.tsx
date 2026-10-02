import { lazy } from 'react';
import type { RouteObject } from 'react-router';
import { RequirePermission } from '../../core/session/views/Guards';

const PricingView = lazy(() => import('./views/PricingView'));

/** Rutas del módulo Precio y margen (relativas a /app). */
export const pricingRoutes: RouteObject[] = [
  {
    path: 'pricing',
    element: (
      <RequirePermission permission="pricing.read">
        <PricingView />
      </RequirePermission>
    ),
  },
];
