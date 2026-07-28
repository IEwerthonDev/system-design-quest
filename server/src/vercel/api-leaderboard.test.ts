import { beforeEach, describe, expect, it } from 'vitest';
import { URL_SHORTENER_ID } from '@sdq/shared';
import { InMemoryLeaderboardStore } from '../leaderboard/store';
import {
  createLeaderboardService,
  resetLeaderboardEntryCounterForTests,
} from '../leaderboard/service';
import { handleLeaderboardRequest } from './api-leaderboard';
import { createAuthService } from '../auth/service';
import { KvUserStore, type AuthKvClient } from '../auth/kv-user-store';
import {
  buildSessionCookieHeader,
  signSessionToken,
} from '../auth/session-cookie';

const AUTH_SECRET = 'test-auth-secret-at-least-32-chars!!';

function memoryKv(): AuthKvClient {
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

async function authedAs(nick: string, userId: string) {
  const users = new KvUserStore(memoryKv());
  await users.upsertUser({
    userId,
    publicNickname: nick,
    createdAt: 't',
    updatedAt: 't',
  });
  await users.claimNickname(userId, nick);
  const authService = createAuthService({
    users,
    env: {
      AUTH_SECRET,
      AUTH_BASE_URL: 'http://localhost:4200',
      GOOGLE_CLIENT_ID: 'x',
      GOOGLE_CLIENT_SECRET: 'y',
    },
  });
  const cookie = buildSessionCookieHeader(
    await signSessionToken(userId, AUTH_SECRET),
    { secure: false },
  ).split(';')[0]!;
  return { authService, cookie };
}

describe('handleLeaderboardRequest', () => {
  let service: ReturnType<typeof createLeaderboardService>;

  beforeEach(() => {
    resetLeaderboardEntryCounterForTests();
    service = createLeaderboardService(new InMemoryLeaderboardStore());
  });

  it('rejects unsupported methods with 405', async () => {
    const result = await handleLeaderboardRequest({
      method: 'PUT',
      url: '/api/leaderboard',
      query: {},
      body: null,
      service,
    });
    expect(result.status).toBe(405);
  });

  it('POST qualifying PASS persists under account nick; GET is public', async () => {
    const a = await authedAs('fast_dev', 'u1');
    const post = await handleLeaderboardRequest({
      method: 'POST',
      url: '/api/leaderboard',
      query: {},
      headers: { cookie: a.cookie },
      body: {
        problemId: URL_SHORTENER_ID,
        playerNickname: 'spoofed',
        elapsedMs: 60000,
        score: 85,
        verdict: 'PASS',
      },
      service,
      authService: a.authService,
    });
    expect(post.status).toBe(201);
    expect(post.body).toMatchObject({
      playerNickname: 'fast_dev',
      elapsedMs: 60000,
      score: 85,
    });

    const b = await authedAs('slow_dev', 'u2');
    await handleLeaderboardRequest({
      method: 'POST',
      url: '/api/leaderboard',
      query: {},
      headers: { cookie: b.cookie },
      body: {
        problemId: URL_SHORTENER_ID,
        playerNickname: 'slow_dev',
        elapsedMs: 90000,
        score: 90,
        verdict: 'PASS',
      },
      service,
      authService: b.authService,
    });

    const listed = await handleLeaderboardRequest({
      method: 'GET',
      url: `/api/leaderboard/${URL_SHORTENER_ID}`,
      query: { problemId: URL_SHORTENER_ID },
      body: null,
      service,
    });
    expect(listed.status).toBe(200);
    const body = listed.body as { problemId: string; entries: Array<{ playerNickname: string }> };
    expect(body.problemId).toBe(URL_SHORTENER_ID);
    expect(body.entries.map((e) => e.playerNickname)).toEqual(['fast_dev', 'slow_dev']);
  });

  it('rejects unauthenticated POST with 401', async () => {
    const result = await handleLeaderboardRequest({
      method: 'POST',
      url: '/api/leaderboard',
      query: {},
      body: {
        problemId: URL_SHORTENER_ID,
        playerNickname: 'player',
        elapsedMs: 1000,
        score: 85,
        verdict: 'PASS',
      },
      service,
    });
    expect(result.status).toBe(401);
  });

  it('rejects non-qualifying submit per AD-016 with 422', async () => {
    const a = await authedAs('player', 'u3');
    const result = await handleLeaderboardRequest({
      method: 'POST',
      url: '/api/leaderboard',
      query: {},
      headers: { cookie: a.cookie },
      body: {
        problemId: URL_SHORTENER_ID,
        playerNickname: 'player',
        elapsedMs: 1000,
        score: 50,
        verdict: 'FAIL',
      },
      service,
      authService: a.authService,
    });
    expect(result.status).toBe(422);
    expect(result.body).toMatchObject({ error: 'Not qualifying' });
  });

  it('returns 503 when KV store cannot be created and no service injected', async () => {
    const result = await handleLeaderboardRequest({
      method: 'GET',
      url: `/api/leaderboard/${URL_SHORTENER_ID}`,
      query: { problemId: URL_SHORTENER_ID },
      body: null,
      env: {},
    });
    expect(result.status).toBe(503);
  });
});
