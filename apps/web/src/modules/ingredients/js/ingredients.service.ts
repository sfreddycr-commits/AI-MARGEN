import type { IngredientInput } from '@aimargen/schemas';
import type { z } from 'zod';
import type { ingredientCostInput } from '@aimargen/schemas';
import { api } from '../../../core/js/api-client';
import type { UnitCode } from './units';

/** Capa de datos del módulo: tipos de la API y llamadas HTTP. Sin lógica de pantalla. */

export interface IngredientConversion {
  from: UnitCode;
  to: UnitCode;
  factor: string;
}

export interface Ingredient {
  uuid: string;
  name: string;
  categoryUuid: string | null;
  categoryName: string | null;
  unit: UnitCode;
  /** Costo por unidad base (string decimal) o null si aún no tiene costo. */
  unitCost: string | null;
  /** Costo por unidad considerando el rendimiento (lo calcula el motor). */
  effectiveUnitCost: string | null;
  /** Rendimiento como fracción ("1" = sin merma). */
  yield: string;
  supplierUuid: string | null;
  supplierName: string | null;
  lastCostAt: string | null;
  notes: string | null;
  conversions: IngredientConversion[];
  usedInProducts: number;
  isDemo: boolean;
  archived: boolean;
  rowVersion: number;
  updatedAt: string | null;
}

export type PriceSource = 'manual' | 'purchase' | 'invoice_ai';

export interface PriceHistoryEntry {
  effectiveAt: string | null;
  unitCost: string | null;
  quantity: string | null;
  source: PriceSource;
  voided: boolean;
  supplierUuid: string | null;
  supplierName: string | null;
  purchaseUuid: string | null;
}

export interface IngredientCategory {
  uuid: string;
  name: string;
  rowVersion: number;
  updatedAt: string | null;
  archived: boolean;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type IngredientCostInput = z.input<typeof ingredientCostInput>;
export type IngredientUpdateInput = Omit<IngredientInput, 'initialCost'>;

export const ingredientsService = {
  get: (uuid: string) => api.get<Ingredient>(`/ingredients/${uuid}`),
  /** Archivados: el cache local solo guarda activos, se consultan a la API. */
  archivedPath: '/ingredients?filter=archived&pageSize=100',
  historyPath: (uuid: string) => `/ingredients/${uuid}/history`,
  create: (input: IngredientInput) => api.post<Ingredient>('/ingredients', input),
  update: (uuid: string, input: IngredientUpdateInput) =>
    api.patch<Ingredient>(`/ingredients/${uuid}`, input),
  addCost: (uuid: string, input: IngredientCostInput) =>
    api.post<Ingredient>(`/ingredients/${uuid}/costs`, input),
  archive: (uuid: string) => api.post<Ingredient>(`/ingredients/${uuid}/archive`),
  restore: (uuid: string) => api.post<Ingredient>(`/ingredients/${uuid}/restore`),
  createCategory: (name: string) =>
    api.post<IngredientCategory>('/categories', { kind: 'ingredient', name }),
};
