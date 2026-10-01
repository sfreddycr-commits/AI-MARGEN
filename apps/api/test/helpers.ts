import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { loadConfig, type AppConfig } from '../src/core/config/config.js';
import { createDb, type Db } from '../src/core/db/db.js';

export interface TestApp {
  app: FastifyInstance;
  db: Db;
  config: AppConfig;
  close: () => Promise<void>;
}

/** Construye la API contra la base de pruebas. */
export async function buildTestApp(
  overrides: Partial<Record<keyof AppConfig, string>> = {},
): Promise<TestApp> {
  const config = loadConfig({
    DB_NAME: process.env.DB_NAME_TEST ?? 'aimargen_test',
    LOG_LEVEL: 'silent',
    NODE_ENV: 'test',
    ...overrides,
  });
  const db = createDb({
    host: config.DB_HOST,
    port: config.DB_PORT,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
  });
  const app = await buildApp({ config, db });
  await app.ready();
  return {
    app,
    db,
    config,
    close: async () => {
      await app.close();
      await db.close();
    },
  };
}
