import { expect, test } from '@playwright/test';

/**
 * Etapa 1 — Fundación: shell, navegación, estado del sistema y PWA offline.
 * Corre sobre el build de producción (sin módulos pendientes ni catálogo de desarrollo).
 */

test.describe('shell de la aplicación', () => {
  test('estado del sistema: web → API → SP → MySQL operativo', async ({ page }) => {
    await page.goto('/app/sistema');
    await expect(page.getByRole('heading', { level: 1, name: 'Estado del sistema' })).toBeVisible();
    await expect(page.getByText('Operativo')).toHaveCount(3);
    await expect(page).toHaveTitle('Estado del sistema | AImargen');
  });

  test('navegación según el tamaño de pantalla', async ({ page, isMobile }) => {
    await page.goto('/app/sistema');
    const sidebar = page.getByRole('complementary', { name: 'Navegación principal' });
    const bottomNav = page.locator('nav[aria-label="Navegación principal"]').last();
    if (isMobile) {
      await expect(sidebar).toBeHidden();
      await expect(bottomNav).toBeVisible();
      await bottomNav.getByRole('link', { name: 'Más' }).click();
      await expect(page).toHaveURL(/\/app\/mas$/);
      await page.getByRole('link', { name: 'Estado del sistema' }).click();
      await expect(page).toHaveURL(/\/app\/sistema$/);
    } else {
      await expect(sidebar).toBeVisible();
      await expect(bottomNav).toBeHidden();
      await expect(sidebar.getByRole('link', { name: 'Estado del sistema' })).toHaveAttribute(
        'aria-current',
        'page',
      );
    }
  });

  test('producción no expone el catálogo de desarrollo ni módulos pendientes', async ({ page }) => {
    await page.goto('/app/componentes');
    await expect(page.getByRole('heading', { name: 'Esta página no existe' })).toBeVisible();
    await page.goto('/app/mas');
    await expect(page.getByText('Próximamente')).toHaveCount(0);
  });

  test('sin desbordamiento horizontal y objetivos táctiles ≥ 44 px', async ({ page, isMobile }) => {
    await page.goto('/app/mas');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
    if (isMobile) {
      const sizes = await page
        .locator('nav[aria-label="Navegación principal"] a')
        .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height));
      for (const h of sizes) expect(h).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe('PWA', () => {
  test('manifest instalable', async ({ page, request }) => {
    await page.goto('/app/sistema');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toBeTruthy();
    const manifest = await (await request.get(href!)).json();
    expect(manifest).toMatchObject({
      short_name: 'AImargen',
      display: 'standalone',
      start_url: '/app',
      lang: 'es-CR',
    });
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
  });

  test('abre sin conexión después de la primera visita', async ({ page, context }) => {
    await page.goto('/app/sistema');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await context.setOffline(true);
    await page.goto('/app/mas');
    await expect(page.getByRole('heading', { level: 1, name: 'Más' })).toBeVisible();
    await expect(page.getByText('Sin conexión.')).toBeVisible();
    await context.setOffline(false);
  });
});
