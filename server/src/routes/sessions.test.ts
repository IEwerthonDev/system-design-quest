import { beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../main';
import { InMemorySessionStore } from '../sessions/store';

const emptyGraph = { nodes: [], edges: [] };

describe('session routes', () => {
  let store: InMemorySessionStore;

  beforeEach(() => {
    store = new InMemorySessionStore();
  });

  it('PUT upserts and returns the record', async () => {
    const app = await buildApp({ sessionStore: store });

    const put = await app.inject({
      method: 'PUT',
      url: '/api/sessions/sess-1',
      payload: {
        id: 'sess-1',
        problemId: 'url-shortener',
        playerNickname: 'alice',
        status: 'in_progress',
        graph: emptyGraph,
      },
    });

    expect(put.statusCode).toBe(200);
    const body = put.json() as { id: string; playerNickname: string; status: string };
    expect(body.id).toBe('sess-1');
    expect(body.playerNickname).toBe('alice');
    expect(body.status).toBe('in_progress');
  });

  it('GET list requires nickname and returns 400 when missing', async () => {
    const app = await buildApp({ sessionStore: store });

    const missing = await app.inject({
      method: 'GET',
      url: '/api/sessions',
    });
    expect(missing.statusCode).toBe(400);

    await app.inject({
      method: 'PUT',
      url: '/api/sessions/sess-1',
      payload: {
        id: 'sess-1',
        problemId: 'url-shortener',
        playerNickname: 'alice',
        status: 'approved',
        graph: emptyGraph,
      },
    });

    const listed = await app.inject({
      method: 'GET',
      url: '/api/sessions?nickname=alice',
    });
    expect(listed.statusCode).toBe(200);
    const body = listed.json() as { sessions: Array<{ id: string }> };
    expect(body.sessions).toHaveLength(1);
    expect(body.sessions[0]?.id).toBe('sess-1');
  });

  it('GET by id returns 404 when missing', async () => {
    const app = await buildApp({ sessionStore: store });

    const res = await app.inject({
      method: 'GET',
      url: '/api/sessions/does-not-exist',
    });
    expect(res.statusCode).toBe(404);
  });
});
