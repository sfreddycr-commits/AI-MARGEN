import { connectionFromEnv, migrate, resetDatabase } from './lib/index.js';

/**
 * Uso:
 *   pnpm db:migrate                 → aplica pendientes en DB_NAME
 *   pnpm db:migrate --db aimargen_test
 *   pnpm db:reset                   → borra y recrea DB_NAME (bloqueado en prod/staging) y migra
 */
const args = process.argv.slice(2);
const dbIdx = args.indexOf('--db');
const database = dbIdx >= 0 ? args[dbIdx + 1] : undefined;
const reset = args.includes('--reset');

const conn = connectionFromEnv(database);

try {
  if (reset) {
    await resetDatabase(conn);
    console.log(`↺ Base ${conn.database} recreada`);
  }
  const { applied, skipped } = await migrate(conn, (m) => console.log(m));
  console.log(
    `Migraciones en ${conn.database}: ${applied.length} aplicadas, ${skipped} sin cambios.`,
  );
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
