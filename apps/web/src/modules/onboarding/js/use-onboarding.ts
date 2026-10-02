import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import {
  BUSINESS_TYPES,
  ingredientInput,
  onboardingBusinessInput,
  productInput,
  productPreviewInput,
  settingsUpdateInput,
  tenantUpdateInput,
} from '@aimargen/schemas';
import { useEntityMutation, useLocalList } from '../../../core/data/js/use-entity';
import { errorMessage } from '../../../core/js/api-client';
import {
  fractionToPercentInput,
  inputToDecimal,
  percentInputToFraction,
  serverFieldErrors,
  validate,
  type FieldErrors,
} from '../../../core/js/form';
import { useSession } from '../../../core/session/js/session-context';
import { onboardingService, type Ingredient, type Product } from './onboarding.service';

/** Controlador del onboarding: pasos del asistente, formularios y llamadas al servicio. */

// ---------------------------------------------------------------------------
// Catálogos con etiquetas en español
// ---------------------------------------------------------------------------

export type BusinessType = (typeof BUSINESS_TYPES)[number];

const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  restaurant: 'Restaurante',
  soda: 'Soda',
  cafe: 'Cafetería',
  bakery: 'Panadería',
  pastry: 'Repostería o pastelería',
  food_truck: 'Food truck o venta ambulante',
  catering: 'Catering o servicio de eventos',
  other: 'Otro tipo de negocio',
};

export const BUSINESS_TYPE_OPTIONS = BUSINESS_TYPES.map((value) => ({
  value,
  label: BUSINESS_TYPE_LABELS[value],
}));

export type UnitCode = 'g' | 'kg' | 'ml' | 'l' | 'unidad';

const UNIT_NAMES: Record<UnitCode, string> = {
  g: 'Gramos (g)',
  kg: 'Kilos (kg)',
  ml: 'Mililitros (ml)',
  l: 'Litros (L)',
  unidad: 'Unidades',
};

/** Unidades que se pueden convertir entre sí (mismo tipo de medida). */
const UNIT_FAMILY: Record<UnitCode, UnitCode[]> = {
  g: ['g', 'kg'],
  kg: ['g', 'kg'],
  ml: ['ml', 'l'],
  l: ['ml', 'l'],
  unidad: ['unidad'],
};

export const UNIT_OPTIONS = (Object.keys(UNIT_NAMES) as UnitCode[]).map((value) => ({
  value,
  label: UNIT_NAMES[value],
}));

export function compatibleUnitOptions(unit: string) {
  const family = UNIT_FAMILY[unit as UnitCode] ?? [unit as UnitCode];
  return family.map((value) => ({ value, label: UNIT_NAMES[value] ?? value }));
}

/** Unidad sugerida para la receta: las recetas suelen medirse en g / ml. */
function recipeUnitFor(unit: string): UnitCode {
  if (unit === 'kg') return 'g';
  if (unit === 'l') return 'ml';
  return (unit as UnitCode) ?? 'unidad';
}

// ---------------------------------------------------------------------------
// Asistente
// ---------------------------------------------------------------------------

export const STEPS = [
  { n: 1, label: 'Negocio' },
  { n: 2, label: 'Configuración' },
  { n: 3, label: 'Ingrediente' },
  { n: 4, label: 'Receta' },
  { n: 5, label: 'Resultado' },
] as const;

export type StepNumber = 1 | 2 | 3 | 4 | 5;

/**
 * Estado del asistente (solo en memoria). Al recargar se retoma según la sesión:
 * sin negocio → paso 1; con negocio sin terminar → paso 2.
 */
export function useWizard() {
  const { me } = useSession();
  const [step, setStep] = useState<StepNumber>(() => (me?.tenant ? 2 : 1));
  const [ingredient, setIngredient] = useState<Ingredient | null>(null);
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  return {
    step,
    goTo: setStep,
    next: () => setStep((s) => Math.min(5, s + 1) as StepNumber),
    back: () => setStep((s) => Math.max(1, s - 1) as StepNumber),
    ingredient,
    setIngredient,
    product,
    setProduct,
    hasTenant: !!me?.tenant,
    userName: me?.user.name ?? '',
    currency: me?.tenant?.currency ?? 'CRC',
  };
}

// ---------------------------------------------------------------------------
// Paso 1 — Negocio
// ---------------------------------------------------------------------------

export interface BusinessValues {
  name: string;
  businessType: BusinessType | '';
}

export function useBusinessStep(onDone: () => void) {
  const { me, reload } = useSession();
  const tenant = me?.tenant ?? null;
  const [values, setValues] = useState<BusinessValues>(() => ({
    name: tenant?.name ?? '',
    businessType: (tenant?.businessType as BusinessType | null) ?? '',
  }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (): Promise<void> => {
      if (tenant) {
        const v = validate(tenantUpdateInput, {
          name: values.name,
          businessType: values.businessType,
          legalName: tenant.legalName,
          email: tenant.email,
          phone: tenant.phone,
          country: tenant.country,
          currency: tenant.currency,
          timezone: tenant.timezone,
          rowVersion: tenant.rowVersion,
        });
        if (!v.ok) throw new FieldValidation(v.errors);
        await onboardingService.updateTenant(v.data);
      } else {
        const v = validate(onboardingBusinessInput, {
          name: values.name,
          businessType: values.businessType,
        });
        if (!v.ok) throw new FieldValidation(v.errors);
        await onboardingService.createBusiness(v.data);
      }
      // El negocio nuevo (y su token reemitido) pasa a la sesión.
      await reload();
    },
  });

  const submit = () => {
    setFormError(null);
    setErrors({});
    mutation.mutate(undefined, {
      onSuccess: onDone,
      onError: (e) => handleError(e, setErrors, setFormError),
    });
  };

  return {
    values,
    set: <K extends keyof BusinessValues>(k: K, v: BusinessValues[K]) =>
      setValues((s) => ({ ...s, [k]: v })),
    errors,
    formError,
    submit,
    saving: mutation.isPending,
    editing: !!tenant,
  };
}

// ---------------------------------------------------------------------------
// Paso 2 — Configuración base
// ---------------------------------------------------------------------------

export type CostMethod = 'last_purchase' | 'weighted_average';

export interface SettingsValues {
  targetMargin: string;
  operatingDays: string;
  costMethod: CostMethod;
}

export const COST_METHOD_OPTIONS: Array<{ value: CostMethod; label: string; description: string }> =
  [
    {
      value: 'last_purchase',
      label: 'Precio de la última compra',
      description:
        'Cada vez que registra una compra, el costo del ingrediente pasa a ser el precio que acaba de pagar. Recomendado si los precios cambian seguido.',
    },
    {
      value: 'weighted_average',
      label: 'Promedio de compras',
      description:
        'El costo se suaviza mezclando lo que ya tenía con lo que compra, según la cantidad. Útil si compra en cantidades muy distintas.',
    },
  ];

export function useSettingsStep(onDone: () => void) {
  const { me, reload } = useSession();
  const settings = me?.tenant?.settings;
  const [values, setValues] = useState<SettingsValues>(() => ({
    targetMargin: settings?.targetMargin ? fractionToPercentInput(settings.targetMargin) : '35',
    operatingDays: settings?.operatingDays ? String(settings.operatingDays) : '26',
    costMethod: settings?.costMethod ?? 'last_purchase',
  }));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!settings) throw new Error('Sin negocio');
      const v = validate(settingsUpdateInput, {
        targetMargin: percentInputToFraction(values.targetMargin),
        operatingDays: inputToDecimal(values.operatingDays),
        roundingScale: settings.roundingScale,
        costMethod: values.costMethod,
        rowVersion: settings.rowVersion,
      });
      if (!v.ok) throw new FieldValidation(v.errors);
      await onboardingService.updateSettings(v.data);
      await reload();
    },
  });

  const submit = () => {
    setFormError(null);
    setErrors({});
    mutation.mutate(undefined, {
      onSuccess: onDone,
      onError: (e) => handleError(e, setErrors, setFormError),
    });
  };

  return {
    values,
    set: <K extends keyof SettingsValues>(k: K, v: SettingsValues[K]) =>
      setValues((s) => ({ ...s, [k]: v })),
    errors,
    formError,
    submit,
    saving: mutation.isPending,
  };
}

// ---------------------------------------------------------------------------
// Paso 3 — Primer ingrediente
// ---------------------------------------------------------------------------

export interface IngredientValues {
  name: string;
  unit: UnitCode;
  price: string;
  quantity: string;
  purchaseUnit: UnitCode;
}

export function useIngredientStep(onDone: (i: Ingredient) => void) {
  const [values, setValues] = useState<IngredientValues>({
    name: '',
    unit: 'kg',
    price: '',
    quantity: '1',
    purchaseUnit: 'kg',
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const mutation = useEntityMutation({
    entities: ['ingredients'],
    mutationFn: onboardingService.createIngredient,
    onSuccess: (i: Ingredient) => onDone(i),
  });

  const set = <K extends keyof IngredientValues>(k: K, v: IngredientValues[K]) =>
    setValues((s) => {
      const next = { ...s, [k]: v };
      // Al cambiar la unidad del ingrediente, la compra pasa a una unidad compatible.
      if (k === 'unit' && !UNIT_FAMILY[next.unit].includes(next.purchaseUnit)) {
        next.purchaseUnit = next.unit;
      }
      return next;
    });

  const submit = () => {
    setFormError(null);
    const v = validate(ingredientInput, {
      name: values.name,
      unit: values.unit,
      initialCost: {
        price: inputToDecimal(values.price) ?? '',
        quantity: inputToDecimal(values.quantity) ?? '',
        unit: values.purchaseUnit,
      },
    });
    if (!v.ok) {
      setErrors(v.errors);
      return;
    }
    setErrors({});
    mutation.mutate(v.data, {
      onError: (e) => handleError(e, setErrors, setFormError),
    });
  };

  return {
    values,
    set,
    errors,
    formError,
    submit,
    saving: mutation.isPending,
    purchaseUnits: compatibleUnitOptions(values.unit),
  };
}

// ---------------------------------------------------------------------------
// Paso 4 — Primera receta
// ---------------------------------------------------------------------------

export interface RecipeValues {
  name: string;
  portions: string;
  ingredientUuid: string;
  quantity: string;
  unit: UnitCode | '';
  price: string;
}

/** Retrasa un valor para no calcular en cada tecla. */
function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function recipePayload(values: RecipeValues) {
  return {
    name: values.name,
    portions: inputToDecimal(values.portions) ?? '',
    currentPrice: inputToDecimal(values.price),
    items: values.ingredientUuid
      ? [
          {
            ingredientUuid: values.ingredientUuid,
            quantity: inputToDecimal(values.quantity) ?? '',
            unit: values.unit,
          },
        ]
      : [],
  };
}

export function useRecipeStep(created: Ingredient | null, onDone: (p: Product) => void) {
  const list = useLocalList<Ingredient>('ingredients');
  const ingredients = useMemo(() => {
    const rest = (list.data ?? []).filter((i) => i.uuid !== created?.uuid);
    return created ? [created, ...rest] : rest;
  }, [list.data, created]);

  // Valores escritos; ingrediente y unidad vacíos = usar el predeterminado.
  const [raw, setRaw] = useState<RecipeValues>(() => ({
    name: '',
    portions: '1',
    ingredientUuid: created?.uuid ?? '',
    quantity: '',
    unit: '',
    price: '',
  }));
  const ingredientUuid = raw.ingredientUuid || ingredients[0]?.uuid || '';
  const selected = ingredients.find((i) => i.uuid === ingredientUuid) ?? null;
  const values = useMemo<RecipeValues>(
    () => ({
      ...raw,
      ingredientUuid,
      unit: raw.unit || (selected ? recipeUnitFor(selected.unit) : 'unidad'),
    }),
    [raw, ingredientUuid, selected],
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const set = <K extends keyof RecipeValues>(k: K, v: RecipeValues[K]) =>
    setRaw((s) => ({ ...s, [k]: v, ...(k === 'ingredientUuid' ? { unit: '' as const } : {}) }));

  // Vista previa del costo calculada por la API (motor único), con retraso.
  const debounced = useDebounced(values, 400);
  const previewInput = useMemo(() => {
    const v = validate(productPreviewInput, recipePayload(debounced));
    return v.ok && v.data.items.length > 0 ? v.data : null;
  }, [debounced]);
  const preview = useQuery({
    queryKey: ['onboarding', 'preview', previewInput],
    queryFn: () => onboardingService.previewProduct(previewInput!),
    enabled: previewInput !== null,
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });

  const mutation = useEntityMutation({
    entities: ['products'],
    mutationFn: onboardingService.createProduct,
    onSuccess: (p: Product) => onDone(p),
  });

  const submit = () => {
    setFormError(null);
    const v = validate(productInput, recipePayload(values));
    const next: FieldErrors = v.ok ? {} : { ...v.errors };
    if (!values.ingredientUuid) next['items.0.ingredientUuid'] = 'Elija un ingrediente.';
    if (!v.ok || Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});
    mutation.mutate(v.data, {
      onError: (e) => handleError(e, setErrors, setFormError),
    });
  };

  return {
    values,
    set,
    errors,
    formError,
    submit,
    saving: mutation.isPending,
    ingredients,
    ingredientsLoading: list.isPending,
    selected,
    recipeUnits: compatibleUnitOptions(selected?.unit ?? (values.unit || 'unidad')),
    preview: previewInput ? preview.data : undefined,
    previewLoading: previewInput !== null && preview.isFetching,
    previewError: previewInput && preview.error ? errorMessage(preview.error) : null,
  };
}

// ---------------------------------------------------------------------------
// Paso 5 — Resultado
// ---------------------------------------------------------------------------

export function useResultStep(product: Product | null) {
  const { reload, me } = useSession();
  const navigate = useNavigate();
  const detail = useQuery({
    queryKey: ['onboarding', 'product', product?.uuid],
    queryFn: () => onboardingService.getProduct(product!.uuid),
    enabled: !!product,
  });
  const finish = useMutation({
    mutationFn: async () => {
      await onboardingService.complete();
      await reload();
    },
    onSuccess: () => navigate('/app', { replace: true }),
  });
  return {
    detail,
    finish: () => finish.mutate(),
    finishing: finish.isPending,
    finishError: finish.error ? errorMessage(finish.error) : null,
    targetMargin: me?.tenant?.settings.targetMargin ?? null,
  };
}

// ---------------------------------------------------------------------------
// Errores
// ---------------------------------------------------------------------------

/** Errores de validación local lanzados dentro de una mutación. */
class FieldValidation extends Error {
  readonly fields: FieldErrors;
  constructor(fields: FieldErrors) {
    super('validation');
    this.fields = fields;
  }
}

function handleError(
  e: unknown,
  setErrors: (f: FieldErrors) => void,
  setFormError: (m: string | null) => void,
) {
  if (e instanceof FieldValidation) {
    setErrors(e.fields);
    return;
  }
  const fields = serverFieldErrors(e);
  if (fields) setErrors(fields);
  else setFormError(errorMessage(e));
}
