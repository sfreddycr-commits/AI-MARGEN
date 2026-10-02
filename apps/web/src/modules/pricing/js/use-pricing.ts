import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { pricingCalculateInput } from '@aimargen/schemas';
import { useApi, useEntityMutation } from '../../../core/data/js/use-entity';
import { inputToDecimal, percentInputToFraction, validate } from '../../../core/js/form';
import { errorMessage } from '../../../core/js/api-client';
import {
  pricingService,
  type PricedProduct,
  type PricingRow,
  type PricingStatus,
} from './pricing.service';

/** Controlador del módulo Precio y margen: resumen, productos a revisar y calculadora. */

export const STATUS_META: Record<
  PricingStatus,
  { label: string; tone: 'positive' | 'warning' | 'danger' | 'neutral' | 'info' }
> = {
  healthy: { label: 'Saludable', tone: 'positive' },
  below_target: { label: 'Bajo objetivo', tone: 'warning' },
  below_cost: { label: 'Bajo costo', tone: 'danger' },
  no_price: { label: 'Sin precio', tone: 'neutral' },
  incomplete: { label: 'Incompleto', tone: 'info' },
};

/** Orden de atención: primero lo que pierde dinero. */
const PRIORITY: Record<PricingStatus, number> = {
  below_cost: 0,
  below_target: 1,
  no_price: 2,
  incomplete: 3,
  healthy: 4,
};

export function usePricingOverview() {
  const query = useApi<PricingRow[]>(['pricing'], '/pricing');
  const rows = useMemo(() => query.data ?? [], [query.data]);

  const counts = useMemo(() => {
    const c: Record<PricingStatus, number> = {
      healthy: 0,
      below_target: 0,
      below_cost: 0,
      no_price: 0,
      incomplete: 0,
    };
    for (const r of rows) c[r.status]++;
    return c;
  }, [rows]);

  /** Productos que necesitan atención, ordenados por prioridad y por cuánto falta para el precio sugerido. */
  const attention = useMemo(
    () =>
      rows
        .filter((r) => r.status !== 'healthy')
        .sort(
          (a, b) =>
            PRIORITY[a.status] - PRIORITY[b.status] ||
            Number(b.analysis?.differenceToRecommended ?? 0) -
              Number(a.analysis?.differenceToRecommended ?? 0) ||
            a.name.localeCompare(b.name, 'es'),
        ),
    [rows],
  );

  return { ...query, rows, counts, attention };
}

/** Aplica un precio (ej. el sugerido) conservando margen objetivo y multiplicador. */
export function useApplyPrice() {
  const mutation = useEntityMutation<{ row: PricingRow; price: string | null }, PricedProduct>({
    entities: ['products'],
    invalidate: ['pricing'],
    mutationFn: ({ row, price }) =>
      pricingService.setPrice(row.uuid, {
        currentPrice: price,
        targetMargin: row.targetMargin,
        multiplier: row.multiplier,
        rowVersion: row.rowVersion,
      }),
  });
  /** Deshacer: vuelve al precio anterior usando la versión nueva del registro. */
  const undo = (row: PricingRow, updated: PricedProduct) =>
    mutation.mutateAsync({
      row: { ...row, rowVersion: updated.rowVersion },
      price: row.currentPrice,
    });
  return { ...mutation, undo };
}

// ---------------------------------------------------------------------------
// Calculadora
// ---------------------------------------------------------------------------

export type CalcMode = 'margin' | 'multiplier';

export interface CalculatorValues {
  cost: string;
  mode: CalcMode;
  margin: string;
  multiplier: string;
  currentPrice: string;
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function usePriceCalculator(defaultMargin: string) {
  const [values, setValues] = useState<CalculatorValues>({
    cost: '',
    mode: 'margin',
    margin: defaultMargin,
    multiplier: '3',
    currentPrice: '',
  });
  const set = <K extends keyof CalculatorValues>(k: K, v: CalculatorValues[K]) =>
    setValues((s) => ({ ...s, [k]: v }));

  const parsed = useMemo(() => {
    if (!values.cost.trim()) return { ok: false as const, errors: {} };
    return validate(pricingCalculateInput, {
      cost: inputToDecimal(values.cost),
      currentPrice: inputToDecimal(values.currentPrice),
      targetMargin: values.mode === 'margin' ? percentInputToFraction(values.margin) : null,
      multiplier: values.mode === 'multiplier' ? inputToDecimal(values.multiplier) : null,
    });
  }, [values]);

  const debounced = useDebounced(parsed, 400);
  const query = useQuery({
    queryKey: ['api', 'pricing', 'calculate', debounced.ok ? debounced.data : null],
    enabled: debounced.ok,
    queryFn: () => pricingService.calculate(debounced.ok ? debounced.data : ({} as never)),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  return {
    values,
    set,
    errors: parsed.ok ? {} : parsed.errors,
    ready: parsed.ok,
    pending: parsed !== debounced || query.isFetching,
    result: parsed.ok ? (query.data ?? null) : null,
    error: query.error ? errorMessage(query.error) : null,
    cost: parsed.ok ? parsed.data.cost : null,
    target: parsed.ok ? parsed.data.targetMargin : null,
  };
}
