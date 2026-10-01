import { loadConfig } from './core/config/config.js';
import { createDb } from './core/db/db.js';
import { buildApp } from './app.js';

const config = loadConfig();
const db = createDb({
  host: config.DB_HOST,
  port: config.DB_PORT,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  poolSize: config.DB_POOL_SIZE,
});

const app = await buildApp({ config, db });

// Apagado ordenado: deja de aceptar solicitudes y cierra el pool.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, async () => {
    app.log.info({ signal }, 'apagando');
    await app.close();
    await db.close();
    process.exit(0);
  });
}

try {
  await app.listen({ host: config.API_HOST, port: config.API_PORT });
} catch (err) {
  app.log.fatal({ err }, 'no se pudo iniciar la API');
  await db.close();
  process.exit(1);
}
