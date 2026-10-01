import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// `vite build` siempre produce un bundle de producción, aunque el entorno tenga NODE_ENV=test
// (como el job de integración de CI). Sin esto, import.meta.env.DEV sería true en el build.
if (process.argv.includes('build')) process.env.NODE_ENV = 'production';

// En desarrollo, /api se redirige a la API local para que las cookies sean del mismo origen.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // El usuario decide cuándo actualizar (aviso "Nueva versión disponible").
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        id: '/app',
        name: 'AImargen — costos, precios y márgenes',
        short_name: 'AImargen',
        description:
          'Calcule el costo real de sus recetas, defina precios rentables y sepa cuánto gana.',
        lang: 'es-CR',
        dir: 'ltr',
        start_url: '/app',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f3f6fb',
        theme_color: '#ffffff',
        categories: ['business', 'finance', 'food'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Shell offline: HTML, JS, CSS, fuente e íconos precacheados.
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],
        navigateFallback: '/index.html',
        // La API nunca se sirve desde el service worker: los datos offline viven en IndexedDB (ADR-0007).
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [{ urlPattern: /^\/api\//, handler: 'NetworkOnly' }],
        cleanupOutdatedCaches: true,
        clientsClaim: false,
        skipWaiting: false,
      },
      devOptions: { enabled: false },
    }),
  ],
  css: {
    modules: { localsConvention: 'camelCaseOnly' },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:4000', changeOrigin: false },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:4000', changeOrigin: false },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
