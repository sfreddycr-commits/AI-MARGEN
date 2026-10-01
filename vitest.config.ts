import { defineConfig } from 'vitest/config';

// Dos proyectos:
//  - unit: puro, sin I/O (motor de cálculo, utilidades, controladores con dobles).
//  - integration: contra MySQL real (SPs, API con inject, aislamiento de tenants).
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: [
            'packages/**/*.test.ts',
            'apps/**/src/**/*.test.{ts,tsx}',
            'database/scripts/**/*.test.ts',
          ],
          exclude: ['**/*.int.test.ts', '**/node_modules/**'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'integration',
          include: ['apps/api/test/**/*.int.test.ts', 'database/test/**/*.int.test.ts'],
          environment: 'node',
          globalSetup: ['./database/test/global-setup.ts'],
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
