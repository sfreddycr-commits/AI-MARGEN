/** Contratos compartidos de la API v1. */

/** Error estándar devuelto por la API. `message` siempre en español. */
export interface ApiError {
  error: {
    code: string;
    message: string;
    requestId: string;
    fields?: Record<string, string>;
  };
}

/** Respuesta paginada estándar. */
export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: 'aimargen-api';
  version: string;
  time: string;
  checks?: Record<string, 'ok' | 'fail'>;
}

export const ROLES = [
  'super_admin',
  'tenant_owner',
  'tenant_admin',
  'manager',
  'operator',
  'viewer',
] as const;
export type Role = (typeof ROLES)[number];
