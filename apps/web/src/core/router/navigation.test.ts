import { describe, expect, it } from 'vitest';
import { NAV_ITEMS, visibleNavItems } from './navigation';

describe('navegación', () => {
  it('en producción nunca muestra módulos pendientes ni herramientas de desarrollo', () => {
    const items = visibleNavItems(NAV_ITEMS, { isDev: false, showUpcoming: true });
    expect(items.every((i) => i.status === 'ready' && !i.devOnly)).toBe(true);
  });

  it('en desarrollo muestra pendientes solo si se pide explícitamente', () => {
    const hidden = visibleNavItems(NAV_ITEMS, { isDev: true, showUpcoming: false });
    expect(hidden.some((i) => i.status === 'upcoming')).toBe(false);
    const shown = visibleNavItems(NAV_ITEMS, { isDev: true, showUpcoming: true });
    expect(shown.length).toBe(NAV_ITEMS.length);
  });

  it('respeta el orden del sidebar y la barra inferior del SOP §9', () => {
    const main = NAV_ITEMS.filter((i) => i.group === 'main').map((i) => i.label);
    expect(main).toEqual([
      'Inicio',
      'Ingredientes',
      'Compras',
      'Proveedores',
      'Productos y recetas',
      'Precio y margen',
      'Escenarios',
      'Reportes',
      'AImargen AI',
      'Configuración',
    ]);
    const primary = NAV_ITEMS.filter((i) => i.mobile === 'primary').map(
      (i) => i.shortLabel ?? i.label,
    );
    expect(primary).toEqual(['Inicio', 'Productos', 'Costos', 'IA']);
  });

  it('oculta módulos sin permiso y limita al administrador de plataforma', () => {
    const viewer = visibleNavItems(
      NAV_ITEMS,
      { isDev: false, showUpcoming: false },
      { can: (p) => p !== 'ai.use' && p !== 'platform.admin', platformOnly: false },
    );
    expect(viewer.map((i) => i.id)).not.toContain('ai');
    expect(viewer.map((i) => i.id)).not.toContain('admin');
    const root = visibleNavItems(
      NAV_ITEMS,
      { isDev: false, showUpcoming: false },
      { can: () => true, platformOnly: true },
    );
    expect(root.map((i) => i.id)).toEqual(['admin', 'system']);
  });

  it('las rutas son únicas', () => {
    const routes = NAV_ITEMS.map((i) => i.to);
    expect(new Set(routes).size).toBe(routes.length);
  });
});
