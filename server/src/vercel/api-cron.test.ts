import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArchitectureGraph, DesignSessionRecord } from '@sdq/shared';
import {
  isSessionOlderThan,
  KvSessionStore,
  SESSION_MAX_AGE_DAYS,
  type KvClient,
} from '../sessions/kv-store';
import { authorizeCron, dailyStatsKey, handleCronRequest } from './api-cron';

const emptyGraph: ArchitectureGraph = { nodes: [], edges: [] };

function record(overrides: Partial<DesignSessionRecord> = {}): DesignSessionRecord {
  return {
    id: 'sess-1',
    problemId: 'url-shortener',
    playerNickname: 'alice',
    status: 'in_progress',
    graph: emptyGraph,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockKv(): KvClient & {
  store: Map<string, unknown>;
  sets: Map<string, Set<string>>;
  incrCalls: string[];
} {
  const store = new Map<string, unknown>();
  const sets = new Map<string, Set<string>>();
  const counters = new Map<string, number>();
  const incrCalls: string[] = [];

  return {
    store,
    sets,
    incrCalls,
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
    async keys(pattern: string): Promise<string[]> {
      const prefix = pattern.endsWith('*') ? pattern.slice(0, -1) : pattern;
      return [...store.keys()].filter((key) => key.startsWith(prefix));
    },
    async incr(key: string): Promise<number> {
      incrCalls.push(key);
      const next = (counters.get(key) ?? 0) + 1;
      counters.set(key, next);
      return next;
    },
  };
}

describe('isSessionOlderThan (CRON-01 cleanup predicate)', () => {
  const now = Date.parse('2026-07-28T00:00:00.000Z');

  it('marks sessions older than 90 days as stale', () => {
    expect(isSessionOlderThan('2026-04-28T00:00:00.000Z', now, SESSION_MAX_AGE_DAYS)).toBe(true);
    expect(isSessionOlderThan('2026-04-29T00:00:01.000Z', now, SESSION_MAX_AGE_DAYS)).toBe(false);
  });

  it('treats invalid dates as not stale', () => {
    expect(isSessionOlderThan('not-a-date', now)).toBe(false);
  });
});

describe('handleCronRequest', () => {
  let kv: ReturnType<typeof createMockKv>;
  let store: KvSessionStore;
  const secret = 'test-cron-secret';
  const env = { CRON_SECRET: secret };

  beforeEach(() => {
    kv = createMockKv();
    store = new KvSessionStore(kv);
  });

  it('rejects unauthorized requests with 401', async () => {
    const result = await handleCronRequest({
      method: 'GET',
      headers: {},
      env,
      store,
      kv,
      fetchFn: vi.fn(),
    });
    expect(result.status).toBe(401);
  });

  it('rejects wrong bearer token with 401', async () => {
    const result = await handleCronRequest({
      method: 'POST',
      headers: { authorization: 'Bearer wrong' },
      env,
      store,
      kv,
      fetchFn: vi.fn(),
    });
    expect(result.status).toBe(401);
    expect(authorizeCron({ authorization: `Bearer ${secret}` }, env)).toBe(true);
  });

  it('deletes sessions older than 90 days and warms judge once', async () => {
    const nowMs = Date.parse('2026-07-28T12:00:00.000Z');
    await store.upsert(
      record({
        id: 'old',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    );
    await store.upsert(
      record({
        id: 'fresh',
        updatedAt: '2026-07-20T00:00:00.000Z',
      }),
    );

    const fetchFn = vi.fn(async () => ({ ok: true, status: 200 }));

    const result = await handleCronRequest({
      method: 'GET',
      headers: { authorization: `Bearer ${secret}` },
      env,
      store,
      kv,
      now: () => nowMs,
      fetchFn: fetchFn as unknown as typeof fetch,
      warmUpUrl: 'https://example.test/api/judge',
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      ok: true,
      deleted: 1,
      scanned: 2,
      warmUpOk: true,
      statsWritten: true,
      statsKey: dailyStatsKey(nowMs),
    });
    expect(await store.getById('old')).toBeNull();
    expect(await store.getById('fresh')).not.toBeNull();
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith(
      'https://example.test/api/judge',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(kv.incrCalls).toEqual([dailyStatsKey(nowMs)]);
  });

  it('does not fail the job when aggregate incr throws', async () => {
    const boomKv = createMockKv();
    boomKv.incr = async () => {
      throw new Error('quota exceeded');
    };
    const boomStore = new KvSessionStore(boomKv);
    const fetchFn = vi.fn(async () => ({ ok: true, status: 200 }));

    const result = await handleCronRequest({
      method: 'POST',
      headers: { authorization: `Bearer ${secret}` },
      env,
      store: boomStore,
      kv: boomKv,
      fetchFn: fetchFn as unknown as typeof fetch,
      warmUpUrl: 'https://example.test/api/judge',
      now: () => Date.parse('2026-07-28T00:00:00.000Z'),
    });

    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);
    expect(result.body.statsWritten).toBe(false);
    expect(result.body.statsError).toMatch(/quota exceeded/);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
