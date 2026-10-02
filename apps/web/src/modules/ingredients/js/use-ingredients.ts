import { useMemo, useState } from 'react';
import { canConvert, percentChange } from '@aimargen/calculation-engine';
import { ingredientCostInput, ingredientInput, type IngredientInput } from '@aimargen/schemas';
import {
  useApi,
  useEntityMutation,
  useLocalItem,
  useLocalList,
} from '../../../core/data/js/use-entity';
import {
  fractionToPercentInput,
  formatInputNumber,
  inputToDecimal,
  percentInputToFraction,
  serverFieldErrors,
  todayIso,
  validate,
  type FieldErrors,
} from '../../../core/js/form';
import { errorMessage } from '../../../core/js/api-client';
import {
  ingredientsService,
  type Ingredient,
  type IngredientCategory,
  type IngredientCostInput,
  type PageResult,
  type PriceHistoryEntry,
  type PriceSource,
} from './ingredients.service';
import type { UnitCode } from './units';

/** Controlador del módulo: estado de pantalla, filtros, validación y llamadas al servicio. */

export type IngredientFilter = 'active' | 'missing' | 'archived';

const norm = (s: string | null | undefined) => (s ?? '').toLocaleLowerCase('es');

export function useIngredientList() {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<IngredientFilter>('active');
  const [category, setCategory] = useState('');
  const local = useLocalList<Ingredient>('ingredients', { includeArchived: true });
  // La sincronización guarda solo activos; los archivados se piden a la API cuando hay conexión.
  const archived = useApi<PageResult<Ingredient>>(
    ['ingredients', 'archived'],
    ingredientsService.archivedPath,
  );
  const categories = useLocalList<IngredientCategory>('ingredient_categories');

  const active = useMemo(() => (local.data ?? []).filter((i) => !i.archived), [local.data]);
  const archivedItems = useMemo(() => {
    const activeIds = new Set(active.map((i) => i.uuid));
    return (archived.data?.items ?? []).filter((i) => !activeIds.has(i.uuid));
  }, [archived.data, active]);
  const missingCount = active.filter((i) => i.unitCost === null).length;

  const items = useMemo(() => {
    const term = norm(q.trim());
    const base =
      filter === 'archived'
        ? archivedItems
        : filter === 'missing'
          ? active.filter((i) => i.unitCost === null)
          : active;
    return base.filter(
      (i) =>
        (!category || i.categoryUuid === category) &&
        (!term ||
          norm(i.name).includes(term) ||
          norm(i.categoryName).includes(term) ||
          norm(i.supplierName).includes(term)),
    );
  }, [active, archivedItems, filter, category, q]);

  return {
    isPending: local.isPending,
    error: local.error,
    archivedError: filter === 'archived' ? archived.error : null,
    archivedPending: filter === 'archived' && archived.isPending,
    items,
    activeCount: active.length,
    missingCount,
    archivedCount: archived.data ? archivedItems.length : undefined,
    categories: categories.data ?? [],
    q,
    setQ,
    filter,
    setFilter,
    category,
    setCategory,
  };
}

export function useIngredient(uuid: string | undefined) {
  return useLocalItem<Ingredient>('ingredients', uuid, `/ingredients/${uuid}`);
}

export function useIngredientCategories() {
  return useLocalList<IngredientCategory>('ingredient_categories');
}

export function useSupplierOptions() {
  const q = useLocalList<{ uuid: string; name: string; archived?: boolean }>('suppliers');
  return useMemo(() => (q.data ?? []).map((s) => ({ value: s.uuid, label: s.name })), [q.data]);
}

// ---------------------------------------------------------------------------
// Historial de precios
// ---------------------------------------------------------------------------

export const SOURCE_LABELS: Record<PriceSource, string> = {
  manual: 'Registro manual',
  purchase: 'Compra',
  invoice_ai: 'Factura con IA',
};

export interface HistoryRow extends PriceHistoryEntry {
  key: string;
  /** Variación (fracción, motor de cálculo) contra el costo vigente anterior. */
  change: string | null;
}

export interface ChartPoint {
  date: string;
  value: number;
  label: string;
}

export function useIngredientHistory(uuid: string | undefined) {
  const query = useApi<PriceHistoryEntry[]>(
    ['ingredients', uuid, 'history'],
    uuid ? ingredientsService.historyPath(uuid) : null,
  );
  const view = useMemo(() => {
    const list = query.data ?? [];
    // La API los entrega del más reciente al más antiguo.
    const rows: HistoryRow[] = list.map((h, idx) => {
      const prev = list.slice(idx + 1).find((p) => !p.voided && p.unitCost !== null);
      let change: string | null = null;
      if (!h.voided && h.unitCost !== null && prev?.unitCost) {
        try {
          change = percentChange(prev.unitCost, h.unitCost);
        } catch {
          change = null;
        }
      }
      return { ...h, key: `${h.effectiveAt ?? ''}-${idx}`, change };
    });
    const points: ChartPoint[] = list
      .filter((h) => !h.voided && h.unitCost !== null && h.effectiveAt)
      .map((h) => ({ date: h.effectiveAt!, value: Number(h.unitCost), label: h.unitCost! }))
      .reverse();
    return { rows, points };
  }, [query.data]);
  return { ...query, ...view };
}

// ---------------------------------------------------------------------------
// Formulario de ingrediente
// ---------------------------------------------------------------------------

export interface ConversionRow {
  key: number;
  from: UnitCode;
  to: UnitCode;
  factor: string;
}

export interface IngredientFormValues {
  name: string;
  categoryUuid: string;
  unit: UnitCode;
  yieldPct: string;
  notes: string;
  conversions: ConversionRow[];
  withInitialCost: boolean;
  costPrice: string;
  costQuantity: string;
  costUnit: UnitCode;
  costSupplier: string;
  costDate: string;
}

let convSeq = 0;
export function newConversion(unit: UnitCode): ConversionRow {
  const to: UnitCode = unit === 'unidad' ? 'g' : unit;
  return { key: ++convSeq, from: 'unidad', to, factor: '' };
}

export function toFormValues(i?: Ingredient | null): IngredientFormValues {
  const unit = i?.unit ?? 'kg';
  return {
    name: i?.name ?? '',
    categoryUuid: i?.categoryUuid ?? '',
    unit,
    yieldPct: i ? fractionToPercentInput(i.yield) : '100',
    notes: i?.notes ?? '',
    conversions: (i?.conversions ?? []).map((c) => ({
      key: ++convSeq,
      from: c.from,
      to: c.to,
      factor: formatInputNumber(c.factor),
    })),
    withInitialCost: false,
    costPrice: '',
    costQuantity: '1',
    costUnit: unit,
    costSupplier: '',
    costDate: todayIso(),
  };
}

export function useSaveIngredient(
  existing: Ingredient | null | undefined,
  onSaved: (i: Ingredient) => void,
) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const mutation = useEntityMutation<IngredientInput, Ingredient>({
    entities: ['ingredients', 'products'],
    mutationFn: (input) => {
      if (existing) {
        const { initialCost: _ignored, ...update } = input;
        return ingredientsService.update(existing.uuid, update);
      }
      return ingredientsService.create(input);
    },
    onSuccess: onSaved,
  });

  const submit = (values: IngredientFormValues) => {
    setFormError(null);
    const local: FieldErrors = {};
    values.conversions.forEach((c, idx) => {
      if (c.from === c.to || canConvert(c.from, c.to)) {
        local[`conversions.${idx}.to`] =
          'Estas unidades ya se convierten solas. Elija otra (ej. 1 unidad = 60 g).';
      }
    });
    const v = validate(ingredientInput, {
      name: values.name,
      categoryUuid: values.categoryUuid || null,
      unit: values.unit,
      yield: percentInputToFraction(values.yieldPct) ?? '1',
      notes: values.notes,
      conversions: values.conversions.map((c) => ({
        from: c.from,
        to: c.to,
        factor: inputToDecimal(c.factor) ?? '',
      })),
      rowVersion: existing?.rowVersion,
      initialCost:
        !existing && values.withInitialCost
          ? {
              price: inputToDecimal(values.costPrice) ?? '',
              quantity: inputToDecimal(values.costQuantity) ?? '',
              unit: values.costUnit,
              supplierUuid: values.costSupplier || null,
              date: values.costDate || null,
            }
          : null,
    });
    if (!v.ok || Object.keys(local).length > 0) {
      setErrors({ ...(v.ok ? {} : v.errors), ...local });
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

  return { submit, errors, formError, saving: mutation.isPending };
}

export function useCreateCategory(onCreated: (c: IngredientCategory) => void) {
  const [error, setError] = useState<string | null>(null);
  const mutation = useEntityMutation<string, IngredientCategory>({
    entities: ['ingredient_categories'],
    mutationFn: (name) => ingredientsService.createCategory(name),
    onSuccess: (c) => {
      setError(null);
      onCreated(c);
    },
  });
  const create = (name: string) => {
    if (!name.trim()) {
      setError('Ingrese un nombre.');
      return;
    }
    mutation.mutate(name.trim(), { onError: (e) => setError(errorMessage(e)) });
  };
  return { create, error, saving: mutation.isPending, reset: () => setError(null) };
}

// ---------------------------------------------------------------------------
// Registrar costo
// ---------------------------------------------------------------------------

export interface CostFormValues {
  price: string;
  quantity: string;
  unit: UnitCode;
  supplierUuid: string;
  date: string;
}

export function emptyCostValues(i: Ingredient): CostFormValues {
  return {
    price: '',
    quantity: '1',
    unit: i.unit,
    supplierUuid: i.supplierUuid ?? '',
    date: todayIso(),
  };
}

export function useAddCost(ingredient: Ingredient, onSaved: (i: Ingredient) => void) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const mutation = useEntityMutation<IngredientCostInput, Ingredient>({
    entities: ['ingredients', 'products'],
    mutationFn: (input) => ingredientsService.addCost(ingredient.uuid, input),
    onSuccess: onSaved,
  });
  const submit = (values: CostFormValues) => {
    setFormError(null);
    const v = validate(ingredientCostInput, {
      price: inputToDecimal(values.price) ?? '',
      quantity: inputToDecimal(values.quantity) ?? '',
      unit: values.unit,
      supplierUuid: values.supplierUuid || null,
      date: values.date || null,
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

export function useArchiveIngredient() {
  return useEntityMutation<{ uuid: string; archived: boolean }, Ingredient>({
    entities: ['ingredients', 'products'],
    mutationFn: ({ uuid, archived }) =>
      archived ? ingredientsService.archive(uuid) : ingredientsService.restore(uuid),
  });
}
