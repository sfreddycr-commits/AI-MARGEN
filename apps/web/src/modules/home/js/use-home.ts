import { useMemo } from 'react';
import { useApi, useLocalList } from '../../../core/data/js/use-entity';
import { useTenant } from '../../../core/session/js/session-context';
import { formatMoney, formatPercent } from '../../../core/js/format';
import type { IconName } from '../../../core/ui';
import {
  DASHBOARD_PATH,
  type AlertSeverity,
  type Dashboard,
  type DashboardAlert,
  type HomeProduct,
} from './home.service';

/** Controlador del inicio: datos del dashboard, accesos rápidos y clasificación por margen. */

/** El resumen exige products.read en la API; sin ese permiso no se consulta. */
export function useDashboard() {
  const { can } = useTenant();
  const allowed = can('products.read');
  return { ...useApi<Dashboard>(['dashboard'], allowed ? DASHBOARD_PATH : null), allowed };
}

type FigureKind = 'money' | 'percent' | 'count';
const FIGURES: Record<string, { label: string; kind: FigureKind }> = {
  count: { label: 'Productos', kind: 'count' },
  previous: { label: 'Antes', kind: 'money' },
  current: { label: 'Ahora', kind: 'money' },
  change: { label: 'Variación', kind: 'percent' },
  currentPrice: { label: 'Precio actual', kind: 'money' },
  recommendedPrice: { label: 'Recomendado', kind: 'money' },
  costPerPortion: { label: 'Costo', kind: 'money' },
  targetMargin: { label: 'Objetivo', kind: 'percent' },
};

/** Cifras de un insight listas para mostrar (las calcula la API; aquí solo se formatean). */
export function insightFigures(
  figures: Record<string, string | null>,
  currency: string,
): Array<{ key: string; label: string; value: string }> {
  return Object.entries(figures)
    .filter(([k, v]) => v !== null && FIGURES[k] && FIGURES[k].kind !== 'count')
    .map(([k, v]) => {
      const f = FIGURES[k]!;
      const value = f.kind === 'money' ? formatMoney(v!, currency) : formatPercent(v!);
      return { key: k, label: f.label, value };
    });
}

/** Saludo según la hora del dispositivo. */
export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function firstName(fullName: string | undefined): string {
  return (fullName ?? '').trim().split(/\s+/)[0] ?? '';
}

const ALERT_ICON: Record<string, IconName> = {
  PRICE_BELOW_COST: 'trendDown',
  SCENARIO_NEGATIVE: 'scenarios',
  MARGIN_BELOW_TARGET: 'costs',
  NO_PRICE: 'products',
  INGREDIENT_NO_COST: 'ingredients',
  RECIPE_INCOMPLETE: 'products',
  COST_INCREASE: 'trendUp',
};

export const SEVERITY_TONE: Record<AlertSeverity, 'danger' | 'warning' | 'info'> = {
  danger: 'danger',
  warning: 'warning',
  info: 'info',
};

export const SEVERITY_LABEL: Record<AlertSeverity, string> = {
  danger: 'Urgente',
  warning: 'Revisar',
  info: 'Aviso',
};

export function alertIcon(a: DashboardAlert): IconName {
  return ALERT_ICON[a.code] ?? 'alert';
}

/** Ordena las alertas: primero las urgentes. */
export function sortAlerts(alerts: DashboardAlert[]): DashboardAlert[] {
  const rank: Record<AlertSeverity, number> = { danger: 0, warning: 1, info: 2 };
  return [...alerts].sort((a, b) => rank[a.severity] - rank[b.severity]);
}

export interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: IconName;
  to: string;
}

/** Accesos rápidos visibles según permisos y funciones habilitadas. */
export function useQuickActions(): QuickAction[] {
  const { can, feature, me } = useTenant();
  return useMemo(() => {
    const all: Array<QuickAction & { allowed: boolean }> = [
      {
        id: 'purchase',
        label: 'Registrar compra',
        description: 'Actualiza el costo de sus ingredientes',
        icon: 'purchases',
        to: '/app/purchases/new',
        allowed: can('purchases.write'),
      },
      {
        id: 'product',
        label: 'Nueva receta',
        description: 'Calcule el costo por porción',
        icon: 'products',
        to: '/app/products/new',
        allowed: can('products.write'),
      },
      {
        id: 'ingredient',
        label: 'Nuevo ingrediente',
        description: 'Con su precio de compra',
        icon: 'ingredients',
        to: '/app/ingredients/new',
        allowed: can('ingredients.write'),
      },
      {
        id: 'scenario',
        label: 'Simular escenario',
        description: 'Ventas, costos y punto de equilibrio',
        icon: 'scenarios',
        to: '/app/scenarios/new',
        allowed: can('scenarios.write'),
      },
      {
        id: 'ai',
        label: 'Preguntar a la IA',
        description: 'Consulte sus números en palabras',
        icon: 'ai',
        to: '/app/ai',
        allowed: can('ai.use') && !!me?.aiEnabled && feature('ai.chat'),
      },
      {
        id: 'reports',
        label: 'Crear reporte',
        description: 'PDF, Excel o CSV',
        icon: 'reports',
        to: '/app/reports',
        allowed: can('reports.read'),
      },
    ];
    return all.filter((a) => a.allowed).map(({ allowed: _a, ...rest }) => rest);
  }, [can, feature, me?.aiEnabled]);
}

/**
 * Productos con margen calculado por la API, ordenados de mayor a menor.
 * La UI solo ordena: el margen viene del motor de cálculo.
 */
export function useMarginRanking() {
  const { can } = useTenant();
  const query = useLocalList<HomeProduct>('products', { enabled: can('products.read') });
  return useMemo(() => {
    const priced = (query.data ?? [])
      .filter((p) => p.pricing?.margin !== null && p.pricing?.margin !== undefined)
      .sort((a, b) => Number(b.pricing.margin) - Number(a.pricing.margin));
    const split = priced.length >= 6;
    return {
      isPending: query.isPending,
      count: priced.length,
      best: split ? priced.slice(0, 3) : priced,
      worst: split ? priced.slice(-3).reverse() : [],
    };
  }, [query.data, query.isPending]);
}

export const PRODUCT_STATUS: Record<
  HomeProduct['pricing']['status'],
  { tone: 'positive' | 'warning' | 'danger' | 'neutral'; label: string }
> = {
  healthy: { tone: 'positive', label: 'Saludable' },
  below_target: { tone: 'warning', label: 'Bajo objetivo' },
  below_cost: { tone: 'danger', label: 'Bajo costo' },
  no_price: { tone: 'neutral', label: 'Sin precio' },
  incomplete: { tone: 'neutral', label: 'Incompleto' },
};

/** Pasos de inicio cuando el negocio aún no tiene datos. */
export function useGettingStarted(d: Dashboard | undefined) {
  const { can } = useTenant();
  const setup = d?.setup;
  const firstRun = !!setup && !setup.hasIngredients && !setup.hasProducts;
  const steps = [
    {
      id: 'ingredient',
      title: 'Cree su primer ingrediente',
      description: 'Anote lo que compra y cuánto le cuesta (ej. 1 kg de queso a ₡4.500).',
      to: '/app/ingredients/new',
      done: !!setup?.hasIngredients,
      allowed: can('ingredients.write'),
    },
    {
      id: 'recipe',
      title: 'Arme una receta',
      description: 'Indique qué ingredientes lleva y cuántas porciones rinde.',
      to: '/app/products/new',
      done: !!setup?.hasProducts,
      allowed: can('products.write'),
    },
    {
      id: 'price',
      title: 'Defina su precio',
      description: 'Vea su margen real y el precio recomendado para ganar lo que necesita.',
      to: '/app/pricing',
      done: false,
      allowed: can('pricing.read'),
    },
  ];
  return { firstRun, steps };
}
