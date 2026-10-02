import type { SupplierInput } from '@aimargen/schemas';
import { api } from '../../../core/js/api-client';

/** Capa de datos del módulo: tipos de la API y llamadas HTTP. Sin lógica de pantalla. */
export interface Supplier {
  uuid: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  purchasesCount: number;
  lastPurchaseAt: string | null;
  isDemo: boolean;
  archived: boolean;
  rowVersion: number;
  updatedAt: string | null;
}

export const suppliersService = {
  get: (uuid: string) => api.get<Supplier>(`/suppliers/${uuid}`),
  create: (input: SupplierInput) => api.post<Supplier>('/suppliers', input),
  update: (uuid: string, input: SupplierInput) => api.patch<Supplier>(`/suppliers/${uuid}`, input),
  archive: (uuid: string) => api.post<Supplier>(`/suppliers/${uuid}/archive`),
  restore: (uuid: string) => api.post<Supplier>(`/suppliers/${uuid}/restore`),
};
