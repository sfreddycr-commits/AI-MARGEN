import { z } from 'zod';
import { decimalString, email, fractionString, nonEmptyName, uuid } from './common.js';

/** Esquemas de entrada de la API v1 (compartidos con los formularios de la web). */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Máximo ${max} caracteres.` })
    .nullish()
    .transform((v) => (v ? v : null));

const optionalUuid = uuid.nullish().transform((v) => v ?? null);
const optionalDecimal = decimalString.nullish().transform((v) => v ?? null);
const positiveDecimal = decimalString.refine((v) => Number(v) > 0, {
  error: 'Debe ser mayor que cero.',
});
const isoDate = z.iso.date({ error: 'Fecha inválida.' });

export const UNIT_CODES = ['g', 'kg', 'ml', 'l', 'unidad'] as const;
export const unitCode = z.enum(UNIT_CODES, { error: 'Unidad inválida.' });

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const password = z
  .string({ error: 'Ingrese una contraseña.' })
  .min(8, { error: 'La contraseña debe tener al menos 8 caracteres.' })
  .max(128, { error: 'La contraseña es demasiado larga.' })
  .refine((v) => /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(v) && /\d/.test(v), {
    error: 'Use al menos una letra y un número.',
  });

export const registerInput = z.object({
  name: nonEmptyName,
  email,
  password,
});

export const loginInput = z.object({
  email,
  password: z.string().min(1, { error: 'Ingrese su contraseña.' }).max(128),
  remember: z.boolean().default(false),
});

export const emailInput = z.object({ email });
export const tokenInput = z.object({ token: z.string().min(20).max(200) });
export const resetPasswordInput = z.object({ token: z.string().min(20).max(200), password });
export const changePasswordInput = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: password,
});

// ---------------------------------------------------------------------------
// Negocio / onboarding / configuración
// ---------------------------------------------------------------------------
export const BUSINESS_TYPES = [
  'restaurant',
  'soda',
  'cafe',
  'bakery',
  'pastry',
  'food_truck',
  'catering',
  'other',
] as const;
export const COST_METHODS = ['last_purchase', 'weighted_average'] as const;

const currency = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, { error: 'Moneda inválida.' });
const country = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, { error: 'País inválido.' });
const timezone = z.string().trim().min(3).max(64);
const days = z.coerce
  .number()
  .int()
  .min(1, { error: 'Entre 1 y 31 días.' })
  .max(31, { error: 'Entre 1 y 31 días.' });

export const onboardingBusinessInput = z.object({
  name: nonEmptyName,
  businessType: z.enum(BUSINESS_TYPES, { error: 'Elija el tipo de negocio.' }),
  country: country.default('CR'),
  currency: currency.default('CRC'),
  timezone: timezone.default('America/Costa_Rica'),
  targetMargin: fractionString.nullish().transform((v) => v ?? null),
  operatingDays: days.nullish().transform((v) => v ?? null),
});

export const tenantUpdateInput = z.object({
  name: nonEmptyName,
  legalName: optionalText(160),
  email: email.nullish().transform((v) => v ?? null),
  phone: optionalText(30),
  businessType: z.enum(BUSINESS_TYPES),
  country,
  currency,
  timezone,
  rowVersion: z.number().int().positive(),
});

export const settingsUpdateInput = z.object({
  targetMargin: fractionString.nullish().transform((v) => v ?? null),
  operatingDays: days.nullish().transform((v) => v ?? null),
  roundingScale: z.number().int().min(0).max(6),
  costMethod: z.enum(COST_METHODS),
  rowVersion: z.number().int().positive(),
});

export const INVITABLE_ROLES = ['tenant_admin', 'manager', 'operator', 'viewer'] as const;
export const inviteUserInput = z.object({
  name: nonEmptyName,
  email,
  role: z.enum(INVITABLE_ROLES, { error: 'Rol inválido.' }),
});
export const updateUserInput = z.object({
  role: z.enum(INVITABLE_ROLES, { error: 'Rol inválido.' }),
  status: z.enum(['active', 'blocked']),
});

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------
export const categoryInput = z.object({
  kind: z.enum(['ingredient', 'product']),
  name: nonEmptyName,
});
export const categoryUpdateInput = z.object({
  name: nonEmptyName,
  archived: z.boolean().default(false),
});

export const supplierInput = z.object({
  name: nonEmptyName,
  contactName: optionalText(120),
  phone: optionalText(30),
  email: email.nullish().transform((v) => v ?? null),
  notes: optionalText(500),
  rowVersion: z.number().int().positive().optional(),
});

export const conversionInput = z.object({
  from: unitCode,
  to: unitCode,
  factor: positiveDecimal,
});

/** Rendimiento como fracción 0 < r ≤ 1 (1 = sin merma). */
const yieldFraction = decimalString.refine((v) => Number(v) > 0 && Number(v) <= 1, {
  error: 'El rendimiento debe ser mayor que 0% y hasta 100%.',
});

export const ingredientInput = z.object({
  name: nonEmptyName,
  categoryUuid: optionalUuid,
  unit: unitCode,
  yield: yieldFraction.default('1'),
  notes: optionalText(500),
  conversions: z.array(conversionInput).max(10).default([]),
  rowVersion: z.number().int().positive().optional(),
  /** Solo al crear: costo inicial a partir de una compra de referencia (precio por cantidad). */
  initialCost: z
    .object({
      price: decimalString,
      quantity: positiveDecimal,
      unit: unitCode,
      supplierUuid: optionalUuid,
      date: isoDate.nullish().transform((v) => v ?? null),
    })
    .nullish()
    .transform((v) => v ?? null),
});

export const ingredientCostInput = z.object({
  price: decimalString,
  quantity: positiveDecimal,
  unit: unitCode,
  supplierUuid: optionalUuid,
  date: isoDate.nullish().transform((v) => v ?? null),
});

export const purchaseLineInput = z.object({
  ingredientUuid: uuid,
  quantity: positiveDecimal,
  unit: unitCode,
  lineTotal: decimalString,
});

export const purchaseInput = z.object({
  supplierUuid: optionalUuid,
  purchasedAt: isoDate,
  reference: optionalText(60),
  notes: optionalText(500),
  items: z.array(purchaseLineInput).min(1, { error: 'Agregue al menos un ingrediente.' }).max(100),
});

// ---------------------------------------------------------------------------
// Productos y recetas
// ---------------------------------------------------------------------------
export const COMPONENT_MODES = ['fixed', 'percent'] as const;
export const componentInput = z.object({
  mode: z.enum(COMPONENT_MODES),
  value: decimalString,
});

export const recipeItemInput = z.object({
  ingredientUuid: uuid,
  quantity: positiveDecimal,
  unit: unitCode,
});

const multiplier = decimalString.refine((v) => Number(v) > 0 && Number(v) <= 100, {
  error: 'El multiplicador debe ser mayor que 0.',
});

export const productInput = z.object({
  name: nonEmptyName,
  categoryUuid: optionalUuid,
  portions: positiveDecimal,
  currentPrice: optionalDecimal,
  targetMargin: fractionString.nullish().transform((v) => v ?? null),
  multiplier: multiplier.nullish().transform((v) => v ?? null),
  packaging: componentInput.default({ mode: 'fixed', value: '0' }),
  labor: componentInput.default({ mode: 'fixed', value: '0' }),
  overhead: componentInput.default({ mode: 'fixed', value: '0' }),
  wastePct: fractionString.default('0'),
  notes: optionalText(1000),
  items: z.array(recipeItemInput).max(80).default([]),
  rowVersion: z.number().int().positive().optional(),
});

export const productPreviewInput = productInput.omit({ name: true, rowVersion: true }).extend({
  name: z.string().optional(),
});

export const duplicateProductInput = z.object({ name: nonEmptyName });

export const priceUpdateInput = z.object({
  currentPrice: optionalDecimal,
  targetMargin: fractionString.nullish().transform((v) => v ?? null),
  multiplier: multiplier.nullish().transform((v) => v ?? null),
  rowVersion: z.number().int().positive(),
});

export const pricingCalculateInput = z.object({
  cost: decimalString,
  currentPrice: optionalDecimal,
  targetMargin: fractionString.nullish().transform((v) => v ?? null),
  multiplier: multiplier.nullish().transform((v) => v ?? null),
});

// ---------------------------------------------------------------------------
// Costos fijos y escenarios
// ---------------------------------------------------------------------------
export const fixedCostInput = z.object({
  name: nonEmptyName,
  monthlyAmount: decimalString,
  notes: optionalText(500),
  rowVersion: z.number().int().positive().optional(),
});

export const scenarioInput = z.object({
  name: nonEmptyName,
  productUuid: optionalUuid,
  price: decimalString,
  unitsPerDay: decimalString,
  daysPerMonth: days,
  /** null = usar la suma de costos fijos del negocio */
  fixedCosts: optionalDecimal,
  variableUnitCost: decimalString,
  variableSource: z.enum(['product', 'manual']).default('manual'),
  notes: optionalText(500),
  rowVersion: z.number().int().positive().optional(),
});

export const scenarioCalculateInput = scenarioInput.omit({
  name: true,
  notes: true,
  rowVersion: true,
});

// ---------------------------------------------------------------------------
// Público
// ---------------------------------------------------------------------------
export const contactInput = z.object({
  name: nonEmptyName,
  email,
  business: optionalText(120),
  message: z.string().trim().min(10, { error: 'Escriba al menos 10 caracteres.' }).max(2000),
  /** Campo trampa anti-spam: debe venir vacío. */
  website: z.string().max(0).optional(),
});

// ---------------------------------------------------------------------------
// IA
// ---------------------------------------------------------------------------
export const aiChatInput = z.object({
  conversationUuid: optionalUuid,
  message: z.string().trim().min(1, { error: 'Escriba su pregunta.' }).max(2000),
});

export const aiRecipeDraftInput = z.object({
  text: z.string().trim().min(5, { error: 'Describa la receta.' }).max(2000),
});

export type RegisterInput = z.infer<typeof registerInput>;
export type LoginInput = z.infer<typeof loginInput>;
export type OnboardingBusinessInput = z.infer<typeof onboardingBusinessInput>;
export type IngredientInput = z.infer<typeof ingredientInput>;
export type PurchaseInput = z.infer<typeof purchaseInput>;
export type ProductInput = z.infer<typeof productInput>;
export type ProductPreviewInput = z.infer<typeof productPreviewInput>;
export type ScenarioInput = z.infer<typeof scenarioInput>;
export type ScenarioCalculateInput = z.infer<typeof scenarioCalculateInput>;
export type SupplierInput = z.infer<typeof supplierInput>;
export type FixedCostInput = z.infer<typeof fixedCostInput>;
