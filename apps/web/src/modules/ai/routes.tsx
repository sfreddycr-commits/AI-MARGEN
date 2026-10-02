import { lazy } from 'react';
import type { RouteObject } from 'react-router';
import { RequirePermission } from '../../core/session/views/Guards';

const AiChatView = lazy(() => import('./views/AiChatView'));
const AiInvoiceView = lazy(() => import('./views/AiInvoiceView'));
const AiRecipeView = lazy(() => import('./views/AiRecipeView'));
const AiDraftView = lazy(() => import('./views/AiDraftView'));

/** Rutas de AImargen AI (relativas a /app). */
export const aiRoutes: RouteObject[] = [
  {
    path: 'ai',
    element: (
      <RequirePermission permission="ai.use">
        <AiChatView />
      </RequirePermission>
    ),
  },
  {
    path: 'ai/conversations/:uuid',
    element: (
      <RequirePermission permission="ai.use">
        <AiChatView />
      </RequirePermission>
    ),
  },
  {
    path: 'ai/invoice',
    element: (
      <RequirePermission permission="ai.use">
        <AiInvoiceView />
      </RequirePermission>
    ),
  },
  {
    path: 'ai/recipe',
    element: (
      <RequirePermission permission="ai.use">
        <AiRecipeView />
      </RequirePermission>
    ),
  },
  {
    path: 'ai/drafts/:uuid',
    element: (
      <RequirePermission permission="ai.use">
        <AiDraftView />
      </RequirePermission>
    ),
  },
];
