import { describe, expect, it } from 'vitest';
import type { AuthUser } from '@sdq/shared';
import { KvUserStore, type AuthKvClient } from './kv-user-store';

function createMemoryKv(): AuthKvClient {
  const map = new Map<string, unknown>();
  return {
    async get<T>(key: string) {
      return (map.has(key) ? (map.get(key) as T) : null) ?? null;
    },
    async set(key: string, value: unknown, opts?: { nx?: boolean; ex?: number }) {
      if (opts?.nx && map.has(key)) {
        return null;
      }
      map.set(key, value);
      return 'OK';
    },
    async del(...keys: string[]) {
      let n = 0;
      for (const k of keys) {
        if (map.delete(k)) n += 1;
      }
      return n;
    },
    async sadd() {
      return 0;
    },
    async smembers() {
      return [];
    },
    async srem() {
      return 0;
    },
  };
}

function baseUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    userId: 'sub-1',
    email: 'a@example.com',
    displayName: 'A',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('KvUserStore', () => {
  it('upserts and loads users', async () => {
    const store = new KvUserStore(createMemoryKv());
    await store.upsertUser(baseUser());
    expect(await store.getUser('sub-1')).toMatchObject({ email: 'a@example.com' });
  });

  it('claims unique nicknames with NX semantics', async () => {
    const store = new KvUserStore(createMemoryKv());
    await store.upsertUser(baseUser({ userId: 'u1' }));
    await store.upsertUser(baseUser({ userId: 'u2', email: 'b@example.com' }));
    expect(await store.claimNickname('u1', 'Alice')).toBe(true);
    expect(await store.claimNickname('u2', 'alice')).toBe(false);
    expect(await store.getUserIdByNickname('Alice')).toBe('u1');
    expect((await store.getUser('u1'))?.publicNickname).toBe('Alice');
  });

  it('stores and consumes oauth pending state once', async () => {
    const store = new KvUserStore(createMemoryKv());
    await store.saveOAuthPending('st', { codeVerifier: 'v', createdAt: 't' });
    expect(await store.takeOAuthPending('st')).toEqual({
      codeVerifier: 'v',
      createdAt: 't',
    });
    expect(await store.takeOAuthPending('st')).toBeNull();
  });
});
