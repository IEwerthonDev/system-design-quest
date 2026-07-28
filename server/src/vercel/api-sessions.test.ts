import { beforeEach, describe, expect, it } from 'vitest';
import { InMemorySessionStore } from '../sessions/store';
import { createSessionService } from '../sessions/service';
import { handleSessionsRequest } from './api-sessions';

const emptyGraph = { nodes: [], edges: [] };

describe('handleSessionsRequest', () => {
  let service: ReturnType<typeof createSessionService>;

  beforeEach(() => {
    service = createSessionService(new InMemorySessionStore());
  });

  it('rejects unsupported methods with 405', async () => {
    const result = await handleSessionsRequest({
      method: 'POST',
      url: '/api/sessions',
      query: {},
      body: null,
      service,
    });
    expect(result.status).toBe(405);
    expect(result.body).toMatchObject({ error: 'Method not allowed' });
  });

  it('PUT upserts and returns the record (same shape as Fastify)', async () => {
    const result = await handleSessionsRequest({
      method: 'PUT',
      url: '/api/sessions/sess-1',
      query: {},
      body: {
        id: 'sess-1',
        problemId: 'url-shortener',
        playerNickname: 'alice',
        status: 'in_progress',
        graph: emptyGraph,
      },
      service,
    });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      id: 'sess-1',
      playerNickname: 'alice',
      status: 'in_progress',
    });
  });

  it('GET list requires nickname and returns { nickname, sessions }', async () => {
    await handleSessionsRequest({
      method: 'PUT',
      url: '/api/sessions/sess-1',
      query: {},
      body: {
        id: 'sess-1',
        problemId: 'url-shortener',
        playerNickname: 'alice',
        status: 'approved',
        graph: emptyGraph,
      },
      service,
    });

    const missing = await handleSessionsRequest({
      method: 'GET',
      url: '/api/sessions',
      query: {},
      body: null,
      service,
    });
    expect(missing.status).toBe(400);

    const listed = await handleSessionsRequest({
      method: 'GET',
      url: '/api/sessions',
      query: { nickname: 'alice' },
      body: null,
      service,
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
      body: null,
      service,
    });
    expect(result.status).toBe(404);
  });

  it('returns 503 when KV store cannot be created and no service injected', async () => {
    const result = await handleSessionsRequest({
      method: 'GET',
      url: '/api/sessions',
      query: { nickname: 'alice' },
      body: null,
      env: {},
    });
    expect(result.status).toBe(503);
    expect(result.body).toMatchObject({ error: 'Service unavailable' });
  });
});
