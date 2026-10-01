import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

/**
 * Configuración tipada de la API. Falla al iniciar si falta algo obligatorio.
 * Fuera de producción carga el `.env` de la raíz del monorepo (la carpeta con pnpm-workspace.yaml),
 * tanto desde `src/` (tsx) como desde `dist/` (bundle). En producción solo variables reales.
 */
function findRootEnv(): string | null {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) {
      const env = join(dir, '.env');
      return existsSync(env) ? env : null;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

if (process.env.NODE_ENV !== 'production') {
  const rootEnv = findRootEnv();
  if (rootEnv) process.loadEnvFile(rootEnv);
}

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().min(1),
  DB_POOL_SIZE: z.coerce.number().int().positive().default(10),
});

export type AppConfig = z.infer<typeof schema>;

export function loadConfig(overrides: Partial<Record<keyof AppConfig, string>> = {}): AppConfig {
  const parsed = schema.safeParse({ ...process.env, ...overrides });
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Configuración inválida: ${detail}`);
  }
  return parsed.data;
}

export const APP_VERSION = process.env.npm_package_version ?? '0.0.0';
