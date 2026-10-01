// ESLint (flat config) para todo el monorepo.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/coverage/**', '**/node_modules/**', '**/dev-dist/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
    },
  },
  // Node: API, scripts y paquetes
  {
    files: ['apps/api/**/*.ts', 'database/**/*.ts', 'packages/**/*.ts', '*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },
  // Scripts de CLI pueden escribir a consola
  {
    files: ['database/scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
  // Web: React
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  // Regla de arquitectura: las fórmulas financieras solo viven en el motor de cálculo.
  // La web no puede importar mysql ni la API importar React.
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: ['mysql2', 'mysql2/promise'], patterns: ['**/apps/api/**'] },
      ],
    },
  },
  {
    files: ['apps/api/**/*.ts', 'packages/calculation-engine/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { paths: ['react', 'react-dom'] }],
    },
  },
);
