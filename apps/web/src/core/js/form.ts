import type { z } from 'zod';
import { Decimal } from '@aimargen/calculation-engine';
import { parseLocaleDecimal } from '@aimargen/types';
import { ApiRequestError } from './api-client';

/**
 * Utilidades de formularios.
 * Los formularios validan con los MISMOS esquemas zod que la API (@aimargen/schemas) y
 * muestran también los errores por campo que devuelva el servidor.
 */

export type FieldErrors = Record<string, string>;

/** Valida con un esquema compartido. Devuelve datos o errores por campo ("items.0.quantity"). */
export function validate<S extends z.ZodType>(
  schema: S,
  values: unknown,
): { ok: true; data: z.output<S> } | { ok: false; errors: FieldErrors } {
  const r = schema.safeParse(values);
  if (r.success) return { ok: true, data: r.data };
  const errors: FieldErrors = {};
  for (const issue of r.error.issues) {
    const key = issue.path.map(String).join('.') || '_form';
    errors[key] ??= issue.message;
  }
  return { ok: false, errors };
}

/** Errores por campo devueltos por la API (400 con `fields`). */
export function serverFieldErrors(e: unknown): FieldErrors | null {
  if (e instanceof ApiRequestError && e.fields && Object.keys(e.fields).length > 0) {
    return e.fields;
  }
  return null;
}

/**
 * Convierte lo escrito por el usuario ("1.500,75", "₡ 2 500") a string decimal ("1500.75").
 * Vacío → null. Si no se reconoce, devuelve el texto para que la validación muestre el error.
 */
export function inputToDecimal(input: string): string | null {
  if (!input.trim()) return null;
  return parseLocaleDecimal(input) ?? input.trim();
}

/** "35" o "35,5" (porcentaje escrito) → "0.35" / "0.355" (fracción para la API). */
export function percentInputToFraction(input: string): string | null {
  const d = inputToDecimal(input);
  if (d === null) return null;
  try {
    return new Decimal(d).div(100).toString();
  } catch {
    return d;
  }
}

/** "0.35" (fracción) → "35" para precargar un campo de porcentaje. */
export function fractionToPercentInput(fraction: string | null | undefined): string {
  if (fraction === null || fraction === undefined || fraction === '') return '';
  try {
    return formatInputNumber(new Decimal(fraction).mul(100).toString());
  } catch {
    return '';
  }
}

/** "1500.750000" → "1500,75" para precargar campos numéricos en formato local. */
export function formatInputNumber(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  try {
    const d = new Decimal(value);
    return d.toDecimalPlaces(6).toString().replace('.', ',');
  } catch {
    return value;
  }
}

/** Fecha de hoy (AAAA-MM-DD) en la zona horaria local del dispositivo. */
export function todayIso(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
