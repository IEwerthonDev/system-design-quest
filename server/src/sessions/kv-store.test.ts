import { beforeEach, describe, expect, it } from 'vitest';
import type { ArchitectureGraph, DesignSessionRecord } from '@sdq/shared';
import { createKvSessionStore, KvSessionStore, type KvClient } from './kv-store';

const emptyGraph: ArchitectureGraph = { nodes: [], edges: [] };

function record(overrides: Partial<DesignSessionRecord> = {}): DesignSessionRecord {
  return {
    id: 'sess-1',
    problemId: 'url-shortener',
    playerNickname: 'alice',
    status: 'in_progress',
    graph: emptyGraph,
    createdAt: '2026-07-27T10:00:00.000Z',
    updatedAt: '2026-07-27T10:00:00.000Z',
    ...overrides,
  };
}

function createMockKv(): KvClient & { store: Map<string, unknown>; sets: Map<string, Set<string>> } {
  const store = new Map<string, unknown>();
  const sets = new Map<string, Set<string>>();

  return {
    store,
    sets,
    async get<T>(key: string): Promise<T | null> {
      if (!store.has(key)) {
        return null;
      }
      return structuredClone(store.get(key)) as T;
    },
    async set(key: string, value: unknown): Promise<'OK'> {
      store.set(key, structuredClone(value));
      return 'OK';
    },
    async del(...keys: string[]): Promise<number> {
      let n = 0;
      for (const key of keys) {
        if (store.delete(key)) {
          n += 1;
        }
        sets.delete(key);
      }
      return n;
    },
    async sadd(key: string, ...members: string[]): Promise<number> {
      let set = sets.get(key);
      if (!set) {
        set = new Set();
        sets.set(key, set);
      }
      let added = 0;
      for (const member of members) {
        if (!set.has(member)) {
          set.add(member);
          added += 1;
        }
      }
      return added;
    },
    async smembers(key: string): Promise<string[]> {
      return [...(sets.get(key) ?? [])];
    },
    async srem(key: string, ...members: string[]): Promise<number> {
      const set = sets.get(key);
      if (!set) {
        return 0;
      }
      let removed = 0;
      for (const member of members) {
        if (set.delete(member)) {
          removed += 1;
        }
      }
      return removed;
    },
  };
}

describe('KvSessionStore', () => {
  let kv: ReturnType<typeof createMockKv>;
  let store: KvSessionStore;

  beforeEach(() => {
    kv = createMockKv();
    store = new KvSessionStore(kv);
  });

  it('upserts under sess:{id} and indexes sessidx:{nickname}', async () => {
    const saved = await store.upsert(record({ id: 'a', status: 'approved' }));
    expect(saved.id).toBe('a');
    expect(kv.store.has('sess:a')).toBe(true);
    expect(await kv.smembers('sessidx:alice')).toEqual(['a']);
    expect((await store.getById('a'))?.status).toBe('approved');

    await store.upsert(record({ id: 'a', status: 'rejected', updatedAt: '2026-07-27T11:00:00.000Z' }));
    expect((await store.getById('a'))?.status).toBe('rejected');
    expect(await store.listByNickname('alice')).toHaveLength(1);
  });

  it('listByNickname filters by nickname and optional status', async () => {
    await store.upsert(record({ id: '1', playerNickname: 'alice', status: 'approved' }));
    await store.upsert(record({ id: '2', playerNickname: 'alice', status: 'rejected' }));
    await store.upsert(record({ id: '3', playerNickname: 'bob', status: 'approved' }));

    expect(await store.listByNickname('alice')).toHaveLength(2);
    expect((await store.listByNickname('alice', 'approved')).map((s) => s.id)).toEqual(['1']);
    expect(await store.listByNickname('bob')).toHaveLength(1);
  });

  it('delete removes record and index membership', async () => {
    await store.upsert(record({ id: 'gone' }));
    await store.delete('gone');
    expect(await store.getById('gone')).toBeNull();
    expect(await kv.smembers('sessidx:alice')).toEqual([]);
  });

  it('reset clears tracked session keys', async () => {
    await store.upsert(record({ id: '1' }));
    await store.upsert(record({ id: '2', playerNickname: 'bob' }));
    await store.reset();
    expect(await store.listByNickname('alice')).toHaveLength(0);
    expect(await store.getById('1')).toBeNull();
  });
});

describe('createKvSessionStore', () => {
  it('throws a clear error when KV env is missing', () => {
    expect(() => createKvSessionStore({})).toThrow(/KV_REST_API_URL|KV_REST_API_TOKEN|Vercel KV/i);
  });

  it('accepts an injected Kv client without requiring env', () => {
    const kv = createMockKv();
    const store = createKvSessionStore({}, kv);
    expect(store).toBeInstanceOf(KvSessionStore);
  });
});
