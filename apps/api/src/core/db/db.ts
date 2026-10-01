import mysql from 'mysql2/promise';
import type { Pool, PoolOptions, RowDataPacket } from 'mysql2/promise';
import { DbError } from './db-error.js';

/**
 * Acceso a MySQL exclusivamente mediante stored procedures (ADR-0003).
 * No existe API para ejecutar SQL arbitrario desde los modelos.
 */

const SP_NAME = /^sp_[a-z0-9_]+$/;

export type SpParam = string | number | boolean | null | Date;

export interface Db {
  /** Ejecuta `CALL sp_name(?, ?, ...)` y devuelve todos los result sets. */
  call<T = RowDataPacket>(spName: string, params?: readonly SpParam[]): Promise<T[][]>;
  /** Igual que `call` pero devuelve solo el primer result set. */
  callOne<T = RowDataPacket>(spName: string, params?: readonly SpParam[]): Promise<T[]>;
  ping(): Promise<boolean>;
  close(): Promise<void>;
}

export interface DbOptions {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  poolSize?: number;
}

export function createDb(opts: DbOptions): Db {
  const poolOptions: PoolOptions = {
    host: opts.host,
    port: opts.port,
    user: opts.user,
    password: opts.password,
    database: opts.database,
    connectionLimit: opts.poolSize ?? 10,
    waitForConnections: true,
    // DECIMAL llega como string para no perder precisión (ADR-0006).
    decimalNumbers: false,
    supportBigNumbers: true,
    // BIGINT como number (los ids internos nunca superan 2^53); DECIMAL sigue como string.
    bigNumberStrings: false,
    dateStrings: false,
    timezone: 'Z',
    charset: 'utf8mb4',
    multipleStatements: false,
    namedPlaceholders: false,
  };
  const pool: Pool = mysql.createPool(poolOptions);
  // Toda la aplicación trabaja en UTC: NOW(3) en los SP y las fechas que lee mysql2 coinciden.
  pool.pool.on('connection', (conn) => {
    conn.query("SET time_zone = '+00:00'");
  });

  async function call<T>(spName: string, params: readonly SpParam[] = []): Promise<T[][]> {
    if (!SP_NAME.test(spName)) {
      throw new Error(`Nombre de stored procedure inválido: ${spName}`);
    }
    const placeholders = params.map(() => '?').join(', ');
    try {
      const [result] = await pool.query(`CALL ${spName}(${placeholders})`, params as SpParam[]);
      // mysql2 devuelve [rs1, rs2, ..., ResultSetHeader]; se descartan los headers.
      const sets = Array.isArray(result) ? result : [];
      return sets.filter((s): s is T[] & RowDataPacket[] => Array.isArray(s)) as T[][];
    } catch (err) {
      throw DbError.from(err, spName);
    }
  }

  return {
    call,
    async callOne<T>(spName: string, params: readonly SpParam[] = []) {
      const sets = await call<T>(spName, params);
      return sets[0] ?? [];
    },
    async ping() {
      try {
        const conn = await pool.getConnection();
        try {
          await conn.ping();
          return true;
        } finally {
          conn.release();
        }
      } catch {
        return false;
      }
    },
    async close() {
      await pool.end();
    },
  };
}

/**
 * Fila devuelta por un SP. Las filas de BD no tienen tipo en tiempo de ejecución; los mappers
 * de cada módulo (`*.dto.ts`) las convierten en contratos tipados de la API.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;
