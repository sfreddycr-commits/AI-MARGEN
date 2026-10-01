import type { Db } from '../../core/db/db.js';

/**
 * Modelo del módulo system: recibe datos y los envía a SPs. Sin lógica (ADR-0003).
 */
export interface SystemPingRow {
  db_time: Date;
  schema_version: string | null;
}

export function createSystemModel(db: Db) {
  return {
    /** Conectividad a nivel de SP: valida que la BD responde y que las migraciones existen. */
    async ping(): Promise<SystemPingRow | null> {
      const rows = await db.callOne<SystemPingRow>('sp_system_ping');
      return rows[0] ?? null;
    },
    async pingConnection(): Promise<boolean> {
      return db.ping();
    },
  };
}

export type SystemModel = ReturnType<typeof createSystemModel>;
