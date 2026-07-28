import { describe, expect, it, vi } from 'vitest';
import type { AuthUser, DesignSessionRecord } from '@sdq/shared';
import { createAuthService, AuthError } from './service';
import { KvUserStore, type AuthKvClient } from './kv-user-store';
import type { SessionStore } from '../sessions/store';

function createMemoryKv(): AuthKvClient {
  const map = new Map<string, unknown>();
  return {
    async get<T>(key: string) {
      return (map.has(key) ? (map.get(key) as T) : null) ?? null;
    },
    async set(key: string, value: unknown, opts?: { nx?: boolean }) {
      if (opts?.nx && map.has(key)) return null;
      map.set(key, value);
      return 'OK';
    },
    async del(...keys: string[]) {
      let n = 0;
      for (const k of keys) if (map.delete(k)) n += 1;
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

const env = {
  GOOGLE_CLIENT_ID: 'cid',
  GOOGLE_CLIENT_SECRET: 'csecret',
  AUTH_SECRET: 'test-auth-secret-at-least-32-chars!!',
  AUTH_BASE_URL: 'http://localhost:4200',
};

describe('createAuthService', () => {
  it('builds Google auth URL and stores oauth state', async () => {
    const users = new KvUserStore(createMemoryKv());
    let n = 0;
    const service = createAuthService({
      users,
      env,
      random: () => {
        n += 1;
        return n === 1 ? 'state-1' : 'verifier-1-padded-to-be-long-enough';
      },
    });
    const { redirectUrl } = await service.startGoogleLogin();
    expect(redirectUrl).toContain('accounts.google.com');
    expect(redirectUrl).toContain('state=state-1');
    expect(redirectUrl).toContain('code_challenge');
  });

  it('rejects invalid oauth state on callback', async () => {
    const service = createAuthService({
      users: new KvUserStore(createMemoryKv()),
      env,
    });
    await expect(service.handleGoogleCallback('code', 'missing')).rejects.toMatchObject({
      code: 'INVALID_STATE',
    });
  });

  it('completes callback, sets cookie, and returns me', async () => {
    const users = new KvUserStore(createMemoryKv());
    const fetchFn = vi.fn(async (url: string) => {
      if (String(url).includes('/token')) {
        return {
          ok: true,
          json: async () => ({ access_token: 'at' }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          sub: 'google-1',
          email: 'p@example.com',
          name: 'Player',
          picture: 'https://img',
        }),
      };
    }) as unknown as typeof fetch;

    const service = createAuthService({
      users,
      env,
      fetchFn,
      random: () => 'fixed-random-value-for-tests-0001',
      now: () => Date.now(),
    });
    await service.startGoogleLogin();
    // pending stored under fixed-random state from first random() call
    const { setCookie, user } = await service.handleGoogleCallback(
      'code',
      'fixed-random-value-for-tests-0001',
    );
    expect(user.userId).toBe('google-1');
    expect(setCookie).toContain('sdq_session=');

    const me = await service.getMe(setCookie.split(';')[0]);
    expect(me).toMatchObject({
      authenticated: true,
      userId: 'google-1',
      email: 'p@example.com',
    });
  });

  it('claims nickname and rejects taken', async () => {
    const users = new KvUserStore(createMemoryKv());
    await users.upsertUser({
      userId: 'u1',
      createdAt: 't',
      updatedAt: 't',
    });
    await users.upsertUser({
      userId: 'u2',
      createdAt: 't',
      updatedAt: 't',
    });
    const service = createAuthService({ users, env });
    const tokenCookie = (
      await import('./session-cookie')
    ).buildSessionCookieHeader(
      await (
        await import('./session-cookie')
      ).signSessionToken('u1', env.AUTH_SECRET),
      { secure: false },
    );
    const claimed = await service.claimNickname(tokenCookie, 'Hero');
    expect(claimed.publicNickname).toBe('Hero');

    const otherCookie = (
      await import('./session-cookie')
    ).buildSessionCookieHeader(
      await (
        await import('./session-cookie')
      ).signSessionToken('u2', env.AUTH_SECRET),
      { secure: false },
    );
    await expect(service.claimNickname(otherCookie, 'hero')).rejects.toBeInstanceOf(
      AuthError,
    );
  });

  it('merges guest sessions with LWW', async () => {
    const users = new KvUserStore(createMemoryKv());
    await users.upsertUser({
      userId: 'u1',
      publicNickname: 'Hero',
      createdAt: 't',
      updatedAt: 't',
    });
    await users.claimNickname('u1', 'Hero');

    const records = new Map<string, DesignSessionRecord>();
    const sessions: SessionStore = {
      upsert: async (r) => {
        records.set(r.id, r);
        return r;
      },
      getById: async (id) => records.get(id) ?? null,
      listByNickname: async () => [...records.values()],
      delete: async (id) => {
        records.delete(id);
      },
      reset: async () => {
        records.clear();
      },
    };

    const service = createAuthService({ users, sessions, env });
    const { signSessionToken, buildSessionCookieHeader } = await import(
      './session-cookie'
    );
    const cookie = buildSessionCookieHeader(
      await signSessionToken('u1', env.AUTH_SECRET),
      { secure: false },
    );

    const guest: DesignSessionRecord = {
      id: 's1',
      problemId: 'url-shortener',
      playerNickname: 'guest',
      status: 'in_progress',
      graph: { nodes: [], edges: [] },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    };
    const result = await service.mergeGuestSessions(cookie, [guest]);
    expect(result.merged).toBe(1);
    expect(records.get('s1')?.userId).toBe('u1');
    expect(records.get('s1')?.playerNickname).toBe('Hero');
  });
});
