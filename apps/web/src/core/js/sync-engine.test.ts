import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAllLocalData, localDbName, localStore, openLocalDb, type LocalDb } from './local-db';
import { SyncEngine, type ChangeSet, type SyncTransport } from './sync-engine';

const TENANT = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';

/** Servidor falso con versiones y páginas de cambios. */
function fakeServer() {
  const versions: Record<string, number> = {};
  const pages: Record<string, Map<string | null, ChangeSet>> = {};
  const transport: SyncTransport = {
    getVersions: vi.fn(async () => ({ ...versions })),
    getChanges: vi.fn(async (entity: string, cursor: string | null) => {
      const page = pages[entity]?.get(cursor);
      if (!page) throw new Error(`sin página ${entity}@${cursor}`);
      return page;
    }),
  };
  return {
    transport,
    setVersion(entity: string, v: number) {
      versions[entity] = v;
    },
    addPage(entity: string, cursor: string | null, page: ChangeSet) {
      (pages[entity] ??= new Map()).set(cursor, page);
    },
  };
}

let db: LocalDb;
beforeEach(async () => {
  db = await openLocalDb(TENANT, USER);
});
afterEach(async () => {
  db.close();
  await clearAllLocalData();
});

describe('local-db', () => {
  it('usa una base por tenant + usuario y valida los identificadores', () => {
    expect(localDbName(TENANT, USER)).toBe(`aimargen:${TENANT}:${USER}`);
    expect(() => localDbName('x', USER)).toThrow();
  });

  it('clearAllLocalData borra todas las bases de AImargen', async () => {
    const store = localStore(db);
    await store.setKv('settings', { scale: 2 });
    db.close();
    await clearAllLocalData();
    const names = (await indexedDB.databases()).map((d) => d.name);
    expect(names.filter((n) => n?.startsWith('aimargen:'))).toEqual([]);
    db = await openLocalDb(TENANT, USER);
    expect(await localStore(db).getKv('settings')).toBeUndefined();
  });
});

describe('SyncEngine', () => {
  it('primera sincronización: descarga todo, pagina y guarda versión y cursor', async () => {
    const s = fakeServer();
    s.setVersion('ingredients', 3);
    s.addPage('ingredients', null, {
      items: [{ uuid: 'a', deleted: false, updatedAt: 't1', data: { name: 'Harina' } }],
      cursor: 'c1',
      hasMore: true,
    });
    s.addPage('ingredients', 'c1', {
      items: [{ uuid: 'b', deleted: false, updatedAt: 't2', data: { name: 'Leche' } }],
      cursor: 'c2',
      hasMore: false,
    });
    const store = localStore(db);
    const onEntityChanged = vi.fn();
    const engine = new SyncEngine({
      store,
      transport: s.transport,
      entities: ['ingredients'],
      onEntityChanged,
    });

    expect(await engine.sync()).toEqual(['ingredients']);
    expect(await store.list('ingredients')).toEqual([{ name: 'Harina' }, { name: 'Leche' }]);
    expect(await store.getSyncState('ingredients')).toMatchObject({ version: 3, cursor: 'c2' });
    expect(onEntityChanged).toHaveBeenCalledWith('ingredients');
  });

  it('si la versión no cambió no descarga nada', async () => {
    const s = fakeServer();
    s.setVersion('ingredients', 1);
    s.addPage('ingredients', null, { items: [], cursor: 'c1', hasMore: false });
    const engine = new SyncEngine({
      store: localStore(db),
      transport: s.transport,
      entities: ['ingredients'],
    });
    await engine.sync();
    vi.mocked(s.transport.getChanges).mockClear();
    expect(await engine.sync()).toEqual([]);
    expect(s.transport.getChanges).not.toHaveBeenCalled();
  });

  it('delta: aplica cambios y tombstones desde el cursor guardado', async () => {
    const s = fakeServer();
    const store = localStore(db);
    s.setVersion('products', 1);
    s.addPage('products', null, {
      items: [
        { uuid: 'p1', deleted: false, updatedAt: 't1', data: { name: 'Cappuccino' } },
        { uuid: 'p2', deleted: false, updatedAt: 't1', data: { name: 'Cheesecake' } },
      ],
      cursor: 'c1',
      hasMore: false,
    });
    const engine = new SyncEngine({ store, transport: s.transport, entities: ['products'] });
    await engine.sync();

    s.setVersion('products', 2);
    s.addPage('products', 'c1', {
      items: [
        { uuid: 'p1', deleted: false, updatedAt: 't2', data: { name: 'Cappuccino grande' } },
        { uuid: 'p2', deleted: true, updatedAt: 't2' },
      ],
      cursor: 'c2',
      hasMore: false,
    });
    await engine.sync();
    expect(await store.list('products')).toEqual([{ name: 'Cappuccino grande' }]);
    expect(s.transport.getChanges).toHaveBeenLastCalledWith('products', 'c1', true);
  });

  it('write-through: la escritura propia se ve de inmediato sin esperar sincronización', async () => {
    const s = fakeServer();
    const store = localStore(db);
    const engine = new SyncEngine({ store, transport: s.transport, entities: ['ingredients'] });
    await engine.applyLocalWrite('ingredients', 'x', { name: 'Azúcar' }, 't1');
    expect(await store.get('ingredients', 'x')).toEqual({ name: 'Azúcar' });
    await engine.applyLocalDelete('ingredients', 'x');
    expect(await store.get('ingredients', 'x')).toBeUndefined();
  });

  it('llamadas concurrentes comparten una sola ejecución', async () => {
    const s = fakeServer();
    s.setVersion('ingredients', 0);
    const engine = new SyncEngine({
      store: localStore(db),
      transport: s.transport,
      entities: ['ingredients'],
    });
    await Promise.all([engine.sync(), engine.sync(), engine.sync()]);
    expect(s.transport.getVersions).toHaveBeenCalledTimes(1);
  });

  it('un error de red se reporta y no rompe el cache existente', async () => {
    const s = fakeServer();
    const store = localStore(db);
    await store.applyChanges(
      'ingredients',
      [{ uuid: 'a', data: { name: 'Harina' }, updatedAt: 't' }],
      [],
    );
    vi.mocked(s.transport.getVersions).mockRejectedValueOnce(new Error('offline'));
    const onError = vi.fn();
    const engine = new SyncEngine({
      store,
      transport: s.transport,
      entities: ['ingredients'],
      onError,
    });
    expect(await engine.sync()).toEqual([]);
    expect(onError).toHaveBeenCalled();
    expect(await store.list('ingredients')).toEqual([{ name: 'Harina' }]);
  });

  it('start() registra los disparadores y stop() los retira', async () => {
    vi.useFakeTimers();
    const s = fakeServer();
    const engine = new SyncEngine({
      store: localStore(db),
      transport: s.transport,
      entities: [],
      intervalMs: 60_000,
    });
    const listeners = new Map<string, () => void>();
    const target = {
      document: {
        visibilityState: 'visible',
        addEventListener: (t: string, fn: () => void) => listeners.set(`doc:${t}`, fn),
        removeEventListener: (t: string) => listeners.delete(`doc:${t}`),
      },
      navigator: { onLine: true },
      addEventListener: (t: string, fn: () => void) => listeners.set(t, fn),
      removeEventListener: (t: string) => listeners.delete(t),
    } as unknown as Window;

    const stop = engine.start(target);
    expect([...listeners.keys()].sort()).toEqual(['doc:visibilitychange', 'focus', 'online']);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(vi.mocked(s.transport.getVersions).mock.calls.length).toBeGreaterThanOrEqual(2);
    stop();
    expect(listeners.size).toBe(0);
    vi.useRealTimers();
  });
});
