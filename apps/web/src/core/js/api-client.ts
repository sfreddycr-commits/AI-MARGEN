import type { ApiError } from '@aimargen/types';

/**
 * Cliente HTTP base. Las cookies HttpOnly viajan solas (credentials: 'include').
 * Toda solicitud envía X-Requested-With (defensa CSRF, ADR-0008).
 *
 * Renovación de sesión: si una solicitud responde 401, se intenta UNA renovación
 * (POST /auth/refresh) compartida por todas las solicitudes en vuelo y se reintenta.
 * Si el servidor responde 409 REFRESH_IN_PROGRESS (otra pestaña rotó el token al mismo
 * tiempo) se espera un instante y se reintenta la solicitud original con la cookie nueva.
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

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  /** No intentar renovar la sesión ante un 401 (login, refresh, etc.). */
  noRefresh?: boolean;
};

/** Se notifica cuando la sesión no pudo renovarse (el shell redirige al login). */
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(fn: (() => void) | null): void {
  onSessionExpired = fn;
}

let refreshInFlight: Promise<boolean> | null = null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function doRefresh(): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-Requested-With': 'aimargen-web', Accept: 'application/json' },
      });
    } catch {
      return false;
    }
    if (res.ok) return true;
    // Otra pestaña renovó la sesión en este instante: su cookie nueva ya está guardada.
    if (res.status === 409) {
      await sleep(250 * (attempt + 1));
      return true;
    }
    return false;
  }
  return false;
}

/** Renovación única compartida por todas las solicitudes concurrentes. */
export function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function send(path: string, init: RequestOptions): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  headers.set('X-Requested-With', 'aimargen-web');
  let body: BodyInit | undefined;
  if (init.body instanceof FormData) {
    body = init.body;
  } else if (init.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(init.body);
  }
  const { noRefresh: _n, ...rest } = init;
  try {
    return await fetch(`${BASE}${path}`, { ...rest, headers, body, credentials: 'include' });
  } catch {
    throw new ApiRequestError(0, {
      code: 'NETWORK_ERROR',
      message: 'Sin conexión. Revise su internet e intente de nuevo.',
    });
  }
}

async function toError(res: Response): Promise<ApiRequestError> {
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? ((await res.json().catch(() => null)) as ApiError | null) : null;
  return new ApiRequestError(res.status, payload?.error ?? {});
}

async function sendWithSession(path: string, init: RequestOptions): Promise<Response> {
  let res = await send(path, init);
  if (res.status === 401 && !init.noRefresh && !path.startsWith('/auth/')) {
    const renewed = await refreshSession();
    if (renewed) {
      res = await send(path, init);
    }
    if (res.status === 401) onSessionExpired?.();
  }
  return res;
}

export async function apiRequest<T>(path: string, init: RequestOptions = {}): Promise<T> {
  const res = await sendWithSession(path, init);
  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  const isJson = res.headers.get('content-type')?.includes('application/json');
  return (isJson ? await res.json() : null) as T;
}

/** Atajos tipados. */
export const api = {
  get: <T>(path: string, init?: RequestOptions) => apiRequest<T>(path, { ...init, method: 'GET' }),
  post: <T>(path: string, body?: unknown, init?: RequestOptions) =>
    apiRequest<T>(path, { ...init, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, init?: RequestOptions) =>
    apiRequest<T>(path, { ...init, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, init?: RequestOptions) =>
    apiRequest<T>(path, { ...init, method: 'PATCH', body }),
  delete: <T>(path: string, init?: RequestOptions) =>
    apiRequest<T>(path, { ...init, method: 'DELETE' }),
};

/**
 * Descarga un archivo (reportes, documentos) respetando la sesión y lo entrega al navegador.
 * El nombre sale de Content-Disposition cuando existe.
 */
export async function downloadFile(path: string, fallbackName: string): Promise<void> {
  const res = await sendWithSession(path, { method: 'GET' });
  if (!res.ok) throw await toError(res);
  const blob = await res.blob();
  const cd = res.headers.get('content-disposition') ?? '';
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
  const name = match?.[1] ? decodeURIComponent(match[1]) : fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Obtiene un archivo como URL local (vista previa de facturas). */
export async function fetchObjectUrl(path: string): Promise<string> {
  const res = await sendWithSession(path, { method: 'GET' });
  if (!res.ok) throw await toError(res);
  return URL.createObjectURL(await res.blob());
}

/** Construye query strings omitiendo vacíos. */
export function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

/** Mensaje de error apto para mostrar. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiRequestError) return e.message;
  return 'Ocurrió un error inesperado. Intente de nuevo.';
}
