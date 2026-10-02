import type { z } from 'zod';
import type { contactInput } from '@aimargen/schemas';
import { api } from '../../../core/js/api-client';

/** Capa de datos del sitio público: tipos y llamadas HTTP. Sin lógica de pantalla. */
export type ContactPayload = z.output<typeof contactInput>;

export interface ContactResult {
  ok: true;
}

export const landingService = {
  /** Formulario de contacto público (no requiere sesión). */
  sendContact: (input: ContactPayload) =>
    api.post<ContactResult>('/public/contact', input, { noRefresh: true }),
};
