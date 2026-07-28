import { beforeEach, describe, expect, it } from 'vitest';
import { InMemorySessionStore } from '../sessions/store';
import { createSessionService } from '../sessions/service';
import { handleSessionsRequest } from './api-sessions';
import { createAuthService } from '../auth/service';
import { KvUserStore, type AuthKvClient } from '../auth/kv-user-store';
import {
  buildSessionCookieHeader,
  signSessionToken,
} from '../auth/session-cookie';

const emptyGraph = { nodes: [], edges: [] };
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

describe('handleSessionsRequest', () => {
  let service: ReturnType<typeof createSessionService>;
  let authService: ReturnType<typeof createAuthService>;
  let cookieHeader: string;

  beforeEach(async () => {
    service = createSessionService(new InMemorySessionStore());
    const users = new KvUserStore(memoryKv());
    await users.upsertUser({
      userId: 'u-alice',
      publicNickname: 'alice',
      createdAt: 't',
      updatedAt: 't',
    });
    await users.claimNickname('u-alice', 'alice');
    authService = createAuthService({
      users,
      env: {
        AUTH_SECRET,
        AUTH_BASE_URL: 'http://localhost:4200',
        GOOGLE_CLIENT_ID: 'x',
        GOOGLE_CLIENT_SECRET: 'y',
      },
    });
    cookieHeader = buildSessionCookieHeader(
      await signSessionToken('u-alice', AUTH_SECRET),
      { secure: false },
    );
  });

  it('rejects unauthenticated requests with 401', async () => {
    const result = await handleSessionsRequest({
      method: 'POST',
      url: '/api/sessions',
      query: {},
      body: null,
      service,
      authService,
    });
    expect(result.status).toBe(401);
  });

  it('PUT upserts and returns the record owned by auth nick', async () => {
    const result = await handleSessionsRequest({
      method: 'PUT',
      url: '/api/sessions/sess-1',
      query: {},
      headers: { cookie: cookieHeader.split(';')[0]! },
      body: {
        id: 'sess-1',
        problemId: 'url-shortener',
        playerNickname: 'spoofed',
        status: 'in_progress',
        graph: emptyGraph,
      },
      service,
      authService,
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      id: 'sess-1',
      playerNickname: 'alice',
      userId: 'u-alice',
      status: 'in_progress',
    });
  });

  it('GET list returns sessions for auth nick without query nickname', async () => {
    await handleSessionsRequest({
      method: 'PUT',
      url: '/api/sessions/sess-1',
      query: {},
      headers: { cookie: cookieHeader.split(';')[0]! },
      body: {
        id: 'sess-1',
        problemId: 'url-shortener',
        playerNickname: 'alice',
        status: 'approved',
        graph: emptyGraph,
      },
      service,
      authService,
    });

    const listed = await handleSessionsRequest({
      method: 'GET',
      url: '/api/sessions',
      query: {},
      headers: { cookie: cookieHeader.split(';')[0]! },
      body: null,
      service,
      authService,
    });
    expect(listed.status).toBe(200);
    expect(listed.body).toMatchObject({
      nickname: 'alice',
      sessions: [{ id: 'sess-1' }],
    });
  });

  it('GET by id returns 404 when missing', async () => {
    const result = await handleSessionsRequest({
      method: 'GET',
      url: '/api/sessions/does-not-exist',
      query: {},
      headers: { cookie: cookieHeader.split(';')[0]! },
      body: null,
      service,
      authService,
    });
    expect(result.status).toBe(404);
  });

  it('returns 503 when auth store cannot be created', async () => {
    const result = await handleSessionsRequest({
      method: 'GET',
      url: '/api/sessions',
      query: { nickname: 'alice' },
      body: null,
      env: {},
    });
    expect(result.status).toBe(503);
  });
});
