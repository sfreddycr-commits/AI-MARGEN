import { defineConfig } from 'tsup';

// Empaqueta la API en un único bundle ESM. Los paquetes internos (@aimargen/*)
// se incluyen en el bundle; las dependencias de npm quedan externas.
export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  outDir: 'dist',
  sourcemap: true,
  clean: true,
  noExternal: [/^@aimargen\//],
});
