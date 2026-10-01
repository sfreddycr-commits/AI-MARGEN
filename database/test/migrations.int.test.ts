import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mysql from 'mysql2/promise';
import type { Connection, RowDataPacket } from 'mysql2/promise';
import { connectionFromEnv, loadMigrationFiles, migrate } from '../scripts/lib/index.js';

const opts = connectionFromEnv(process.env.DB_NAME_TEST ?? 'aimargen_test');
let conn: Connection;

beforeAll(async () => {
  conn = await mysql.createConnection(opts);
});
afterAll(async () => {
  await conn.end();
});

describe('migraciones (MySQL real)', () => {
  it('se aplicaron todas las migraciones y rutinas', async () => {
    const [rows] = await conn.query<RowDataPacket[]>(
      'SELECT kind, version FROM schema_migrations ORDER BY id',
    );
    expect(rows.some((r) => r.kind === 'versioned' && r.version === '0001')).toBe(true);
    expect(rows.some((r) => r.kind === 'repeatable' && r.version === 'sp_system_ping')).toBe(true);
  });

  it('son idempotentes: una segunda corrida no aplica nada', async () => {
    const result = await migrate(opts);
    expect(result.applied).toEqual([]);
  });

  it('sp_system_ping responde con la versión del esquema', async () => {
    const [sets] = await conn.query<RowDataPacket[][]>('CALL sp_system_ping()');
    const row = sets[0]?.[0];
    const latest = (await loadMigrationFiles())
      .filter((f) => f.kind === 'versioned')
      .map((f) => f.version)
      .sort()
      .at(-1);
    expect(row?.schema_version).toBe(latest);
    expect(row?.db_time).toBeInstanceOf(Date);
  });

  it('la base usa utf8mb4', async () => {
    const [rows] = await conn.query<RowDataPacket[]>(
      'SELECT DEFAULT_CHARACTER_SET_NAME AS cs FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
      [opts.database],
    );
    expect(rows[0]?.cs).toBe('utf8mb4');
  });
});
