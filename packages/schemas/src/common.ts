import { z } from 'zod';

/**
 * Primitivas de validación compartidas. Mensajes en español (SOP regla 15).
 * Los montos y cantidades viajan como string decimal (ADR-0006).
 */

/** String decimal no negativo, máx. 12 enteros y 6 decimales (DECIMAL(18,6)). */
export const decimalString = z
  .string({ error: 'Ingrese un número.' })
  .trim()
  .regex(/^\d{1,12}(\.\d{1,6})?$/, { error: 'Ingrese un número válido mayor o igual a cero.' });

/** Porcentaje como fracción 0 ≤ x < 1 enviado como string (ej. "0.40"). */
export const fractionString = decimalString.refine((v) => Number(v) < 1, {
  error: 'El porcentaje debe ser menor que 100%.',
});

export const uuid = z.uuid({ error: 'Identificador inválido.' });

export const nonEmptyName = z
  .string({ error: 'Ingrese un nombre.' })
  .trim()
  .min(1, { error: 'Ingrese un nombre.' })
  .max(120, { error: 'El nombre no puede superar 120 caracteres.' });

export const email = z
  .string({ error: 'Ingrese un correo.' })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Ingrese un correo válido.' }))
  .refine((v) => v.length <= 190, { error: 'El correo es demasiado largo.' });

/** Booleano en query string: solo "true"/"1" es verdadero ("false" NO se convierte en true). */
export const queryBool = z
  .enum(['true', 'false', '1', '0'], { error: 'Valor inválido.' })
  .default('false')
  .transform((v) => v === 'true' || v === '1');

/** Paginación estándar de listados. */
export const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export type Pagination = z.infer<typeof pagination>;
