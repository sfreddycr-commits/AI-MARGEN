import { Decimal } from '@aimargen/calculation-engine';

/**
 * Utilidades de serialización: la BD devuelve DECIMAL como string con 6 decimales;
 * la API responde strings decimales normalizados ("2000", "0.4") y fechas ISO.
 */
export function dec(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null;
  return new Decimal(String(v)).toString();
}

export function iso(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const d = v instanceof Date ? v : new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Fecha sin hora (columnas DATE) como YYYY-MM-DD. */
export function day(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') return v.slice(0, 10);
  const d = v as Date;
  return d.toISOString().slice(0, 10);
}

export function bool(v: unknown): boolean {
  return v === 1 || v === true || v === '1';
}

export function json<T>(v: unknown, fallback: T): T {
  if (v === null || v === undefined) return fallback;
  if (typeof v === 'string') {
    try {
      return JSON.parse(v) as T;
    } catch {
      return fallback;
    }
  }
  return v as T;
}

/** Escapa comodines de LIKE en búsquedas del usuario; '' → null. */
export function search(v: string | undefined | null): string | null {
  const s = v?.trim();
  if (!s) return null;
  return s.replace(/[\\%_]/g, (c) => `\\${c}`).slice(0, 120);
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export function page<T>(
  items: T[],
  totalRows: Array<{ total: number }> | undefined,
  p: number,
  size: number,
): Page<T> {
  return { items, page: p, pageSize: size, total: Number(totalRows?.[0]?.total ?? items.length) };
}
