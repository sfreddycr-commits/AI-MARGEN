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
  /** Permiso requerido para mostrarse (si el rol no lo tiene, no aparece). */
  permission?: string;
  /** Visible para el administrador de la plataforma (sin negocio). */
  platform?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'home',
    label: 'Inicio',
    icon: 'home',
    to: '/app',
    mobile: 'primary',
    group: 'main',
    status: 'ready',
  },
  {
    id: 'ingredients',
    permission: 'ingredients.read',
    label: 'Ingredientes',
    icon: 'ingredients',
    to: '/app/ingredients',
    mobile: 'more',
    group: 'main',
    status: 'ready',
  },
  {
    id: 'purchases',
    permission: 'purchases.read',
    label: 'Compras',
    icon: 'purchases',
    to: '/app/purchases',
    mobile: 'more',
    group: 'main',
    status: 'ready',
  },
  {
    id: 'suppliers',
    permission: 'suppliers.read',
    label: 'Proveedores',
    icon: 'suppliers',
    to: '/app/suppliers',
    mobile: 'more',
    group: 'main',
    status: 'ready',
  },
  {
    id: 'products',
    permission: 'products.read',
    label: 'Productos y recetas',
    shortLabel: 'Productos',
    icon: 'products',
    to: '/app/products',
    mobile: 'primary',
    group: 'main',
    status: 'ready',
  },
  {
    id: 'pricing',
    permission: 'pricing.read',
    label: 'Precio y margen',
    shortLabel: 'Costos',
    icon: 'costs',
    to: '/app/pricing',
    mobile: 'primary',
    group: 'main',
    status: 'ready',
  },
  {
    id: 'scenarios',
    permission: 'scenarios.read',
    label: 'Escenarios',
    icon: 'scenarios',
    to: '/app/scenarios',
    mobile: 'more',
    group: 'main',
    status: 'ready',
  },
  {
    id: 'reports',
    permission: 'reports.read',
    label: 'Reportes',
    icon: 'reports',
    to: '/app/reports',
    mobile: 'more',
    group: 'main',
    status: 'ready',
  },
  {
    id: 'ai',
    permission: 'ai.use',
    label: 'AImargen AI',
    shortLabel: 'IA',
    icon: 'ai',
    to: '/app/ai',
    mobile: 'primary',
    group: 'main',
    status: 'ready',
  },
  {
    id: 'settings',
    permission: 'settings.read',
    label: 'Configuración',
    icon: 'settings',
    to: '/app/settings',
    mobile: 'more',
    group: 'main',
    status: 'ready',
  },
  {
    id: 'admin',
    label: 'Panel de plataforma',
    icon: 'shield',
    to: '/app/admin',
    mobile: 'more',
    group: 'system',
    status: 'ready',
    permission: 'platform.admin',
    platform: true,
  },
  {
    id: 'system',
    label: 'Estado del sistema',
    icon: 'pulse',
    to: '/app/sistema',
    mobile: 'more',
    group: 'system',
    status: 'ready',
    platform: true,
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

export interface NavAccess {
  can: (permission: string) => boolean;
  /** Administrador de plataforma sin negocio: solo ve ítems de plataforma. */
  platformOnly: boolean;
}

/**
 * Ítems visibles según entorno y permisos. En producción solo módulos listos y no-dev.
 * Sin `access` (pruebas) no se filtra por permisos.
 */
export function visibleNavItems(
  items: NavItem[],
  opts: NavOptions,
  access?: NavAccess,
): NavItem[] {
  return items.filter((i) => {
    if (i.devOnly && !opts.isDev) return false;
    if (i.status === 'upcoming') return opts.isDev && opts.showUpcoming;
    if (access) {
      if (access.platformOnly) return !!i.platform;
      if (i.permission && !access.can(i.permission)) return false;
    }
    return true;
  });
}

export const navOptions: NavOptions = {
  isDev: import.meta.env.DEV,
  showUpcoming: import.meta.env.DEV && import.meta.env.VITE_SHOW_UPCOMING === 'true',
};
