import type { FixedCostInput, ScenarioCalculateInput, ScenarioInput } from '@aimargen/schemas';
import { api } from '../../../core/js/api-client';

/** Capa de datos de escenarios y costos fijos: tipos de la API y llamadas HTTP. */

export interface CalcWarning {
  code: string;
  message: string;
}

export interface ScenarioResult {
  unitsPerMonth: string | null;
  revenue: string | null;
  variableCosts: string | null;
  fixedCosts: string | null;
  totalCosts: string | null;
  profit: string | null;
  margin: string | null;
  breakEven: {
    units: string | null;
    unitsRounded: number;
    revenue: string | null;
    contributionPerUnit: string | null;
  } | null;
  /** Unidades por día necesarias para el equilibrio (redondeadas hacia arriba). */
  breakEvenUnitsPerDay: string | null;
  warnings: CalcWarning[];
  inputs: {
    fixedCostsSource: 'business' | 'scenario';
    variableUnitCost: string;
    variableSource: 'product' | 'manual';
  };
}

export interface Scenario {
  uuid: string;
  name: string;
  productUuid: string | null;
  productName: string | null;
  price: string;
  unitsPerDay: string;
  daysPerMonth: number;
  /** null = usa la suma de costos fijos del negocio. */
  fixedCosts: string | null;
  variableUnitCost: string;
  variableSource: 'product' | 'manual';
  notes: string | null;
  isDemo: boolean;
  archived: boolean;
  rowVersion: number;
  updatedAt: string | null;
  /** Solo en respuestas directas de la API (no en el cache local). */
  result?: ScenarioResult | null;
}

export interface FixedCost {
  uuid: string;
  name: string;
  monthlyAmount: string;
  notes: string | null;
  isDemo: boolean;
  archived: boolean;
  rowVersion: number;
  updatedAt: string | null;
}

export interface FixedCostList {
  items: FixedCost[];
  total: string;
}

/** Producto del cache local (solo lo que usa el simulador). */
export interface ScenarioProduct {
  uuid: string;
  name: string;
  currentPrice: string | null;
  costPerPortion: string | null;
  costComplete: boolean;
  archived: boolean;
}

export const FIXED_COSTS_PATH = '/fixed-costs';
export const SCENARIOS_PATH = '/scenarios';

export const scenariosService = {
  get: (uuid: string) => api.get<Scenario>(`/scenarios/${uuid}`),
  calculate: (input: ScenarioCalculateInput, signal?: AbortSignal) =>
    api.post<ScenarioResult>('/scenarios/calculate', input, { signal }),
  create: (input: ScenarioInput) => api.post<Scenario>('/scenarios', input),
  update: (uuid: string, input: ScenarioInput) => api.patch<Scenario>(`/scenarios/${uuid}`, input),
  archive: (uuid: string) => api.post<Scenario>(`/scenarios/${uuid}/archive`),
};

export const fixedCostsService = {
  create: (input: FixedCostInput) => api.post<FixedCost>('/fixed-costs', input),
  update: (uuid: string, input: FixedCostInput) =>
    api.patch<FixedCost>(`/fixed-costs/${uuid}`, input),
  archive: (uuid: string) => api.post<FixedCost>(`/fixed-costs/${uuid}/archive`),
};
