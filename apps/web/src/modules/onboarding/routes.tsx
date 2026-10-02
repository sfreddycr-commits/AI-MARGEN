import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router';
import { FullScreenLoader } from '../../core/session/views/FullScreenLoader';

const OnboardingView = lazy(() => import('./views/OnboardingView'));

/** Asistente de bienvenida (dentro de RequireOnboarding, fuera del shell). */
export const onboardingRoutes: RouteObject[] = [
  {
    path: '/onboarding',
    element: (
      <Suspense fallback={<FullScreenLoader />}>
        <OnboardingView />
      </Suspense>
    ),
  },
];
