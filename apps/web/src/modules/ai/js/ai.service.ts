import type { ProductInput, PurchaseInput, ScenarioInput } from '@aimargen/schemas';
import { api, fetchObjectUrl } from '../../../core/js/api-client';

/** Capa de datos de AImargen AI: tipos de la API y llamadas HTTP. Sin lógica de pantalla. */

export interface AiStatus {
  enabled: boolean;
  provider: string | null;
  model: string | null;
  monthlyLimit: number;
  usedThisMonth: number;
}

export interface AiInsight {
  code: string;
  text: string;
  link: string | null;
  figures: Record<string, string | null>;
}

export interface AiAlert {
  code: string;
  severity: 'danger' | 'warning' | 'info';
  title: string;
  detail: string;
  link: string | null;
}

export interface AiInsights {
  insights: AiInsight[];
  alerts: AiAlert[];
  aiEnabled: boolean;
}

export interface ConversationSummary {
  uuid: string;
  title: string;
  updatedAt: string | null;
}

export type ToolStatus = 'ok' | 'error' | 'denied';
export interface ToolCall {
  name: string;
  status: ToolStatus;
}

export type DraftKind = 'recipe' | 'purchase' | 'scenario';

/** Borrador completo (GET /ai/drafts/:uuid y borradores dentro del chat). */
export interface AiDraft<P = Record<string, unknown>> {
  uuid: string;
  kind: DraftKind;
  status: 'pending' | 'confirmed' | 'discarded' | string;
  payload: P;
  documentUuid: string | null;
  resultUuid: string | null;
  expiresAt: string | null;
  expired: boolean;
  createdAt: string | null;
  ownerUuid: string;
}

/** Respuesta de creación (POST /ai/recipe/draft y /ai/invoice/analyze). */
export interface CreatedDraft {
  uuid: string;
  kind: DraftKind;
  payload: Record<string, unknown>;
  expiresAt: string | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | string;
  text: string;
  drafts: AiDraft[];
  unverified: string[];
  createdAt: string | null;
  /** Solo en respuestas recién recibidas (el historial no las devuelve). */
  toolCalls?: ToolCall[];
}

export interface Conversation {
  uuid: string;
  title: string;
  messages: ChatMessage[];
}

export interface ChatResponse {
  conversationUuid: string;
  reply: string;
  toolCalls: ToolCall[];
  drafts: AiDraft[];
  unverified: string[];
}

// ---------------------------------------------------------------- Cargas de borradores
export interface PurchaseDraftLine {
  description: string;
  quantity: string | null;
  unit: string | null;
  rawUnit: string | null;
  lineTotal: string | null;
  match: { ingredientUuid: string; name: string; unit: string; score: number } | null;
  unitCompatible: boolean;
}

export interface PurchaseDraftPayload {
  documentUuid: string | null;
  supplier: {
    name: string | null;
    match: { uuid: string; name: string; score: number } | null;
  };
  date: string | null;
  reference: string | null;
  currency: string | null;
  total: string | null;
  lines: PurchaseDraftLine[];
  warnings: string[];
}

export interface RecipeDraftItem {
  text: string;
  quantity: string | null;
  unit: string | null;
  rawUnit: string;
  match: {
    ingredientUuid: string;
    name: string;
    unit: string;
    unitCost: string | null;
    score: number;
  } | null;
  unitCompatible: boolean;
}

export interface RecipeDraftPayload {
  name: string;
  portions: string;
  packaging: { mode: 'fixed' | 'percent'; value: string } | null;
  items: RecipeDraftItem[];
  missing: string[];
  missingCost: string[];
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
  breakEvenUnitsPerDay: number | null;
  warnings: string[];
  inputs?: {
    fixedCostsSource: 'business' | 'scenario';
    variableUnitCost: string;
    variableSource: 'product' | 'manual';
  };
}

export interface ScenarioDraftPayload {
  name: string;
  productUuid: string | null;
  price: string;
  unitsPerDay: string;
  daysPerMonth: number;
  fixedCosts: string | null;
  variableUnitCost: string;
  variableSource: 'product' | 'manual';
  notes: string | null;
  result: ScenarioResult | null;
}

/** Datos mínimos de otras entidades que usa la revisión de borradores. */
export interface IngredientOption {
  uuid: string;
  name: string;
  unit: string;
  unitCost: string | null;
  archived?: boolean;
}
export interface SupplierOption {
  uuid: string;
  name: string;
  archived?: boolean;
}

export const aiService = {
  status: () => api.get<AiStatus>('/ai/status'),
  insights: () => api.get<AiInsights>('/ai/insights'),
  conversations: () => api.get<ConversationSummary[]>('/ai/conversations'),
  conversation: (uuid: string) => api.get<Conversation>(`/ai/conversations/${uuid}`),
  chat: (input: { conversationUuid: string | null; message: string }) =>
    api.post<ChatResponse>('/ai/chat', input),
  draftRecipe: (text: string) => api.post<CreatedDraft>('/ai/recipe/draft', { text }),
  analyzeInvoice: (file: File) => {
    const body = new FormData();
    body.append('file', file, file.name);
    return api.post<CreatedDraft>('/ai/invoice/analyze', body);
  },
  draft: (uuid: string) => api.get<AiDraft>(`/ai/drafts/${uuid}`),
  confirmPurchase: (uuid: string, input: PurchaseInput) =>
    api.post<{ uuid: string }>(`/ai/drafts/${uuid}/confirm-purchase`, input),
  confirmRecipe: (uuid: string, input: ProductInput) =>
    api.post<{ uuid: string }>(`/ai/drafts/${uuid}/confirm-recipe`, input),
  confirmScenario: (uuid: string, input: ScenarioInput) =>
    api.post<{ uuid: string }>(`/ai/drafts/${uuid}/confirm-scenario`, input),
  discard: (uuid: string) => api.post<{ ok: boolean }>(`/ai/drafts/${uuid}/discard`),
  documentUrl: (uuid: string) => fetchObjectUrl(`/ai/documents/${uuid}`),
  /** Vista previa del escenario con el motor de cálculo (no guarda nada). */
  calculateScenario: (input: Omit<ScenarioInput, 'name' | 'notes' | 'rowVersion'>) =>
    api.post<ScenarioResult>('/scenarios/calculate', input),
  /** Altas auxiliares al confirmar un borrador de factura ("crear nuevo"). */
  createIngredient: (input: { name: string; unit: string }) =>
    api.post<IngredientOption>('/ingredients', input),
  createSupplier: (input: { name: string }) => api.post<SupplierOption>('/suppliers', input),
};
