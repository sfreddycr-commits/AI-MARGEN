import type { IconName } from '../ui';

/**
 * Registro único de navegación (SOP §9).
 * `status`:
 *  - 'ready'    → módulo implementado; aparece y navega.
 *  - 'upcoming' → aún no implementado; solo se muestra deshabilitado en builds de desarrollo
 *                 (VITE_SHOW_UPCOMING=true) para revisar el layout. Nunca en producción.
 * Cada etapa cambia su módulo a 'ready' al cumplir su gate.
 */
export interface NavItem {
  id: string;
  label: string;
  /** Etiqueta corta para la barra inferior móvil. */
  shortLabel?: string;
  icon: IconName;
  to: string;
  /** Posición en móvil: barra inferior o dentro de "Más". */
  mobile: 'primary' | 'more';
  group: 'main' | 'system';
  status: 'ready' | 'upcoming';
  devOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'home',
    label: 'Inicio',
    icon: 'home',
    to: '/app',
    mobile: 'primary',
    group: 'main',
    status: 'upcoming',
  },
  {
    id: 'ingredients',
    label: 'Ingredientes',
    icon: 'ingredients',
    to: '/app/ingredients',
    mobile: 'more',
    group: 'main',
    status: 'upcoming',
  },
  {
    id: 'purchases',
    label: 'Compras',
    icon: 'purchases',
    to: '/app/purchases',
    mobile: 'more',
    group: 'main',
    status: 'upcoming',
  },
  {
    id: 'suppliers',
    label: 'Proveedores',
    icon: 'suppliers',
    to: '/app/suppliers',
    mobile: 'more',
    group: 'main',
    status: 'upcoming',
  },
  {
    id: 'products',
    label: 'Productos y recetas',
    shortLabel: 'Productos',
    icon: 'products',
    to: '/app/products',
    mobile: 'primary',
    group: 'main',
    status: 'upcoming',
  },
  {
    id: 'pricing',
    label: 'Precio y margen',
    shortLabel: 'Costos',
    icon: 'costs',
    to: '/app/pricing',
    mobile: 'primary',
    group: 'main',
    status: 'upcoming',
  },
  {
    id: 'scenarios',
    label: 'Escenarios',
    icon: 'scenarios',
    to: '/app/scenarios',
    mobile: 'more',
    group: 'main',
    status: 'upcoming',
  },
  {
    id: 'reports',
    label: 'Reportes',
    icon: 'reports',
    to: '/app/reports',
    mobile: 'more',
    group: 'main',
    status: 'upcoming',
  },
  {
    id: 'ai',
    label: 'AImargen AI',
    shortLabel: 'IA',
    icon: 'ai',
    to: '/app/ai',
    mobile: 'primary',
    group: 'main',
    status: 'upcoming',
  },
  {
    id: 'settings',
    label: 'Configuración',
    icon: 'settings',
    to: '/app/settings',
    mobile: 'more',
    group: 'main',
    status: 'upcoming',
  },
  {
    id: 'system',
    label: 'Estado del sistema',
    icon: 'pulse',
    to: '/app/sistema',
    mobile: 'more',
    group: 'system',
    status: 'ready',
  },
  {
    id: 'components',
    label: 'Componentes',
    icon: 'grid',
    to: '/app/componentes',
    mobile: 'more',
    group: 'system',
    status: 'ready',
    devOnly: true,
  },
];

export interface NavOptions {
  isDev: boolean;
  showUpcoming: boolean;
}

/** Ítems visibles según entorno. En producción solo módulos listos y no-dev. */
export function visibleNavItems(items: NavItem[], opts: NavOptions): NavItem[] {
  return items.filter((i) => {
    if (i.devOnly && !opts.isDev) return false;
    if (i.status === 'upcoming') return opts.isDev && opts.showUpcoming;
    return true;
  });
}

export const navOptions: NavOptions = {
  isDev: import.meta.env.DEV,
  showUpcoming: import.meta.env.DEV && import.meta.env.VITE_SHOW_UPCOMING === 'true',
};
