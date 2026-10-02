import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { compatibleUnits, isUnitCode, type CustomConversion } from '@aimargen/calculation-engine';
import {
  categoryInput,
  productInput,
  productPreviewInput,
  type ProductInput,
  type ProductPreviewInput,
} from '@aimargen/schemas';
import { useApi, useEntityMutation, useLocalList } from '../../../core/data/js/use-entity';
import {
  formatInputNumber,
  fractionToPercentInput,
  inputToDecimal,
  percentInputToFraction,
  serverFieldErrors,
  validate,
  type FieldErrors,
} from '../../../core/js/form';
import { errorMessage } from '../../../core/js/api-client';
import { formatDecimal } from '../../../core/js/format';
import {
  productsService,
  type Category,
  type ComponentMode,
  type CostComponent,
  type IngredientOption,
  type PriceUpdate,
  type Product,
  type ProductDetail,
  type ProductStatus,
} from './products.service';

/** Controlador del módulo Productos: filtros, editor de recetas, vista previa y mutaciones. */

// ---------------------------------------------------------------------------
// Estados de rentabilidad (textos para la vista; los estados los calcula la API)
// ---------------------------------------------------------------------------

export const STATUS_META: Record<
  ProductStatus,
  { label: string; tone: 'positive' | 'warning' | 'danger' | 'neutral' | 'info'; explain: string }
> = {
  healthy: {
    label: 'Saludable',
    tone: 'positive',
    explain: 'El precio cubre el costo y alcanza su margen objetivo.',
  },
  below_target: {
    label: 'Bajo objetivo',
    tone: 'warning',
    explain:
      'Gana dinero en cada venta, pero menos de lo que se propuso. Revise el precio sugerido para alcanzar su margen objetivo.',
  },
  below_cost: {
    label: 'Bajo costo',
    tone: 'danger',
    explain:
      'El precio es menor de lo que cuesta hacer el producto: cada venta le hace perder dinero.',
  },
  no_price: {
    label: 'Sin precio',
    tone: 'neutral',
    explain: 'Aún no tiene precio de venta. Puede aplicar uno de los precios sugeridos.',
  },
  incomplete: {
    label: 'Incompleto',
    tone: 'info',
    explain:
      'A uno o más ingredientes les falta el costo o la unidad no se puede convertir. El costo real puede ser mayor al que se muestra.',
  },
};

// ---------------------------------------------------------------------------
// Listado
// ---------------------------------------------------------------------------

export type StatusFilter =
  'all' | 'below_cost' | 'below_target' | 'no_price' | 'incomplete' | 'archived';
const STATUS_FILTERS: StatusFilter[] = [
  'all',
  'below_cost',
  'below_target',
  'no_price',
  'incomplete',
  'archived',
];

export function useProductList() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const rawStatus = params.get('status') as StatusFilter | null;
  const status: StatusFilter = rawStatus && STATUS_FILTERS.includes(rawStatus) ? rawStatus : 'all';
  const category = params.get('category') ?? 'all';

  // El cache local no guarda archivados (la sincronización los elimina): se piden a la API.
  const query = useLocalList<Product>('products');
  const archivedQuery = useApi<{ items: Product[]; total: number }>(
    ['products', 'archived'],
    '/products?filter=archived&pageSize=100',
  );
  const categories = useLocalList<Category>('product_categories');

  const setParam = (key: string, value: string) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (value === 'all') next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );

  const all = useMemo(
    () => [...(query.data ?? []), ...(archivedQuery.data?.items ?? [])],
    [query.data, archivedQuery.data],
  );
  const active = query.data ?? [];
  const inCategory = (p: Product) => category === 'all' || p.categoryUuid === category;

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = {
      all: 0,
      below_cost: 0,
      below_target: 0,
      no_price: 0,
      incomplete: 0,
      archived: 0,
    };
    for (const p of all) {
      if (!inCategory(p)) continue;
      if (p.archived) {
        c.archived++;
        continue;
      }
      c.all++;
      if (p.pricing.status !== 'healthy') c[p.pricing.status]++;
    }
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, category]);

  const items = useMemo(() => {
    const term = q.trim().toLocaleLowerCase('es');
    return all.filter((p) => {
      if (status === 'archived' ? !p.archived : p.archived) return false;
      if (status !== 'all' && status !== 'archived' && p.pricing.status !== status) return false;
      if (!inCategory(p)) return false;
      return (
        !term ||
        p.name.toLocaleLowerCase('es').includes(term) ||
        (p.categoryName ?? '').toLocaleLowerCase('es').includes(term)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, q, status, category]);

  return {
    ...query,
    items,
    total: active.length,
    totalAll: all.length,
    counts,
    q,
    setQ,
    status,
    setStatus: (v: StatusFilter) => setParam('status', v),
    category,
    setCategory: (v: string) => setParam('category', v),
    categories: categories.data ?? [],
  };
}

// ---------------------------------------------------------------------------
// Detalle
// ---------------------------------------------------------------------------

/** Detalle con desglose en vivo: siempre desde la API (el cache local no trae el desglose). */
export function useProductDetail(uuid: string | undefined) {
  return useApi<ProductDetail>(['products', uuid], uuid ? `/products/${uuid}` : null);
}

// ---------------------------------------------------------------------------
// Editor de recetas
// ---------------------------------------------------------------------------

export interface LineValues {
  key: string;
  ingredientUuid: string;
  quantity: string;
  unit: string;
}

export interface ComponentValues {
  mode: ComponentMode;
  value: string;
}

export interface RecipeFormValues {
  name: string;
  categoryUuid: string;
  portions: string;
  lines: LineValues[];
  packaging: ComponentValues;
  labor: ComponentValues;
  overhead: ComponentValues;
  wastePct: string;
  targetMargin: string;
  multiplier: string;
  currentPrice: string;
  notes: string;
}

let lineSeq = 0;
export const newLine = (): LineValues => ({
  key: `l${++lineSeq}`,
  ingredientUuid: '',
  quantity: '',
  unit: '',
});

const componentToForm = (c: CostComponent | undefined): ComponentValues => {
  if (!c) return { mode: 'fixed', value: '' };
  const isZero = Number(c.value) === 0;
  return {
    mode: c.mode,
    value: isZero
      ? ''
      : c.mode === 'percent'
        ? fractionToPercentInput(c.value)
        : formatInputNumber(c.value),
  };
};

export function toFormValues(p?: ProductDetail | null): RecipeFormValues {
  return {
    name: p?.name ?? '',
    categoryUuid: p?.categoryUuid ?? '',
    portions: p ? formatInputNumber(p.portions) : '1',
    lines:
      p && p.items.length > 0
        ? p.items.map((i) => ({
            ...newLine(),
            ingredientUuid: i.ingredientUuid,
            quantity: formatInputNumber(i.quantity),
            unit: i.unit,
          }))
        : [newLine()],
    packaging: componentToForm(p?.packaging),
    labor: componentToForm(p?.labor),
    overhead: componentToForm(p?.overhead),
    wastePct: p && Number(p.wastePct) > 0 ? fractionToPercentInput(p.wastePct) : '',
    targetMargin: fractionToPercentInput(p?.targetMargin),
    multiplier: formatInputNumber(p?.multiplier),
    currentPrice: priceToInput(p?.currentPrice),
    notes: p?.notes ?? '',
  };
}

function componentToInput(c: ComponentValues) {
  const value =
    (c.mode === 'percent' ? percentInputToFraction(c.value) : inputToDecimal(c.value)) ?? '0';
  return { mode: c.mode, value };
}

/** Líneas que se pueden enviar (con ingrediente elegido), con su posición en el formulario. */
function filledLines(values: RecipeFormValues) {
  return values.lines.filter((l) => l.ingredientUuid);
}

/** Convierte el formulario (formato local) a la entrada de la API (strings decimales). */
function toInput(
  values: RecipeFormValues,
  onlyCompleteLines: boolean,
  keepPrice?: { text: string; value: string | null },
) {
  const lines = filledLines(values).filter(
    (l) => !onlyCompleteLines || (inputToDecimal(l.quantity) !== null && l.unit),
  );
  return {
    lines,
    input: {
      name: values.name,
      categoryUuid: values.categoryUuid || null,
      portions: inputToDecimal(values.portions) ?? '',
      // Si el precio no se tocó se envía el valor exacto guardado (el campo lo muestra redondeado).
      currentPrice:
        keepPrice && values.currentPrice === keepPrice.text
          ? keepPrice.value
          : inputToDecimal(values.currentPrice),
      targetMargin: percentInputToFraction(values.targetMargin),
      multiplier: inputToDecimal(values.multiplier),
      packaging: componentToInput(values.packaging),
      labor: componentToInput(values.labor),
      overhead: componentToInput(values.overhead),
      wastePct: percentInputToFraction(values.wastePct) ?? '0',
      notes: values.notes.trim() || null,
      items: lines.map((l) => ({
        ingredientUuid: l.ingredientUuid,
        quantity: inputToDecimal(l.quantity) ?? '',
        unit: l.unit,
      })),
    },
  };
}

/** Traduce "items.2.quantity" (índice del envío) a "line.<key>.quantity" (fila del formulario). */
function mapLineErrors(errors: FieldErrors, lines: LineValues[]): FieldErrors {
  const out: FieldErrors = {};
  for (const [k, msg] of Object.entries(errors)) {
    const m = /^items\.(\d+)\.(\w+)$/.exec(k);
    const line = m ? lines[Number(m[1])] : undefined;
    if (m && line) out[`line.${line.key}.${m[2]}`] = msg;
    else out[k] = msg;
  }
  return out;
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Ingredientes disponibles para el selector (activos, más los ya usados aunque estén archivados). */
export function useIngredientOptions() {
  const q = useLocalList<IngredientOption>('ingredients', { includeArchived: true });
  const byUuid = useMemo(() => new Map((q.data ?? []).map((i) => [i.uuid, i])), [q.data]);
  return { ...q, items: q.data ?? [], byUuid };
}

/** Unidades en que se puede escribir la cantidad de un ingrediente (misma dimensión o conversión propia). */
export function unitsFor(ing: IngredientOption | undefined): string[] {
  if (!ing) return [];
  const conv: CustomConversion[] = ing.conversions
    .filter((c) => isUnitCode(c.from) && isUnitCode(c.to))
    .map((c) => ({
      from: c.from as CustomConversion['from'],
      to: c.to as CustomConversion['to'],
      factor: c.factor,
    }));
  try {
    return compatibleUnits(ing.unit, conv);
  } catch {
    return [ing.unit];
  }
}

/**
 * Estado del editor de recetas: valores, líneas, vista previa en vivo (POST /products/preview
 * con 400 ms de espera) y guardado con los mismos esquemas de la API.
 */
export function useRecipeEditor(
  existing: ProductDetail | null,
  onSaved: (p: ProductDetail) => void,
) {
  const [values, setValues] = useState<RecipeFormValues>(() => toFormValues(existing));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const ingredients = useIngredientOptions();
  const keepPrice = useMemo(
    () =>
      existing
        ? { text: priceToInput(existing.currentPrice), value: existing.currentPrice }
        : undefined,
    [existing],
  );

  const set = <K extends keyof RecipeFormValues>(k: K, v: RecipeFormValues[K]) =>
    setValues((s) => ({ ...s, [k]: v }));

  const setLine = (key: string, patch: Partial<LineValues>) =>
    setValues((s) => ({
      ...s,
      lines: s.lines.map((l) => {
        if (l.key !== key) return l;
        const next = { ...l, ...patch };
        // Al cambiar de ingrediente se propone su unidad (o se conserva si es compatible).
        if (patch.ingredientUuid !== undefined && patch.ingredientUuid !== l.ingredientUuid) {
          const units = unitsFor(ingredients.byUuid.get(patch.ingredientUuid));
          if (!units.includes(next.unit)) {
            next.unit = ingredients.byUuid.get(patch.ingredientUuid)?.unit ?? '';
          }
        }
        return next;
      }),
    }));
  const addLine = () => setValues((s) => ({ ...s, lines: [...s.lines, newLine()] }));
  const removeLine = (key: string) =>
    setValues((s) => {
      const lines = s.lines.filter((l) => l.key !== key);
      return { ...s, lines: lines.length ? lines : [newLine()] };
    });

  // --- Vista previa en vivo -------------------------------------------------
  const previewPayload = useMemo(() => {
    const { input, lines } = toInput(values, true, keepPrice);
    const { name: _n, ...rest } = input;
    const v = validate(productPreviewInput, rest);
    return v.ok
      ? { ok: true as const, data: v.data, lines }
      : { ok: false as const, errors: v.errors, lines };
  }, [values, keepPrice]);

  const debounced = useDebounced(previewPayload, 400);
  const preview = useQuery({
    queryKey: ['api', 'products', 'preview', debounced.ok ? debounced.data : null],
    enabled: debounced.ok,
    queryFn: () => productsService.preview(debounced.data as ProductPreviewInput),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  const previewStale = previewPayload !== debounced || preview.isFetching;

  /** Costo de cada fila del formulario según la última vista previa. */
  const lineCosts = useMemo(() => {
    const m = new Map<string, { cost: string | null; missing: boolean }>();
    const items = preview.data?.breakdown.items ?? [];
    debounced.lines.forEach((l, i) => {
      const it = items[i];
      if (it && it.ingredientUuid === l.ingredientUuid) {
        m.set(l.key, { cost: it.cost, missing: it.cost === null });
      }
    });
    return m;
  }, [preview.data, debounced.lines]);

  // --- Guardado -------------------------------------------------------------
  const mutation = useEntityMutation<ProductInput, ProductDetail>({
    entities: ['products'],
    invalidate: ['pricing'],
    mutationFn: (input) =>
      existing ? productsService.update(existing.uuid, input) : productsService.create(input),
    onSuccess: onSaved,
  });

  const submit = () => {
    setFormError(null);
    const { input, lines } = toInput(values, false, keepPrice);
    const v = validate(productInput, { ...input, rowVersion: existing?.rowVersion });
    if (!v.ok) {
      setErrors(mapLineErrors(v.errors, lines));
      setFormError('Revise los campos marcados.');
      return;
    }
    setErrors({});
    mutation.mutate(v.data, {
      onError: (e) => {
        const fields = serverFieldErrors(e);
        if (fields) setErrors(mapLineErrors(fields, lines));
        setFormError(errorMessage(e));
      },
    });
  };

  return {
    values,
    set,
    setLine,
    addLine,
    removeLine,
    errors,
    formError,
    saving: mutation.isPending,
    submit,
    ingredients,
    preview: preview.data ?? null,
    previewError: preview.error ? errorMessage(preview.error) : null,
    previewInvalid: !previewPayload.ok,
    previewPending: previewStale,
    lineCosts,
    hasLines: filledLines(values).length > 0,
  };
}

export type RecipeEditor = ReturnType<typeof useRecipeEditor>;

/** Precio sugerido (string decimal de la API) → texto para el campo de precio ("1.234,57"). */
export function priceToInput(price: string | null | undefined): string {
  return price ? formatDecimal(price, 2) : '';
}

// ---------------------------------------------------------------------------
// Categorías
// ---------------------------------------------------------------------------

export function useCreateCategory(onCreated: (c: Category) => void) {
  const [error, setError] = useState<string | null>(null);
  const mutation = useEntityMutation<string, Category>({
    entities: ['product_categories'],
    mutationFn: (name) => productsService.createCategory(name),
    onSuccess: onCreated,
  });
  const create = (name: string) => {
    setError(null);
    const v = validate(categoryInput, { kind: 'product', name });
    if (!v.ok) {
      setError(v.errors.name ?? 'Ingrese un nombre.');
      return;
    }
    mutation.mutate(v.data.name, { onError: (e) => setError(errorMessage(e)) });
  };
  return { create, error, saving: mutation.isPending, reset: () => setError(null) };
}

// ---------------------------------------------------------------------------
// Precio, duplicar, archivar, ficha
// ---------------------------------------------------------------------------

/** Cambia solo el precio de venta y conserva el margen objetivo y el multiplicador propios. */
export function useSetPrice() {
  return useEntityMutation<{ product: Product; price: string | null }, Product>({
    entities: ['products'],
    invalidate: ['pricing'],
    mutationFn: ({ product, price }) => {
      const body: PriceUpdate = {
        currentPrice: price,
        targetMargin: product.targetMargin,
        multiplier: product.multiplier,
        rowVersion: product.rowVersion,
      };
      return productsService.setPrice(product.uuid, body);
    },
  });
}

/** Precio escrito en el sheet "Cambiar precio" con su análisis en vivo (POST /pricing/calculate). */
export function usePriceDraft(product: Product | null, open: boolean) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const price = inputToDecimal(value);
  const debounced = useDebounced(price, 400);
  const valid = debounced !== null && /^\d{1,12}(\.\d{1,6})?$/.test(debounced);
  const analysis = useQuery({
    queryKey: ['api', 'products', 'price-draft', product?.costPerPortion, debounced],
    enabled: open && valid && !!product?.costPerPortion,
    queryFn: () =>
      productsService.calculate({
        cost: product!.costPerPortion!,
        currentPrice: debounced,
        targetMargin: product!.effectiveTargetMargin,
        multiplier: product!.multiplier,
      }),
    placeholderData: keepPreviousData,
  });
  return {
    value,
    setValue: (v: string) => {
      setError(null);
      setValue(v);
    },
    price,
    error,
    setError,
    analysis: valid ? (analysis.data ?? null) : null,
  };
}

export function useDuplicateProduct(onDone: (p: ProductDetail) => void) {
  const [error, setError] = useState<string | null>(null);
  const mutation = useEntityMutation<{ uuid: string; name: string }, ProductDetail>({
    entities: ['products'],
    invalidate: ['pricing'],
    mutationFn: ({ uuid, name }) => productsService.duplicate(uuid, name),
    onSuccess: onDone,
  });
  const duplicate = (uuid: string, name: string) => {
    setError(null);
    if (!name.trim()) {
      setError('Ingrese un nombre.');
      return;
    }
    mutation.mutate({ uuid, name: name.trim() }, { onError: (e) => setError(errorMessage(e)) });
  };
  return { duplicate, error, saving: mutation.isPending, reset: () => setError(null) };
}

export function useArchiveProduct() {
  return useEntityMutation<{ uuid: string; archived: boolean }, Product>({
    entities: ['products'],
    invalidate: ['pricing'],
    mutationFn: ({ uuid, archived }) =>
      archived ? productsService.archive(uuid) : productsService.restore(uuid),
  });
}

export function useDownloadSheet() {
  return useMutation({ mutationFn: (uuid: string) => productsService.downloadSheet(uuid) });
}
