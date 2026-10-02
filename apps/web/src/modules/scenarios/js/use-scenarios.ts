import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  fixedCostInput,
  scenarioCalculateInput,
  scenarioInput,
  type FixedCostInput,
  type ScenarioCalculateInput,
  type ScenarioInput,
} from '@aimargen/schemas';
import { Decimal } from '@aimargen/calculation-engine';
import {
  useApi,
  useEntityMutation,
  useLocalItem,
  useLocalList,
} from '../../../core/data/js/use-entity';
import {
  formatInputNumber,
  inputToDecimal,
  serverFieldErrors,
  validate,
  type FieldErrors,
} from '../../../core/js/form';
import { errorMessage } from '../../../core/js/api-client';
import { useTenant } from '../../../core/session/js/session-context';
import {
  FIXED_COSTS_PATH,
  SCENARIOS_PATH,
  fixedCostsService,
  scenariosService,
  type FixedCost,
  type FixedCostList,
  type Scenario,
  type ScenarioProduct,
} from './scenarios.service';

/** Controlador del módulo: listados, simulador en vivo, validación y mutaciones. */

/** Valor que se actualiza solo cuando deja de cambiar por `ms` milisegundos. */
export function useDebouncedValue<T>(value: T, ms = 400): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// ---------------------------------------------------------------------------
// Escenarios
// ---------------------------------------------------------------------------

export function useScenarioList() {
  const list = useLocalList<Scenario>('scenarios');
  // Resultados calculados por la API (utilidad y equilibrio) para enriquecer el listado.
  const results = useApi<Scenario[]>(['scenarios', 'results'], SCENARIOS_PATH);
  const byUuid = useMemo(
    () => new Map((results.data ?? []).map((s) => [s.uuid, s.result ?? null])),
    [results.data],
  );
  return { ...list, items: list.data ?? [], resultFor: (uuid: string) => byUuid.get(uuid) };
}

export function useScenario(uuid: string | undefined) {
  return useLocalItem<Scenario>('scenarios', uuid, `/scenarios/${uuid}`);
}

export function useScenarioProducts() {
  return useLocalList<ScenarioProduct>('products');
}

export type VariableMode = 'product' | 'manual';
export type FixedMode = 'business' | 'custom';

export interface ScenarioFormValues {
  name: string;
  productUuid: string;
  price: string;
  variableMode: VariableMode;
  variableUnitCost: string;
  unitsPerDay: string;
  daysPerMonth: string;
  fixedMode: FixedMode;
  fixedCosts: string;
  notes: string;
}

export function toScenarioForm(
  s: Scenario | null | undefined,
  defaults: { days: number; product?: ScenarioProduct | null },
): ScenarioFormValues {
  if (s) {
    return {
      name: s.name,
      productUuid: s.productUuid ?? '',
      price: formatInputNumber(s.price),
      variableMode: s.productUuid && s.variableSource === 'product' ? 'product' : 'manual',
      variableUnitCost: formatInputNumber(s.variableUnitCost),
      unitsPerDay: formatInputNumber(s.unitsPerDay),
      daysPerMonth: String(s.daysPerMonth),
      fixedMode: s.fixedCosts === null ? 'business' : 'custom',
      fixedCosts: formatInputNumber(s.fixedCosts),
      notes: s.notes ?? '',
    };
  }
  const p = defaults.product;
  return {
    name: p ? `Ventas de ${p.name}` : '',
    productUuid: p?.uuid ?? '',
    price: formatInputNumber(p?.currentPrice),
    variableMode: p?.costPerPortion ? 'product' : 'manual',
    variableUnitCost: formatInputNumber(p?.costPerPortion),
    unitsPerDay: '',
    daysPerMonth: String(defaults.days),
    fixedMode: 'business',
    fixedCosts: '',
    notes: '',
  };
}

/** Convierte el formulario en la entrada de cálculo de la API (sin validar). */
function toCalcInput(v: ScenarioFormValues, product: ScenarioProduct | null) {
  const fromProduct = v.variableMode === 'product' && !!product?.costPerPortion;
  return {
    productUuid: v.productUuid || null,
    price: inputToDecimal(v.price) ?? '',
    unitsPerDay: inputToDecimal(v.unitsPerDay) ?? '',
    daysPerMonth: v.daysPerMonth.trim(),
    fixedCosts: v.fixedMode === 'business' ? null : (inputToDecimal(v.fixedCosts) ?? ''),
    variableUnitCost: fromProduct
      ? (product?.costPerPortion ?? '')
      : (inputToDecimal(v.variableUnitCost) ?? ''),
    variableSource: fromProduct ? ('product' as const) : ('manual' as const),
  };
}

/** Ajusta un número escrito por el usuario en un porcentaje (atajos ±10 %). */
export function nudge(input: string, factor: string, decimals: number): string {
  const d = inputToDecimal(input);
  if (d === null) return input;
  try {
    const next = Decimal.max(0, new Decimal(d).mul(factor)).toDecimalPlaces(decimals);
    return formatInputNumber(next.toString());
  } catch {
    return input;
  }
}

/** Estado del simulador: formulario, cálculo en vivo (debounced) y guardado. */
export function useScenarioEditor(
  existing: Scenario | null | undefined,
  initial: ScenarioFormValues,
  onSaved: (s: Scenario) => void,
) {
  const products = useScenarioProducts();
  const [values, setValues] = useState<ScenarioFormValues>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const product = useMemo(
    () => (products.data ?? []).find((p) => p.uuid === values.productUuid) ?? null,
    [products.data, values.productUuid],
  );

  const set = <K extends keyof ScenarioFormValues>(k: K, value: ScenarioFormValues[K]) =>
    setValues((v) => ({ ...v, [k]: value }));

  /** Al elegir un producto se precargan su precio y su costo por porción. */
  const selectProduct = (uuid: string) => {
    const p = (products.data ?? []).find((x) => x.uuid === uuid) ?? null;
    setValues((v) => ({
      ...v,
      productUuid: uuid,
      price: p?.currentPrice ? formatInputNumber(p.currentPrice) : v.price,
      variableMode: p?.costPerPortion ? 'product' : 'manual',
      variableUnitCost: p?.costPerPortion
        ? formatInputNumber(p.costPerPortion)
        : v.variableUnitCost,
      name: v.name.trim() ? v.name : p ? `Ventas de ${p.name}` : v.name,
    }));
  };

  const calcRaw = useMemo(() => toCalcInput(values, product), [values, product]);
  const parsed = useMemo(() => validate(scenarioCalculateInput, calcRaw), [calcRaw]);
  const calcInput: ScenarioCalculateInput | null = parsed.ok ? parsed.data : null;
  const debounced = useDebouncedValue(calcInput, 400);
  const calc = useQuery({
    queryKey: ['scenario-calc', debounced],
    enabled: debounced !== null,
    queryFn: ({ signal }) => scenariosService.calculate(debounced!, signal),
    placeholderData: keepPreviousData,
    retry: false,
  });
  const calculating = calc.isFetching || (calcInput !== null && calcInput !== debounced);

  const mutation = useEntityMutation<ScenarioInput, Scenario>({
    entities: ['scenarios'],
    mutationFn: (input) =>
      existing ? scenariosService.update(existing.uuid, input) : scenariosService.create(input),
    onSuccess: onSaved,
  });

  const submit = () => {
    setFormError(null);
    const v = validate(scenarioInput, {
      ...calcRaw,
      name: values.name,
      notes: values.notes,
      rowVersion: existing?.rowVersion,
    });
    if (!v.ok) {
      setErrors(v.errors);
      return;
    }
    setErrors({});
    mutation.mutate(v.data, {
      onError: (e) => {
        const fields = serverFieldErrors(e);
        if (fields) setErrors(fields);
        else setFormError(errorMessage(e));
      },
    });
  };

  return {
    values,
    set,
    selectProduct,
    product,
    products: products.data ?? [],
    productsPending: products.isPending,
    /** Errores de entrada visibles mientras se escribe (solo si el campo tiene texto). */
    liveErrors: parsed.ok ? {} : parsed.errors,
    result: calcInput ? calc.data : undefined,
    calcError: calcInput && calc.error ? errorMessage(calc.error) : null,
    calculating,
    ready: calcInput !== null,
    submit,
    errors,
    formError,
    saving: mutation.isPending,
  };
}

export function useArchiveScenario() {
  return useEntityMutation<string, Scenario>({
    entities: ['scenarios'],
    mutationFn: (uuid) => scenariosService.archive(uuid),
  });
}

/** Días de operación por defecto del negocio (configuración) o 26. */
export function useDefaultDays(): number {
  const { tenant } = useTenant();
  return tenant.settings.operatingDays ?? 26;
}

// ---------------------------------------------------------------------------
// Costos fijos
// ---------------------------------------------------------------------------

export function useFixedCosts() {
  const list = useLocalList<FixedCost>('fixed_costs');
  // El total lo suma la API (la UI no calcula montos).
  const total = useApi<FixedCostList>(['fixed_costs', 'total'], FIXED_COSTS_PATH);
  return { ...list, items: list.data ?? [], total: total.data?.total ?? null };
}

export interface FixedCostFormValues {
  name: string;
  monthlyAmount: string;
  notes: string;
}

export function toFixedCostForm(f?: FixedCost | null): FixedCostFormValues {
  return {
    name: f?.name ?? '',
    monthlyAmount: formatInputNumber(f?.monthlyAmount),
    notes: f?.notes ?? '',
  };
}

export function useSaveFixedCost(
  existing: FixedCost | null | undefined,
  onSaved: (f: FixedCost) => void,
) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const mutation = useEntityMutation<FixedCostInput, FixedCost>({
    entities: ['fixed_costs'],
    invalidate: ['scenarios'],
    mutationFn: (input) =>
      existing ? fixedCostsService.update(existing.uuid, input) : fixedCostsService.create(input),
    onSuccess: onSaved,
  });
  const submit = (values: FixedCostFormValues) => {
    setFormError(null);
    const v = validate(fixedCostInput, {
      name: values.name,
      monthlyAmount: inputToDecimal(values.monthlyAmount) ?? '',
      notes: values.notes,
      rowVersion: existing?.rowVersion,
    });
    if (!v.ok) {
      setErrors(v.errors);
      return;
    }
    setErrors({});
    mutation.mutate(v.data, {
      onError: (e) => {
        const fields = serverFieldErrors(e);
        if (fields) setErrors(fields);
        else setFormError(errorMessage(e));
      },
    });
  };
  const reset = () => {
    setErrors({});
    setFormError(null);
  };
  return { submit, errors, formError, saving: mutation.isPending, reset };
}

export function useArchiveFixedCost() {
  return useEntityMutation<string, FixedCost>({
    entities: ['fixed_costs'],
    invalidate: ['scenarios'],
    mutationFn: (uuid) => fixedCostsService.archive(uuid),
  });
}
