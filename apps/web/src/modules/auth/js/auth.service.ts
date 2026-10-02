import type { LoginInput, RegisterInput } from '@aimargen/schemas';
import { api } from '../../../core/js/api-client';
import type { Me } from '../../../core/session/js/session-types';

/** Capa de datos del módulo de acceso: llamadas HTTP de autenticación. Sin lógica de pantalla. */
type Ok = { ok: true };

/** Las rutas de acceso no intentan renovar la sesión ante un 401 (credenciales inválidas). */
const noRefresh = { noRefresh: true } as const;

export const authService = {
  /** Devuelve la misma forma que GET /auth/me. */
  login: (input: LoginInput) => api.post<Me>('/auth/login', input, noRefresh),
  register: (input: RegisterInput) =>
    api.post<{ email: string }>('/auth/register', input, noRefresh),
  forgotPassword: (email: string) => api.post<Ok>('/auth/forgot-password', { email }, noRefresh),
  resetPassword: (token: string, password: string) =>
    api.post<Ok>('/auth/reset-password', { token, password }, noRefresh),
  acceptInvite: (token: string, password: string) =>
    api.post<Ok>('/auth/accept-invite', { token, password }, noRefresh),
  verifyEmail: (token: string) => api.post<Ok>('/auth/verify-email', { token }, noRefresh),
  resendVerification: (email: string) =>
    api.post<Ok>('/auth/resend-verification', { email }, noRefresh),
};
