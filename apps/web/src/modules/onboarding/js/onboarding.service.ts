import type {
  IngredientInput,
  OnboardingBusinessInput,
  ProductInput,
  ProductPreviewInput,
} from '@aimargen/schemas';
import type { settingsUpdateInput, tenantUpdateInput } from '@aimargen/schemas';
import type { z } from 'zod';
import { api } from '../../../core/js/api-client';
import type { Tenant } from '../../../core/session/js/session-types';

/** Capa de datos del onboarding: tipos de la API y llamadas HTTP. Sin lógica de pantalla. */

export type TenantUpdate = z.output<typeof tenantUpdateInput>;
export type SettingsUpdate = z.output<typeof settingsUpdateInput>;

export interface Ingredient {
  uuid: string;
  name: string;
  unit: string;
  unitCost: string | null;
  effectiveUnitCost: string | null;
  archived: boolean;
  updatedAt: string | null;
}

export interface PriceEval {
  price: string | null;
  profit: string | null;
  margin: string | null;
}

export interface PricingAnalysis {
  current: PriceEval | null;
  byMargin: PriceEval | null;
  warnings: Array<{ code: string; message?: string }>;
}

export interface Breakdown {
  ingredientsCost: string | null;
  totalCost: string | null;
  costPerPortion: string | null;
  complete: boolean;
}

export interface ProductPreview {
  breakdown: Breakdown;
  pricing: {
    status: ProductStatus;
    profit: string | null;
    margin: string | null;
    recommendedPrice: string | null;
  };
  analysis: PricingAnalysis | null;
  effectiveTargetMargin: string | null;
}

export type ProductStatus = 'incomplete' | 'no_price' | 'below_cost' | 'below_target' | 'healthy';

export interface Product {
  uuid: string;
  name: string;
  portions: string;
  currentPrice: string | null;
  effectiveTargetMargin: string | null;
  costPerPortion: string | null;
  pricing: ProductPreview['pricing'];
  updatedAt: string | null;
}

/** GET /products/:uuid: producto + desglose y análisis de precio calculados por el motor. */
export interface ProductDetail extends Product {
  breakdown: Breakdown;
  analysis: PricingAnalysis | null;
}

export const onboardingService = {
  createBusiness: (input: OnboardingBusinessInput) =>
    api.post<Tenant>('/onboarding/business', input),
  updateTenant: (input: TenantUpdate) => api.patch<Tenant>('/tenant', input),
  updateSettings: (input: SettingsUpdate) => api.patch<Tenant>('/tenant/settings', input),
  createIngredient: (input: IngredientInput) => api.post<Ingredient>('/ingredients', input),
  previewProduct: (input: ProductPreviewInput) =>
    api.post<ProductPreview>('/products/preview', input),
  createProduct: (input: ProductInput) => api.post<Product>('/products', input),
  getProduct: (uuid: string) => api.get<ProductDetail>(`/products/${uuid}`),
  complete: () => api.post<Tenant>('/onboarding/complete'),
};
