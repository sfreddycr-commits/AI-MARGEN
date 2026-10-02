import { lazy } from 'react';
import type { RouteObject } from 'react-router';

const HomeView = lazy(() => import('./views/HomeView'));

/** Rutas del módulo Inicio (relativas a /app). El dashboard se adapta a los permisos del rol. */
export const homeRoutes: RouteObject[] = [{ index: true, element: <HomeView /> }];
