import mysql from 'mysql2/promise';
import type { Connection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { connectionFromEnv } from '../scripts/lib/index.js';

/**
 * Utilidades de pruebas de integración. Pueden usar SQL directo para preparar escenarios
 * (la regla "solo SPs" aplica al código de la aplicación, no a los fixtures de prueba).
 */
export function testConnectionOptions() {
  return connectionFromEnv(process.env.DB_NAME_TEST ?? 'aimargen_test');
}

export async function openTestConnection(): Promise<Connection> {
  return mysql.createConnection({ ...testConnectionOptions(), multipleStatements: false });
}

let seq = 0;
const unique = () => `${Date.now().toString(36)}${(seq++).toString(36)}`;

export interface TestTenant {
  id: number;
  uuid: string;
  slug: string;
}

export async function createTestTenant(
  conn: Connection,
  name = 'Negocio de prueba',
): Promise<TestTenant> {
  const slug = `t-${unique()}`;
  const [res] = await conn.query<ResultSetHeader>(
    `INSERT INTO tenants (name, slug, plan_id) VALUES (?, ?, (SELECT id FROM plans WHERE code = 'inicial'))`,
    [name, slug],
  );
  const [rows] = await conn.query<RowDataPacket[]>('SELECT uuid FROM tenants WHERE id = ?', [
    res.insertId,
  ]);
  return { id: res.insertId, uuid: rows[0]!.uuid as string, slug };
}

export async function createTestUser(
  conn: Connection,
  tenantId: number | null,
  role = 'tenant_owner',
): Promise<{ id: number; uuid: string; email: string }> {
  const email = `u-${unique()}@prueba.test`;
  const [res] = await conn.query<ResultSetHeader>(
    `INSERT INTO users (tenant_id, name, email, password_hash, role_id)
     VALUES (?, 'Usuario de prueba', ?, 'x', (SELECT id FROM roles WHERE code = ?))`,
    [tenantId, email, role],
  );
  const [rows] = await conn.query<RowDataPacket[]>('SELECT uuid FROM users WHERE id = ?', [
    res.insertId,
  ]);
  return { id: res.insertId, uuid: rows[0]!.uuid as string, email };
}

/** Ejecuta un SP y devuelve el primer result set. */
export async function callSp<T = RowDataPacket>(
  conn: Connection,
  name: string,
  params: unknown[] = [],
): Promise<T[]> {
  const ph = params.map(() => '?').join(', ');
  const [result] = await conn.query(`CALL ${name}(${ph})`, params);
  const first = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : [];
  return first as T[];
}
