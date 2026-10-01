import { connectionFromEnv, migrate, resetDatabase } from '../scripts/lib/index.js';

/**
 * Setup global de pruebas de integración: recrea la base de pruebas y aplica migraciones.
 * Nunca apunta a la base de desarrollo ni a producción.
 */
export default async function setup(): Promise<void> {
  const testDb = process.env.DB_NAME_TEST ?? 'aimargen_test';
  const conn = connectionFromEnv(testDb);
  if (conn.database === process.env.DB_NAME && process.env.DB_NAME !== 'aimargen_test') {
    throw new Error('DB_NAME_TEST no puede ser igual a DB_NAME.');
  }
  await resetDatabase(conn);
  await migrate(conn);
  process.env.DB_NAME = conn.database;
  process.env.NODE_ENV = 'test';
}
