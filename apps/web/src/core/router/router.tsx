import { lazy } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { AppShell } from '../shell/views/AppShell';
import { MoreView } from '../shell/views/MoreView';
import { NotFoundView } from '../shell/views/NotFoundView';
import { GuestOnly, RequireApp, RequireOnboarding } from '../session/views/Guards';
import { SystemStatusView } from '../../modules/system/views/SystemStatusView';
import { publicRoutes } from '../../modules/landing/routes';
import { guestRoutes, tokenRoutes } from '../../modules/auth/routes';
import { onboardingRoutes } from '../../modules/onboarding/routes';
import { homeRoutes } from '../../modules/home/routes';
import { ingredientsRoutes } from '../../modules/ingredients/routes';
import { suppliersRoutes } from '../../modules/suppliers/routes';
import { purchasesRoutes } from '../../modules/purchases/routes';
import { productsRoutes } from '../../modules/products/routes';
import { pricingRoutes } from '../../modules/pricing/routes';
import { scenariosRoutes } from '../../modules/scenarios/routes';
import { reportsRoutes } from '../../modules/reports/routes';
import { aiRoutes } from '../../modules/ai/routes';
import { settingsRoutes } from '../../modules/settings/routes';
import { adminRoutes } from '../../modules/admin/routes';

/**
 * Router. Cada módulo aporta sus rutas (archivo `routes.tsx` del módulo) y sus vistas se
 * cargan bajo demanda. Las vistas se renderizan en el cliente; el backend solo entrega JSON.
 */
// Condicional para que el catálogo de desarrollo no llegue al build de producción.
const ComponentsView = import.meta.env.DEV
  ? lazy(() => import('../../modules/devtools/views/ComponentsView'))
  : null;

const appChildren: RouteObject[] = [
  ...homeRoutes,
  ...ingredientsRoutes,
  ...suppliersRoutes,
  ...purchasesRoutes,
  ...productsRoutes,
  ...pricingRoutes,
  ...scenariosRoutes,
  ...reportsRoutes,
  ...aiRoutes,
  ...settingsRoutes,
  ...adminRoutes,
  { path: 'mas', element: <MoreView /> },
  { path: 'sistema', element: <SystemStatusView /> },
  ...(ComponentsView ? [{ path: 'componentes', element: <ComponentsView /> }] : []),
  { path: '*', element: <NotFoundView /> },
];

export const routes: RouteObject[] = [
  ...publicRoutes,
  { element: <GuestOnly />, children: guestRoutes },
  ...tokenRoutes,
  { element: <RequireOnboarding />, children: onboardingRoutes },
  { path: '/estado', element: <Navigate to="/app/sistema" replace /> },
  {
    path: '/app',
    element: <RequireApp />,
    children: [{ element: <AppShell />, children: appChildren }],
  },
  { path: '*', element: <NotFoundView standalone /> },
];

export const router = createBrowserRouter(routes);
