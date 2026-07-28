import { beforeEach, describe, expect, it } from 'vitest';
import type { LeaderboardEntry } from '@sdq/shared';
import {
  createKvLeaderboardStore,
  isBetterLeaderboardEntry,
  KvLeaderboardStore,
  type KvLeaderboardClient,
} from './kv-store';

function entry(overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  return {
    id: 'entry-1',
    problemId: 'url-shortener',
    playerNickname: 'alice',
    elapsedMs: 2000,
    score: 80,
    verdict: 'PASS',
    createdAt: '2026-07-27T10:00:00.000Z',
    ...overrides,
  };
}

function createMockKv(): KvLeaderboardClient & { store: Map<string, unknown> } {
  const store = new Map<string, unknown>();
  return {
    store,
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
      }
      return n;
    },
  };
}

describe('isBetterLeaderboardEntry', () => {
  it('prefers lower elapsedMs; ties use higher score', () => {
    expect(
      isBetterLeaderboardEntry(
        entry({ elapsedMs: 1000, score: 70 }),
        entry({ elapsedMs: 2000, score: 99 }),
      ),
    ).toBe(true);
    expect(
      isBetterLeaderboardEntry(
        entry({ elapsedMs: 2000, score: 90 }),
        entry({ elapsedMs: 2000, score: 80 }),
      ),
    ).toBe(true);
    expect(
      isBetterLeaderboardEntry(
        entry({ elapsedMs: 2000, score: 70 }),
        entry({ elapsedMs: 2000, score: 80 }),
      ),
    ).toBe(false);
  });
});

describe('KvLeaderboardStore', () => {
  let kv: ReturnType<typeof createMockKv>;
  let store: KvLeaderboardStore;

  beforeEach(() => {
    kv = createMockKv();
    store = new KvLeaderboardStore(kv);
  });

  it('keeps best entry per nickname (worse elapsedMs does not replace)', async () => {
    await store.add(entry({ id: 'fast', elapsedMs: 1000, score: 80 }));
    await store.add(entry({ id: 'slow', elapsedMs: 5000, score: 95 }));

    const list = await store.listByProblem('url-shortener', 50);
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe('fast');
  });

  it('on equal elapsedMs keeps the higher score', async () => {
    await store.add(entry({ id: 'low', elapsedMs: 2000, score: 75 }));
    await store.add(entry({ id: 'high', elapsedMs: 2000, score: 90 }));

    const list = await store.listByProblem('url-shortener', 50);
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe('high');
  });

  it('orders by elapsedMs asc then score desc', async () => {
    await store.add(entry({ id: 'a', playerNickname: 'a', elapsedMs: 3000, score: 90 }));
    await store.add(entry({ id: 'b', playerNickname: 'b', elapsedMs: 1000, score: 70 }));
    await store.add(entry({ id: 'c', playerNickname: 'c', elapsedMs: 3000, score: 95 }));

    const list = await store.listByProblem('url-shortener', 50);
    expect(list.map((item) => item.id)).toEqual(['b', 'c', 'a']);
  });

  it('caps results at limit', async () => {
    for (let i = 0; i < 60; i += 1) {
      await store.add(
        entry({
          id: `entry-${i}`,
          playerNickname: `player${i}`,
          elapsedMs: i * 100,
        }),
      );
    }
    expect(await store.listByProblem('url-shortener', 50)).toHaveLength(50);
  });
});

describe('createKvLeaderboardStore', () => {
  it('throws a clear error when KV env is missing', () => {
    expect(() => createKvLeaderboardStore({})).toThrow(
      /KV_REST_API_URL|KV_REST_API_TOKEN|Vercel KV/i,
    );
  });

  it('accepts an injected Kv client without requiring env', () => {
    const store = createKvLeaderboardStore({}, createMockKv());
    expect(store).toBeInstanceOf(KvLeaderboardStore);
  });
});
