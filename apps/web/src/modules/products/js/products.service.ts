import type { ProductInput, ProductPreviewInput } from '@aimargen/schemas';
import { api, downloadFile } from '../../../core/js/api-client';

/** Capa de datos del módulo Productos: tipos de la API y llamadas HTTP. Sin lógica de pantalla. */

export type ProductStatus = 'incomplete' | 'no_price' | 'below_cost' | 'below_target' | 'healthy';
export type ComponentMode = 'fixed' | 'percent';

export interface CostComponent {
  mode: ComponentMode;
  value: string;
}

export interface EngineWarning {
  code: string;
  message: string;
  ref?: string;
}

export interface ProductPricing {
  status: ProductStatus;
  profit: string | null;
  margin: string | null;
  recommendedPrice: string | null;
}

/** Fila de GET /products (también es lo que guarda el cache local). */
export interface Product {
  uuid: string;
  name: string;
  categoryUuid: string | null;
  categoryName: string | null;
  portions: string;
  currentPrice: string | null;
  targetMargin: string | null;
  effectiveTargetMargin: string | null;
  multiplier: string | null;
  packaging: CostComponent;
  labor: CostComponent;
  overhead: CostComponent;
  wastePct: string;
  notes: string | null;
  costTotal: string | null;
  costPerPortion: string | null;
  costComplete: boolean;
  costedAt: string | null;
  itemsCount: number;
  pricing: ProductPricing;
  isDemo: boolean;
  archived: boolean;
  rowVersion: number;
  updatedAt: string | null;
}

export interface BreakdownItem {
  ingredientUuid: string;
  ingredientName: string;
  quantity: string | null;
  unit: string;
  ingredientUnit: string;
  unitCost: string | null;
  yield: string | null;
  cost: string | null;
  archived: boolean;
}

export interface Breakdown {
  items: BreakdownItem[];
  ingredientsCost: string | null;
  packagingCost: string | null;
  laborCost: string | null;
  overheadCost: string | null;
  wasteCost: string | null;
  totalCost: string | null;
  costPerPortion: string | null;
  complete: boolean;
  warnings: EngineWarning[];
}

export interface PriceEvaluation {
  price: string | null;
  profit: string | null;
  margin: string | null;
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

/** GET /products/:uuid: producto + desglose en vivo + análisis. */
export interface ProductDetail extends Product {
  items: Array<{ ingredientUuid: string; quantity: string; unit: string }>;
  breakdown: Breakdown;
  analysis: PricingAnalysis | null;
}

/** POST /products/preview */
export interface ProductPreview {
  breakdown: Breakdown;
  pricing: ProductPricing;
  analysis: PricingAnalysis | null;
  effectiveTargetMargin: string | null;
}

/** Ingrediente tal como llega del cache local (solo los campos que usa el editor). */
export interface IngredientOption {
  uuid: string;
  name: string;
  unit: string;
  unitCost: string | null;
  effectiveUnitCost: string | null;
  conversions: Array<{ from: string; to: string; factor: string }>;
  archived: boolean;
}

export interface Category {
  uuid: string;
  name: string;
  archived: boolean;
  rowVersion: number;
  updatedAt: string | null;
}

export interface PriceUpdate {
  currentPrice: string | null;
  targetMargin: string | null;
  multiplier: string | null;
  rowVersion: number;
}

export const productsService = {
  get: (uuid: string) => api.get<ProductDetail>(`/products/${uuid}`),
  preview: (input: ProductPreviewInput) => api.post<ProductPreview>('/products/preview', input),
  create: (input: ProductInput) => api.post<ProductDetail>('/products', input),
  update: (uuid: string, input: ProductInput) =>
    api.patch<ProductDetail>(`/products/${uuid}`, input),
  setPrice: (uuid: string, input: PriceUpdate) =>
    api.patch<Product>(`/products/${uuid}/price`, input),
  duplicate: (uuid: string, name: string) =>
    api.post<ProductDetail>(`/products/${uuid}/duplicate`, { name }),
  archive: (uuid: string) => api.post<Product>(`/products/${uuid}/archive`),
  restore: (uuid: string) => api.post<Product>(`/products/${uuid}/restore`),
  /** Análisis de un precio escrito (sin guardar): POST /pricing/calculate. */
  calculate: (input: {
    cost: string;
    currentPrice: string | null;
    targetMargin: string | null;
    multiplier: string | null;
  }) => api.post<PricingAnalysis>('/pricing/calculate', input),
  createCategory: (name: string) => api.post<Category>('/categories', { kind: 'product', name }),
  downloadSheet: (uuid: string) =>
    downloadFile(`/reports/product-sheet?format=pdf&product=${uuid}`, 'ficha.pdf'),
};
