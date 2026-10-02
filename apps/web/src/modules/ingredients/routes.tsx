import { lazy } from 'react';
import type { RouteObject } from 'react-router';
import { RequirePermission } from '../../core/session/views/Guards';

const IngredientsListView = lazy(() => import('./views/IngredientsListView'));
const IngredientDetailView = lazy(() => import('./views/IngredientDetailView'));
const IngredientFormView = lazy(() => import('./views/IngredientFormView'));

/** Rutas del módulo Ingredientes (relativas a /app). */
export const ingredientsRoutes: RouteObject[] = [
  {
    path: 'ingredients',
    element: (
      <RequirePermission permission="ingredients.read">
        <IngredientsListView />
      </RequirePermission>
    ),
  },
  {
    path: 'ingredients/new',
    element: (
      <RequirePermission permission="ingredients.write">
        <IngredientFormView />
      </RequirePermission>
    ),
  },
  {
    path: 'ingredients/:uuid',
    element: (
      <RequirePermission permission="ingredients.read">
        <IngredientDetailView />
      </RequirePermission>
    ),
  },
  {
    path: 'ingredients/:uuid/edit',
    element: (
      <RequirePermission permission="ingredients.write">
        <IngredientFormView />
      </RequirePermission>
    ),
  },
];
