import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, type RouteObject } from 'react-router';
import { FullScreenLoader } from '../../core/session/views/FullScreenLoader';

const LoginView = lazy(() => import('./views/LoginView'));
const RegisterView = lazy(() => import('./views/RegisterView'));
const ForgotPasswordView = lazy(() => import('./views/ForgotPasswordView'));
const VerifyEmailView = lazy(() => import('./views/VerifyEmailView'));
const ResetPasswordView = lazy(() => import('./views/ResetPasswordView'));
const AcceptInviteView = lazy(() => import('./views/AcceptInviteView'));

/** Estas rutas no viven dentro del shell: cada una trae su propio límite de carga. */
const load = (node: ReactNode) => <Suspense fallback={<FullScreenLoader />}>{node}</Suspense>;

/** Pantallas de acceso solo para visitantes sin sesión (login, registro, recuperar). */
export const guestRoutes: RouteObject[] = [
  { path: '/login', element: load(<LoginView />) },
  { path: '/registro', element: load(<RegisterView />) },
  { path: '/recuperar', element: load(<ForgotPasswordView />) },
  // Alias de las rutas del SOP §7.
  { path: '/register', element: <Navigate to="/registro" replace /> },
  { path: '/forgot-password', element: <Navigate to="/recuperar" replace /> },
];

/**
 * Enlaces de correo (verificar, restablecer, invitación): funcionan con o sin sesión.
 * Las rutas son las que usa la API en sus correos: no cambiarlas.
 */
export const tokenRoutes: RouteObject[] = [
  { path: '/verify-email', element: load(<VerifyEmailView />) },
  { path: '/reset-password', element: load(<ResetPasswordView />) },
  { path: '/accept-invite', element: load(<AcceptInviteView />) },
];
