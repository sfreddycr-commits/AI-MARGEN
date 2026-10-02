import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router';

const PublicLayout = lazy(() => import('./views/PublicLayout'));
const LandingView = lazy(() => import('./views/LandingView'));
const FeaturesView = lazy(() => import('./views/FeaturesView'));
const PricingView = lazy(() => import('./views/PricingView'));
const SecurityView = lazy(() => import('./views/SecurityView'));
const PrivacyView = lazy(() => import('./views/PrivacyView'));
const TermsView = lazy(() => import('./views/TermsView'));
const ContactView = lazy(() => import('./views/ContactView'));

/** Rutas públicas del sitio (absolutas). No requieren sesión (SOP §6, §48). */
export const publicRoutes: RouteObject[] = [
  {
    element: (
      <Suspense fallback={null}>
        <PublicLayout />
      </Suspense>
    ),
    children: [
      { path: '/', element: <LandingView /> },
      { path: '/funciones', element: <FeaturesView /> },
      { path: '/precios', element: <PricingView /> },
      { path: '/seguridad', element: <SecurityView /> },
      { path: '/privacidad', element: <PrivacyView /> },
      { path: '/terminos', element: <TermsView /> },
      { path: '/contacto', element: <ContactView /> },
    ],
  },
];
