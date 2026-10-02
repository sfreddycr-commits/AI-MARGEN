import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Decimal } from '@aimargen/calculation-engine';
import {
  ingredientInput,
  purchaseInput,
  type IngredientInput,
  type PurchaseInput,
} from '@aimargen/schemas';
import { useApi, useEntityMutation, useLocalList } from '../../../core/data/js/use-entity';
import {
  inputToDecimal,
  serverFieldErrors,
  todayIso,
  validate,
  type FieldErrors,
} from '../../../core/js/form';
import { errorMessage } from '../../../core/js/api-client';
import {
  ingredientsService,
  type Ingredient,
  type IngredientConversion,
} from '../../ingredients/js/ingredients.service';
import { unitOptionsFor, type UnitCode } from '../../ingredients/js/units';
import {
  PAGE_SIZE,
  purchasesService,
  type PurchaseDetail,
  type PurchaseFilters,
} from './purchases.service';

/** Controlador del módulo Compras: filtros, listado paginado, formulario y anulación. */

// ---------------------------------------------------------------------------
// Listado
// ---------------------------------------------------------------------------

/** Filtros guardados en la URL (?supplier=…&ingredient=…&from=…&to=…&void=1). */
export function usePurchaseFilters() {
  const [params, setParams] = useSearchParams();
  const filters: PurchaseFilters = {
    supplier: params.get('supplier') ?? undefined,
    ingredient: params.get('ingredient') ?? undefined,
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
    includeVoid: params.get('void') === '1',
  };
  const update = (patch: Record<string, string | null>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (v) next.set(k, v);
          else next.delete(k);
        }
        return next;
      },
      { replace: true },
    );
  const activeCount = [filters.supplier, filters.from, filters.to].filter(Boolean).length;
  return { filters, update, activeCount };
}

export function usePurchaseList(filters: PurchaseFilters) {
  const query = useInfiniteQuery({
    queryKey: ['api', 'purchases', 'list', filters],
    queryFn: ({ pageParam }) => purchasesService.list(filters, pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total && last.items.length === PAGE_SIZE
        ? last.page + 1
        : undefined,
  });
  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data]);
  const total = query.data?.pages[0]?.total ?? 0;
  return { ...query, items, total };
}

export function usePurchase(uuid: string | undefined) {
  return useApi<PurchaseDetail>(
    ['purchases', uuid],
    uuid ? purchasesService.detailPath(uuid) : null,
  );
}

export function useSupplierOptions() {
  const q = useLocalList<{ uuid: string; name: string; archived?: boolean }>('suppliers');
  return useMemo(() => (q.data ?? []).map((s) => ({ value: s.uuid, label: s.name })), [q.data]);
}

export function useVoidPurchase() {
  return useEntityMutation<string, PurchaseDetail>({
    entities: ['ingredients', 'products', 'suppliers'],
    invalidate: ['purchases'],
    mutationFn: (uuid) => purchasesService.void(uuid),
  });
}

/** Abre la factura original (documento de IA) en una pestaña nueva. */
export function useOpenDocument() {
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = async (documentUuid: string) => {
    setError(null);
    // La pestaña se abre en el gesto del usuario para que el navegador no la bloquee.
    const win = window.open('', '_blank');
    setOpening(true);
    try {
      const url = await purchasesService.documentUrl(documentUuid);
      if (win) win.location.href = url;
      else window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      win?.close();
      setError(errorMessage(e));
    } finally {
      setOpening(false);
    }
  };
  return { open, opening, error };
}

// ---------------------------------------------------------------------------
// Formulario de compra
// ---------------------------------------------------------------------------

export interface PickedIngredient {
  uuid: string;
  name: string;
  unit: UnitCode;
  conversions: IngredientConversion[];
}

export interface PurchaseLine {
  key: number;
  ingredient: PickedIngredient | null;
  quantity: string;
  unit: UnitCode | '';
  lineTotal: string;
}

export interface PurchaseHeader {
  purchasedAt: string;
  supplierUuid: string;
  reference: string;
  notes: string;
}

let lineSeq = 0;
const emptyLine = (): PurchaseLine => ({
  key: ++lineSeq,
  ingredient: null,
  quantity: '',
  unit: '',
  lineTotal: '',
});

export function lineUnitOptions(line: PurchaseLine) {
  return line.ingredient ? unitOptionsFor(line.ingredient.unit, line.ingredient.conversions) : [];
}

export function useIngredientChoices() {
  const q = useLocalList<Ingredient>('ingredients');
  return { ...q, items: q.data ?? [] };
}

export function usePurchaseForm(
  initialSupplier: string | null,
  onSaved: (p: PurchaseDetail) => void,
) {
  const [header, setHeader] = useState<PurchaseHeader>({
    purchasedAt: todayIso(),
    supplierUuid: initialSupplier ?? '',
    reference: '',
    notes: '',
  });
  const [lines, setLines] = useState<PurchaseLine[]>(() => [emptyLine()]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useEntityMutation<PurchaseInput, PurchaseDetail>({
    entities: ['ingredients', 'products', 'suppliers'],
    invalidate: ['purchases'],
    mutationFn: (input) => purchasesService.create(input),
    onSuccess: onSaved,
  });

  const setHeaderField = <K extends keyof PurchaseHeader>(k: K, v: PurchaseHeader[K]) =>
    setHeader((h) => ({ ...h, [k]: v }));

  const updateLine = (key: number, patch: Partial<PurchaseLine>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const pickIngredient = (key: number, ing: PickedIngredient) =>
    setLines((ls) =>
      ls.map((l) => {
        if (l.key !== key) return l;
        const keepUnit =
          l.unit !== '' &&
          unitOptionsFor(ing.unit, ing.conversions).some((o) => o.value === l.unit);
        return { ...l, ingredient: ing, unit: keepUnit ? l.unit : ing.unit };
      }),
    );

  const addLine = () => setLines((ls) => [...ls, emptyLine()]);
  const removeLine = (key: number) =>
    setLines((ls) => (ls.length > 1 ? ls.filter((l) => l.key !== key) : [emptyLine()]));

  /** Suma de los totales escritos (aritmética de lo digitado; el total oficial lo da la API). */
  const total = useMemo(() => {
    let sum = new Decimal(0);
    let count = 0;
    for (const l of lines) {
      const d = inputToDecimal(l.lineTotal);
      if (d === null) continue;
      try {
        sum = sum.plus(d);
        count++;
      } catch {
        // valor aún no válido: se ignora en la suma
      }
    }
    return count > 0 ? sum.toString() : null;
  }, [lines]);

  const submit = () => {
    setFormError(null);
    const v = validate(purchaseInput, {
      supplierUuid: header.supplierUuid || null,
      purchasedAt: header.purchasedAt,
      reference: header.reference,
      notes: header.notes,
      items: lines.map((l) => ({
        ingredientUuid: l.ingredient?.uuid ?? '',
        quantity: inputToDecimal(l.quantity) ?? '',
        unit: l.unit || l.ingredient?.unit || '',
        lineTotal: inputToDecimal(l.lineTotal) ?? '',
      })),
    });
    if (!v.ok) {
      const errs: FieldErrors = {};
      for (const [k, msg] of Object.entries(v.errors)) {
        errs[k] = k.endsWith('.ingredientUuid')
          ? 'Elija un ingrediente.'
          : k.endsWith('.unit')
            ? 'Elija la unidad.'
            : msg;
      }
      setErrors(errs);
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
    header,
    setHeaderField,
    lines,
    updateLine,
    pickIngredient,
    addLine,
    removeLine,
    total,
    submit,
    errors,
    formError,
    saving: mutation.isPending,
  };
}

/** Alta rápida de un ingrediente (solo nombre y unidad) desde la compra. */
export function useQuickIngredient(onCreated: (i: Ingredient) => void) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const mutation = useEntityMutation<IngredientInput, Ingredient>({
    entities: ['ingredients'],
    mutationFn: (input) => ingredientsService.create(input),
    onSuccess: (i) => {
      setErrors({});
      onCreated(i);
    },
  });
  const create = (name: string, unit: UnitCode) => {
    const v = validate(ingredientInput, { name, unit });
    if (!v.ok) {
      setErrors(v.errors);
      return;
    }
    mutation.mutate(v.data, {
      onError: (e) => {
        const fields = serverFieldErrors(e);
        setErrors(fields ?? { name: errorMessage(e) });
      },
    });
  };
  return { create, errors, saving: mutation.isPending, reset: () => setErrors({}) };
}
