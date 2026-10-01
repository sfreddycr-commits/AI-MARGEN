import type { ApiError } from '@aimargen/types';

/**
 * Cliente HTTP base. Las cookies HttpOnly viajan solas (credentials: 'include').
 * Toda mutación envía X-Requested-With (defensa CSRF, ADR-0008).
 */
const BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;
  readonly requestId?: string;

  constructor(status: number, body: Partial<ApiError['error']>) {
    super(body.message ?? 'Ocurrió un error inesperado. Intente de nuevo.');
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = body.code ?? 'UNKNOWN';
    this.fields = body.fields;
    this.requestId = body.requestId;
  }
}

export async function apiRequest<T>(
  path: string,
  init: Omit<RequestInit, 'body'> & { body?: unknown } = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  headers.set('X-Requested-With', 'aimargen-web');
  let body: BodyInit | undefined;
  if (init.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(init.body);
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers, body, credentials: 'include' });
  } catch {
    throw new ApiRequestError(0, {
      code: 'NETWORK_ERROR',
      message: 'Sin conexión. Revise su internet e intente de nuevo.',
    });
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const payload: unknown = isJson ? await res.json() : null;
  if (!res.ok) {
    const err = (payload as ApiError | null)?.error ?? {};
    throw new ApiRequestError(res.status, err);
  }
  return payload as T;
}
