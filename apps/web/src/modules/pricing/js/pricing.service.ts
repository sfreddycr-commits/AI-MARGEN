import type { z } from 'zod';
import type { pricingCalculateInput } from '@aimargen/schemas';
import { api } from '../../../core/js/api-client';

/** Capa de datos del módulo Precio y margen: tipos de la API y llamadas HTTP. */

export type PricingStatus = 'incomplete' | 'no_price' | 'below_cost' | 'below_target' | 'healthy';

export interface PriceEvaluation {
  price: string | null;
  profit: string | null;
  margin: string | null;
}

export interface EngineWarning {
  code: string;
  message: string;
  ref?: string;
}

/** Análisis de precio del motor (SOP §17). */
export interface PricingAnalysis {
  current: PriceEvaluation | null;
  byMargin: PriceEvaluation | null;
  byMultiplier: PriceEvaluation | null;
  equivalentMultiplier: string | null;
  multiplierMargin: string | null;
  differenceToRecommended: string | null;
  warnings: EngineWarning[];
}

/** Fila de GET /pricing (un elemento por producto activo). */
export interface PricingRow {
  uuid: string;
  name: string;
  categoryName: string | null;
  costPerPortion: string | null;
  costComplete: boolean;
  currentPrice: string | null;
  targetMargin: string | null;
  effectiveTargetMargin: string | null;
  multiplier: string | null;
  status: PricingStatus;
  analysis: PricingAnalysis | null;
  rowVersion: number;
}

/** Respuesta de PATCH /products/:uuid/price (solo los campos que se usan aquí). */
export interface PricedProduct {
  uuid: string;
  currentPrice: string | null;
  targetMargin: string | null;
  multiplier: string | null;
  rowVersion: number;
  updatedAt: string | null;
}

export type PricingCalculateInput = z.output<typeof pricingCalculateInput>;

export const pricingService = {
  overview: () => api.get<PricingRow[]>('/pricing'),
  calculate: (input: PricingCalculateInput) =>
    api.post<PricingAnalysis>('/pricing/calculate', input),
  /** Cambia el precio conservando margen objetivo y multiplicador propios del producto. */
  setPrice: (
    uuid: string,
    body: {
      currentPrice: string | null;
      targetMargin: string | null;
      multiplier: string | null;
      rowVersion: number;
    },
  ) => api.patch<PricedProduct>(`/products/${uuid}/price`, body),
};
