import { lazy } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router';
import { AppShell } from '../shell/views/AppShell';
import { MoreView } from '../shell/views/MoreView';
import { SystemStatusView } from '../../modules/system/views/SystemStatusView';
import { NotFoundView } from '../shell/views/NotFoundView';

/**
 * Router. Cada módulo aporta sus rutas bajo /app; los módulos se cargan bajo demanda.
 * Etapa 1: shell, "Más", estado del sistema y catálogo de componentes (solo desarrollo).
 * La landing (Etapa 2) reemplazará la redirección de "/"; el guard de sesión llega en Etapa 3.
 */
// Condicional para que el catálogo de desarrollo no llegue al build de producción.
const ComponentsView = import.meta.env.DEV
  ? lazy(() => import('../../modules/devtools/views/ComponentsView'))
  : null;

const appChildren: RouteObject[] = [
  { index: true, element: <Navigate to="/app/sistema" replace /> },
  { path: 'mas', element: <MoreView /> },
  { path: 'sistema', element: <SystemStatusView /> },
  ...(ComponentsView ? [{ path: 'componentes', element: <ComponentsView /> }] : []),
  { path: '*', element: <NotFoundView /> },
];

export const routes: RouteObject[] = [
  { path: '/', element: <Navigate to="/app" replace /> },
  { path: '/estado', element: <Navigate to="/app/sistema" replace /> },
  { path: '/app', element: <AppShell />, children: appChildren },
  { path: '*', element: <NotFoundView standalone /> },
];

export const router = createBrowserRouter(routes);
