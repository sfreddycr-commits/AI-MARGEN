import type { PurchaseInput } from '@aimargen/schemas';
import { api, fetchObjectUrl, qs } from '../../../core/js/api-client';

/** Capa de datos del módulo: tipos de la API y llamadas HTTP. Sin lógica de pantalla. */

export interface Purchase {
  uuid: string;
  /** Fecha de la compra (AAAA-MM-DD). */
  purchasedAt: string | null;
  reference: string | null;
  notes: string | null;
  total: string | null;
  source: 'manual' | 'invoice_ai';
  supplierUuid: string | null;
  supplierName: string | null;
  itemsCount?: number;
  itemsSummary?: string;
  documentUuid: string | null;
  voided: boolean;
  voidedAt: string | null;
  isDemo: boolean;
  createdAt: string | null;
}

export interface PurchaseItem {
  ingredientUuid: string;
  ingredientName: string;
  ingredientUnit: string;
  quantity: string | null;
  unit: string;
  lineTotal: string | null;
  /** Costo por unidad del ingrediente (calculado por el motor). */
  unitCost: string | null;
}

export interface PurchaseDetail extends Purchase {
  items: PurchaseItem[];
}

export interface PurchasePage {
  items: Purchase[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PurchaseFilters {
  supplier?: string;
  ingredient?: string;
  from?: string;
  to?: string;
  includeVoid?: boolean;
}

export const PAGE_SIZE = 20;

export const purchasesService = {
  list: (f: PurchaseFilters, page: number) =>
    api.get<PurchasePage>(
      `/purchases${qs({
        supplier: f.supplier,
        ingredient: f.ingredient,
        from: f.from,
        to: f.to,
        // La API convierte cualquier texto a verdadero ("false" incluido): solo se envía si aplica.
        includeVoid: f.includeVoid ? 'true' : undefined,
        page,
        pageSize: PAGE_SIZE,
      })}`,
    ),
  detailPath: (uuid: string) => `/purchases/${uuid}`,
  create: (input: PurchaseInput) => api.post<PurchaseDetail>('/purchases', input),
  void: (uuid: string) => api.post<PurchaseDetail>(`/purchases/${uuid}/void`),
  documentUrl: (documentUuid: string) => fetchObjectUrl(`/ai/documents/${documentUuid}`),
};
