import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import type { Connection, RowDataPacket } from 'mysql2/promise';
import { splitSql } from './split-sql.js';

/**
 * Runner de migraciones.
 *  - `migrations/V####__nombre.sql`: versionadas, inmutables una vez aplicadas (checksum).
 *  - `routines/R__<sp_|fn_|vw_>nombre.sql`: repetibles; se re-aplican cuando cambia su contenido.
 *    Cada archivo debe hacer `DROP ... IF EXISTS` + `CREATE`.
 */

export const DATABASE_DIR = fileURLToPath(new URL('../../', import.meta.url));
export const MIGRATIONS_DIR = join(DATABASE_DIR, 'migrations');
export const ROUTINES_DIR = join(DATABASE_DIR, 'routines');

const VERSIONED = /^V(\d{4})__([a-z0-9_]+)\.sql$/;
const REPEATABLE = /^R__((?:sp|fn|vw)_[a-z0-9_]+)\.sql$/;

export interface ConnectionOptions {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface MigrationFile {
  kind: 'versioned' | 'repeatable';
  version: string; // '0001' o nombre de la rutina
  name: string;
  file: string;
  checksum: string;
  sql: string;
}

export interface MigrateResult {
  applied: string[];
  skipped: number;
}

const checksum = (s: string) => createHash('sha256').update(s.replace(/\r\n/g, '\n')).digest('hex');

export async function loadMigrationFiles(): Promise<MigrationFile[]> {
  const out: MigrationFile[] = [];
  for (const file of (await readdir(MIGRATIONS_DIR)).sort()) {
    if (!file.endsWith('.sql')) continue;
    const m = VERSIONED.exec(file);
    if (!m) throw new Error(`Nombre de migración inválido: ${file} (use V0001__descripcion.sql)`);
    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
    out.push({
      kind: 'versioned',
      version: m[1]!,
      name: m[2]!,
      file,
      checksum: checksum(sql),
      sql,
    });
  }
  const versions = out.map((f) => f.version);
  if (new Set(versions).size !== versions.length) {
    throw new Error('Hay migraciones con el mismo número de versión.');
  }
  for (const file of (await readdir(ROUTINES_DIR)).sort()) {
    if (!file.endsWith('.sql')) continue;
    const m = REPEATABLE.exec(file);
    if (!m) throw new Error(`Nombre de rutina inválido: ${file} (use R__sp_|fn_|vw_nombre.sql)`);
    const sql = await readFile(join(ROUTINES_DIR, file), 'utf8');
    out.push({
      kind: 'repeatable',
      version: m[1]!,
      name: m[1]!,
      file,
      checksum: checksum(sql),
      sql,
    });
  }
  return out;
}

async function ensureHistoryTable(conn: Connection): Promise<void> {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      kind ENUM('versioned','repeatable') NOT NULL,
      version VARCHAR(100) NOT NULL,
      name VARCHAR(150) NOT NULL,
      checksum CHAR(64) NOT NULL,
      applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      execution_ms INT UNSIGNED NOT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_schema_migrations_kind_version (kind, version)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
}

/**
 * Orden de rutinas: funciones → vistas → procedimientos, para respetar dependencias
 * (los SP pueden usar fn_ y vw_; las vistas pueden usar fn_).
 */
const ROUTINE_ORDER = { fn: 0, vw: 1, sp: 2 } as const;
function routineRank(name: string): number {
  return ROUTINE_ORDER[name.slice(0, 2) as keyof typeof ROUTINE_ORDER] ?? 9;
}

export async function migrate(
  opts: ConnectionOptions,
  log: (msg: string) => void = () => {},
): Promise<MigrateResult> {
  const conn = await mysql.createConnection({
    ...opts,
    multipleStatements: false,
    charset: 'utf8mb4',
  });
  const applied: string[] = [];
  let skipped = 0;
  try {
    const [[lock]] = await conn.query<RowDataPacket[]>(
      "SELECT GET_LOCK('aimargen_migrate', 60) AS got",
    );
    if (lock?.got !== 1) throw new Error('No se pudo obtener el lock de migración.');

    await ensureHistoryTable(conn);
    const [rows] = await conn.query<RowDataPacket[]>(
      'SELECT kind, version, checksum FROM schema_migrations',
    );
    const done = new Map(rows.map((r) => [`${r.kind}:${r.version}`, r.checksum as string]));

    const files = await loadMigrationFiles();
    const versioned = files.filter((f) => f.kind === 'versioned');
    const repeatable = files
      .filter((f) => f.kind === 'repeatable')
      .sort((a, b) => routineRank(a.name) - routineRank(b.name) || a.name.localeCompare(b.name));

    for (const f of versioned) {
      const prev = done.get(`versioned:${f.version}`);
      if (prev) {
        if (prev !== f.checksum) {
          throw new Error(
            `La migración ${f.file} ya fue aplicada y su contenido cambió. Cree una nueva migración.`,
          );
        }
        skipped++;
        continue;
      }
      await apply(conn, f);
      applied.push(f.file);
      log(`✔ ${f.file}`);
    }

    for (const f of repeatable) {
      if (done.get(`repeatable:${f.version}`) === f.checksum) {
        skipped++;
        continue;
      }
      await apply(conn, f);
      applied.push(f.file);
      log(`✔ ${f.file}`);
    }

    await conn.query("SELECT RELEASE_LOCK('aimargen_migrate')");
    return { applied, skipped };
  } finally {
    await conn.end();
  }
}

async function apply(conn: Connection, f: MigrationFile): Promise<void> {
  const started = Date.now();
  // Nota: MySQL hace commit implícito en DDL; cada sentencia queda aplicada al ejecutarse.
  // Por eso las migraciones deben ser pequeñas y probadas en `aimargen_test` antes de staging.
  for (const stmt of splitSql(f.sql)) {
    try {
      await conn.query(stmt);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Error en ${f.file}: ${msg}\n--- sentencia ---\n${stmt.slice(0, 500)}`);
    }
  }
  await conn.query(
    `INSERT INTO schema_migrations (kind, version, name, checksum, execution_ms)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE checksum = VALUES(checksum), applied_at = CURRENT_TIMESTAMP(3),
       execution_ms = VALUES(execution_ms)`,
    [f.kind, f.version, f.name, f.checksum, Date.now() - started],
  );
}

/** Elimina y recrea la base. Bloqueado para nombres que parezcan de producción o staging. */
export async function resetDatabase(opts: ConnectionOptions): Promise<void> {
  if (!/^[a-z0-9_]+$/.test(opts.database)) throw new Error('Nombre de base inválido.');
  if (/(prod|staging)/i.test(opts.database) || process.env.NODE_ENV === 'production') {
    throw new Error('Reset bloqueado: no se permite en producción ni staging.');
  }
  const conn = await mysql.createConnection({ ...opts, database: undefined });
  try {
    await conn.query(`DROP DATABASE IF EXISTS \`${opts.database}\``);
    await conn.query(
      `CREATE DATABASE \`${opts.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`,
    );
  } finally {
    await conn.end();
  }
}
