import { defineConfig, devices } from '@playwright/test';

/**
 * E2E + QA visual (SOP §37): 390×844 (móvil) y 1440×900 (desktop).
 * Corre contra el build de producción (vite preview) y la API real con MySQL.
 * En entornos sin descarga de navegadores se puede indicar CHROMIUM_PATH.
 */
const executablePath = process.env.CHROMIUM_PATH || undefined;
const extraArgs = process.env.CHROMIUM_ARGS ? process.env.CHROMIUM_ARGS.split(' ') : [];

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'es-CR',
    timezoneId: 'America/Costa_Rica',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { executablePath, args: extraArgs },
  },
  projects: [
    {
      name: 'mobile-390',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 390, height: 844 },
        launchOptions: { executablePath, args: extraArgs },
      },
    },
    {
      name: 'desktop-1440',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        launchOptions: { executablePath, args: extraArgs },
      },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @aimargen/api start',
      url: 'http://127.0.0.1:4000/api/v1/health/live',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'pnpm --filter @aimargen/web preview --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});
