import { openDB, deleteDB, type DBSchema, type IDBPDatabase } from 'idb';

/**
 * Cache local en IndexedDB (ADR-0007).
 * Una base por tenant + usuario: `aimargen:<tenantUuid>:<userUuid>`. Al cerrar sesión se borran todas.
 * - `records`: filas sincronizadas de cualquier entidad, clave [entity, uuid].
 * - `sync`: estado de sincronización por entidad (versión del servidor y cursor de cambios).
 * - `kv`: datos de referencia y configuración (unidades, roles, settings del tenant).
 */
export const DB_PREFIX = 'aimargen:';
const DB_VERSION = 1;

export interface LocalRecord<T = unknown> {
  entity: string;
  uuid: string;
  data: T;
  updatedAt: string;
}

export interface EntitySyncState {
  entity: string;
  version: number;
  cursor: string | null;
  syncedAt: string;
}

interface AimargenDB extends DBSchema {
  records: {
    key: [string, string];
    value: LocalRecord;
    indexes: { byEntity: string };
  };
  sync: {
    key: string;
    value: EntitySyncState;
  };
  kv: {
    key: string;
    value: { key: string; value: unknown; savedAt: string };
  };
}

export type LocalDb = IDBPDatabase<AimargenDB>;

export function localDbName(tenantUuid: string, userUuid: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(tenantUuid) || !/^[0-9a-f-]{36}$/i.test(userUuid)) {
    throw new Error('Identificadores de sesión inválidos para la base local.');
  }
  return `${DB_PREFIX}${tenantUuid}:${userUuid}`;
}

export function openLocalDb(tenantUuid: string, userUuid: string): Promise<LocalDb> {
  return openDB<AimargenDB>(localDbName(tenantUuid, userUuid), DB_VERSION, {
    upgrade(db) {
      const records = db.createObjectStore('records', { keyPath: ['entity', 'uuid'] });
      records.createIndex('byEntity', 'entity');
      db.createObjectStore('sync', { keyPath: 'entity' });
      db.createObjectStore('kv', { keyPath: 'key' });
    },
  });
}

/** Lecturas y escrituras de alto nivel sobre la base abierta. */
export function localStore(db: LocalDb) {
  return {
    async list<T>(entity: string): Promise<T[]> {
      const rows = await db.getAllFromIndex('records', 'byEntity', entity);
      return rows.map((r) => r.data as T);
    },
    async get<T>(entity: string, uuid: string): Promise<T | undefined> {
      return (await db.get('records', [entity, uuid]))?.data as T | undefined;
    },
    /** Aplica en una sola transacción un lote de altas/cambios y bajas (tombstones). */
    async applyChanges(
      entity: string,
      upserts: Array<{ uuid: string; data: unknown; updatedAt: string }>,
      deletes: string[],
      state?: Omit<EntitySyncState, 'entity'>,
    ): Promise<void> {
      const tx = db.transaction(['records', 'sync'], 'readwrite');
      const records = tx.objectStore('records');
      for (const u of upserts) await records.put({ entity, ...u });
      for (const uuid of deletes) await records.delete([entity, uuid]);
      if (state) await tx.objectStore('sync').put({ entity, ...state });
      await tx.done;
    },
    async getSyncState(entity: string): Promise<EntitySyncState | undefined> {
      return db.get('sync', entity);
    },
    async setKv(key: string, value: unknown): Promise<void> {
      await db.put('kv', { key, value, savedAt: new Date().toISOString() });
    },
    async getKv<T>(key: string): Promise<T | undefined> {
      return (await db.get('kv', key))?.value as T | undefined;
    },
    /** Cierra la conexión (necesario antes de borrar la base: deleteDB espera a que no haya conexiones). */
    close(): void {
      db.close();
    },
  };
}

export type LocalStore = ReturnType<typeof localStore>;

/**
 * Borra TODAS las bases locales de AImargen del navegador (logout o cambio de usuario/tenant).
 * Si el navegador no permite listar bases, borra al menos la indicada.
 */
export async function clearAllLocalData(current?: {
  tenantUuid: string;
  userUuid: string;
}): Promise<void> {
  const names = new Set<string>();
  if (current) names.add(localDbName(current.tenantUuid, current.userUuid));
  if (typeof indexedDB.databases === 'function') {
    for (const info of await indexedDB.databases()) {
      if (info.name?.startsWith(DB_PREFIX)) names.add(info.name);
    }
  }
  await Promise.all([...names].map((n) => deleteDB(n)));
  try {
    for (const k of Object.keys(localStorage))
      if (k.startsWith(DB_PREFIX)) localStorage.removeItem(k);
  } catch {
    // localStorage no disponible: nada que limpiar.
  }
}
