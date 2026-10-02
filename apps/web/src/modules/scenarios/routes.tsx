import { lazy } from 'react';
import type { RouteObject } from 'react-router';
import { RequirePermission } from '../../core/session/views/Guards';

const ScenariosListView = lazy(() => import('./views/ScenariosListView'));
const ScenarioEditorView = lazy(() => import('./views/ScenarioEditorView'));
const FixedCostsView = lazy(() => import('./views/FixedCostsView'));

/** Rutas del módulo Escenarios y costos fijos (relativas a /app). */
export const scenariosRoutes: RouteObject[] = [
  {
    path: 'scenarios',
    element: (
      <RequirePermission permission="scenarios.read">
        <ScenariosListView />
      </RequirePermission>
    ),
  },
  {
    path: 'scenarios/new',
    element: (
      <RequirePermission permission="scenarios.read">
        <ScenarioEditorView />
      </RequirePermission>
    ),
  },
  {
    path: 'scenarios/:uuid',
    element: (
      <RequirePermission permission="scenarios.read">
        <ScenarioEditorView />
      </RequirePermission>
    ),
  },
  {
    path: 'fixed-costs',
    element: (
      <RequirePermission permission="scenarios.read">
        <FixedCostsView />
      </RequirePermission>
    ),
  },
];
