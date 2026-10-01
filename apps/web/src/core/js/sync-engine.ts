import type { LocalStore } from './local-db';

/**
 * Motor de sincronización servidor → IndexedDB (ADR-0007).
 *
 * Momentos de sincronización:
 *  1. Al iniciar (login / apertura): completa la primera vez, por diferencias después.
 *  2. Write-through: `applyLocalWrite` tras una mutación propia confirmada por el servidor.
 *  3. Al volver a la app (visibilitychange → visible, focus).
 *  4. Cada 60 s mientras la app está visible (solo consulta versiones).
 *  5. Al recuperar conexión (online).
 * El cierre de sesión borra la base (ver clearAllLocalData).
 */

export interface ChangeSet {
  items: Array<{ uuid: string; deleted: boolean; updatedAt: string; data?: unknown }>;
  /** Cursor opaco para pedir los siguientes cambios. */
  cursor: string | null;
  /** Hay más páginas pendientes. */
  hasMore: boolean;
}

export interface SyncTransport {
  getVersions(): Promise<Record<string, number>>;
  getChanges(entity: string, cursor: string | null): Promise<ChangeSet>;
}

export interface SyncEngineOptions {
  store: LocalStore;
  transport: SyncTransport;
  entities: string[];
  intervalMs?: number;
  onEntityChanged?: (entity: string) => void;
  onError?: (err: unknown) => void;
  now?: () => Date;
}

export type SyncTrigger = 'start' | 'visible' | 'focus' | 'interval' | 'online' | 'manual';

export class SyncEngine {
  private readonly opts: Required<Omit<SyncEngineOptions, 'onEntityChanged' | 'onError'>> &
    Pick<SyncEngineOptions, 'onEntityChanged' | 'onError'>;
  private inFlight: Promise<string[]> | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private cleanup: Array<() => void> = [];

  constructor(opts: SyncEngineOptions) {
    this.opts = { intervalMs: 60_000, now: () => new Date(), ...opts };
  }

  /**
   * Compara versiones y descarga cambios de las entidades desactualizadas.
   * Llamadas concurrentes comparten la misma ejecución. Devuelve las entidades actualizadas.
   */
  sync(_trigger: SyncTrigger = 'manual'): Promise<string[]> {
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.run().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async run(): Promise<string[]> {
    const { store, transport, entities } = this.opts;
    const changed: string[] = [];
    try {
      const remote = await transport.getVersions();
      for (const entity of entities) {
        const remoteVersion = remote[entity] ?? 0;
        const local = await store.getSyncState(entity);
        if (local && local.version >= remoteVersion) continue;
        if (!local && remoteVersion === 0) continue;

        let cursor = local?.cursor ?? null;
        let hasMore = true;
        while (hasMore) {
          const page = await transport.getChanges(entity, cursor);
          const upserts = page.items
            .filter((i) => !i.deleted)
            .map((i) => ({ uuid: i.uuid, data: i.data, updatedAt: i.updatedAt }));
          const deletes = page.items.filter((i) => i.deleted).map((i) => i.uuid);
          cursor = page.cursor ?? cursor;
          hasMore = page.hasMore;
          await store.applyChanges(entity, upserts, deletes, {
            // La versión solo se marca al terminar la última página
            version: hasMore ? (local?.version ?? 0) : remoteVersion,
            cursor,
            syncedAt: this.opts.now().toISOString(),
          });
        }
        changed.push(entity);
        this.opts.onEntityChanged?.(entity);
      }
    } catch (err) {
      this.opts.onError?.(err);
    }
    return changed;
  }

  /** Write-through: refleja de inmediato en el cache una escritura confirmada por el servidor. */
  async applyLocalWrite(
    entity: string,
    uuid: string,
    data: unknown,
    updatedAt: string,
  ): Promise<void> {
    await this.opts.store.applyChanges(entity, [{ uuid, data, updatedAt }], []);
    this.opts.onEntityChanged?.(entity);
  }

  async applyLocalDelete(entity: string, uuid: string): Promise<void> {
    await this.opts.store.applyChanges(entity, [], [uuid]);
    this.opts.onEntityChanged?.(entity);
  }

  /** Activa los disparadores del navegador. Devuelve la función para detenerlos. */
  start(target: Window = window): () => void {
    this.stop();
    void this.sync('start');

    const isVisible = () => target.document.visibilityState === 'visible';
    const onVisibility = () => {
      if (isVisible()) void this.sync('visible');
    };
    const onFocus = () => void this.sync('focus');
    const onOnline = () => void this.sync('online');

    target.document.addEventListener('visibilitychange', onVisibility);
    target.addEventListener('focus', onFocus);
    target.addEventListener('online', onOnline);
    this.timer = setInterval(() => {
      if (isVisible() && target.navigator.onLine) void this.sync('interval');
    }, this.opts.intervalMs);

    this.cleanup = [
      () => target.document.removeEventListener('visibilitychange', onVisibility),
      () => target.removeEventListener('focus', onFocus),
      () => target.removeEventListener('online', onOnline),
    ];
    return () => this.stop();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    for (const fn of this.cleanup) fn();
    this.cleanup = [];
  }
}
