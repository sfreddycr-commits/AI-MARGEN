import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { ConnectionOptions } from './migrator.js';

const ROOT_ENV = fileURLToPath(new URL('../../../.env', import.meta.url));

/** Lee la conexión desde variables de entorno (carga el .env raíz en local). */
export function connectionFromEnv(databaseOverride?: string): ConnectionOptions {
  if (process.env.NODE_ENV !== 'production' && existsSync(ROOT_ENV)) {
    process.loadEnvFile(ROOT_ENV);
  }
  const database = databaseOverride ?? process.env.DB_NAME;
  if (!process.env.DB_USER || !database) {
    throw new Error('Faltan DB_USER / DB_NAME en el entorno. Copie .env.example a .env.');
  }
  return {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD ?? '',
    database,
  };
}
