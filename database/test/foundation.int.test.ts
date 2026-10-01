import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Connection, RowDataPacket } from 'mysql2/promise';
import {
  callSp,
  createTestTenant,
  createTestUser,
  openTestConnection,
  testConnectionOptions,
} from './fixtures.js';

let conn: Connection;
const schema = testConnectionOptions().database;

beforeAll(async () => {
  conn = await openTestConnection();
});
afterAll(async () => {
  await conn.end();
});

describe('esquema base: integridad estructural (introspección real)', () => {
  it('toda tabla con tenant_id tiene FK a tenants e índice que inicia con tenant_id', async () => {
    const [tables] = await conn.query<RowDataPacket[]>(
      `SELECT c.TABLE_NAME AS t FROM information_schema.COLUMNS c
       JOIN information_schema.TABLES tb ON tb.TABLE_SCHEMA = c.TABLE_SCHEMA AND tb.TABLE_NAME = c.TABLE_NAME
       WHERE c.TABLE_SCHEMA = ? AND c.COLUMN_NAME = 'tenant_id' AND c.TABLE_NAME <> 'tenants' AND tb.TABLE_TYPE = 'BASE TABLE'`,
      [schema],
    );
    expect(tables.length).toBeGreaterThan(0);
    for (const { t } of tables) {
      const [fk] = await conn.query<RowDataPacket[]>(
        `SELECT 1 FROM information_schema.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = 'tenant_id'
           AND REFERENCED_TABLE_NAME = 'tenants'`,
        [schema, t],
      );
      expect(fk.length, `${t}: FK tenant_id → tenants`).toBe(1);
      const [ix] = await conn.query<RowDataPacket[]>(
        `SELECT 1 FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = 'tenant_id' AND SEQ_IN_INDEX = 1`,
        [schema, t],
      );
      expect(ix.length, `${t}: índice que inicia con tenant_id`).toBeGreaterThan(0);
    }
  });

  it('toda columna con FK tiene un índice que inicia con ella', async () => {
    const [fks] = await conn.query<RowDataPacket[]>(
      `SELECT TABLE_NAME AS t, COLUMN_NAME AS c FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL AND ORDINAL_POSITION = 1`,
      [schema],
    );
    for (const { t, c } of fks) {
      const [ix] = await conn.query<RowDataPacket[]>(
        `SELECT 1 FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? AND SEQ_IN_INDEX = 1`,
        [schema, t, c],
      );
      expect(ix.length, `${t}.${c} indexada`).toBeGreaterThan(0);
    }
  });

  it('todas las tablas usan InnoDB y utf8mb4', async () => {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT TABLE_NAME AS t, ENGINE AS e, TABLE_COLLATION AS c FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
      [schema],
    );
    for (const r of rows) {
      expect(r.e, r.t).toBe('InnoDB');
      expect(String(r.c), r.t).toMatch(/^utf8mb4/);
    }
  });

  it('las rutinas y vistas cumplen prefijos sp_ / fn_ / vw_', async () => {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT ROUTINE_NAME AS n, ROUTINE_TYPE AS k FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ?
       UNION ALL SELECT TABLE_NAME, 'VIEW' FROM information_schema.VIEWS WHERE TABLE_SCHEMA = ?`,
      [schema, schema],
    );
    for (const r of rows) {
      expect(r.n).toMatch(r.k === 'PROCEDURE' ? /^sp_/ : r.k === 'VIEW' ? /^vw_/ : /^fn_/);
    }
  });
});

describe('datos de referencia: roles y permisos', () => {
  const permsOf = async (role: string) => {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT p.code FROM roles r JOIN role_permissions rp ON rp.role_id = r.id
       JOIN permissions p ON p.id = rp.permission_id WHERE r.code = ?`,
      [role],
    );
    return rows.map((r) => r.code as string);
  };

  it('existen los 6 roles base del SOP', async () => {
    const [rows] = await conn.query<RowDataPacket[]>(
      'SELECT code FROM roles ORDER BY rank_level DESC',
    );
    expect(rows.map((r) => r.code)).toEqual([
      'super_admin',
      'tenant_owner',
      'tenant_admin',
      'manager',
      'operator',
      'viewer',
    ]);
  });

  it('super_admin solo tiene platform.admin y nadie más lo tiene', async () => {
    expect(await permsOf('super_admin')).toEqual(['platform.admin']);
    for (const r of ['tenant_owner', 'tenant_admin', 'manager', 'operator', 'viewer']) {
      expect(await permsOf(r)).not.toContain('platform.admin');
    }
  });

  it('viewer no tiene ningún permiso de escritura', async () => {
    const perms = await permsOf('viewer');
    expect(perms.filter((p) => /\.(write|update|manage|export|confirm_actions)$/.test(p))).toEqual(
      [],
    );
  });

  it('operator no puede cambiar precios ni recetas', async () => {
    const perms = await permsOf('operator');
    expect(perms).not.toContain('pricing.write');
    expect(perms).not.toContain('products.write');
    expect(perms).toContain('purchases.write');
  });
});

describe('restricciones de datos', () => {
  it('el tenant recibe uuid automático y moneda CRC por defecto', async () => {
    const t = await createTestTenant(conn);
    expect(t.uuid).toMatch(/^[0-9a-f-]{36}$/);
    const [rows] = await conn.query<RowDataPacket[]>(
      'SELECT currency, country, timezone, status FROM tenants WHERE id = ?',
      [t.id],
    );
    expect(rows[0]).toMatchObject({
      currency: 'CRC',
      country: 'CR',
      timezone: 'America/Costa_Rica',
      status: 'active',
    });
  });

  it('rechaza moneda con formato inválido', async () => {
    await expect(
      conn.query(
        `INSERT INTO tenants (name, slug, plan_id, currency) VALUES ('X', 'x-bad-cur', 1, 'crc')`,
      ),
    ).rejects.toThrow(/ck_tenants_currency/);
  });

  it('rechaza slug duplicado', async () => {
    const t = await createTestTenant(conn);
    await expect(
      conn.query(`INSERT INTO tenants (name, slug, plan_id) VALUES ('Y', ?, 1)`, [t.slug]),
    ).rejects.toThrow(/Duplicate/);
  });

  it('rechaza usuario apuntando a un tenant inexistente (FK)', async () => {
    await expect(createTestUser(conn, 999_999_999)).rejects.toThrow(/foreign key/i);
  });

  it('rechaza margen objetivo >= 100% o negativo', async () => {
    const t = await createTestTenant(conn);
    await expect(
      conn.query('INSERT INTO tenant_settings (tenant_id, default_target_margin) VALUES (?, 1)', [
        t.id,
      ]),
    ).rejects.toThrow(/ck_tenant_settings_margin/);
    await expect(
      conn.query(
        'INSERT INTO tenant_settings (tenant_id, default_target_margin) VALUES (?, -0.1)',
        [t.id],
      ),
    ).rejects.toThrow();
    await conn.query(
      'INSERT INTO tenant_settings (tenant_id, default_target_margin) VALUES (?, 0.4)',
      [t.id],
    );
  });
});

describe('SP de sincronización', () => {
  it('sp_sync_bump_version incrementa y sp_sync_get_versions solo devuelve el tenant propio', async () => {
    const a = await createTestTenant(conn, 'A');
    const b = await createTestTenant(conn, 'B');
    await callSp(conn, 'sp_sync_bump_version', [a.id, 'ingredients']);
    await callSp(conn, 'sp_sync_bump_version', [a.id, 'ingredients']);
    await callSp(conn, 'sp_sync_bump_version', [a.id, 'products']);
    await callSp(conn, 'sp_sync_bump_version', [b.id, 'ingredients']);

    const va = await callSp<{ entity: string; version: string }>(conn, 'sp_sync_get_versions', [
      a.id,
    ]);
    expect(va.map((r) => [r.entity, String(r.version)])).toEqual([
      ['ingredients', '2'],
      ['products', '1'],
    ]);
    const vb = await callSp<{ entity: string; version: string }>(conn, 'sp_sync_get_versions', [
      b.id,
    ]);
    expect(vb.map((r) => [r.entity, String(r.version)])).toEqual([['ingredients', '1']]);
  });

  it('rechaza nombres de entidad inválidos', async () => {
    const a = await createTestTenant(conn);
    await expect(callSp(conn, 'sp_sync_bump_version', [a.id, 'x; DROP'])).rejects.toThrow(
      /ERR_VALIDATION/,
    );
  });
});

describe('SP de auditoría', () => {
  it('registra before/after como JSON', async () => {
    const t = await createTestTenant(conn);
    const u = await createTestUser(conn, t.id);
    const [row] = await callSp<{ id: number }>(conn, 'sp_audit_log_create', [
      t.id,
      u.id,
      'tenant_settings.update',
      'tenant_settings',
      t.uuid,
      JSON.stringify({ default_target_margin: null }),
      JSON.stringify({ default_target_margin: '0.40' }),
      '127.0.0.1',
      'vitest',
      'req-1',
    ]);
    const [rows] = await conn.query<RowDataPacket[]>(
      'SELECT action, after_json FROM audit_logs WHERE id = ?',
      [row!.id],
    );
    expect(rows[0]!.action).toBe('tenant_settings.update');
    expect(rows[0]!.after_json).toEqual({ default_target_margin: '0.40' });
  });

  it('rechaza acción vacía', async () => {
    await expect(
      callSp(conn, 'sp_audit_log_create', [
        null,
        null,
        ' ',
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ]),
    ).rejects.toThrow(/ERR_VALIDATION/);
  });
});
