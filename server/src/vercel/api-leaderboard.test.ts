import { beforeEach, describe, expect, it } from 'vitest';
import { URL_SHORTENER_ID } from '@sdq/shared';
import { InMemoryLeaderboardStore } from '../leaderboard/store';
import {
  createLeaderboardService,
  resetLeaderboardEntryCounterForTests,
} from '../leaderboard/service';
import { handleLeaderboardRequest } from './api-leaderboard';

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

  it('POST qualifying PASS persists; GET returns ordered list', async () => {
    const post = await handleLeaderboardRequest({
      method: 'POST',
      url: '/api/leaderboard',
      query: {},
      body: {
        problemId: URL_SHORTENER_ID,
        playerNickname: 'fast_dev',
        elapsedMs: 60000,
        score: 85,
        verdict: 'PASS',
      },
      service,
    });
    expect(post.status).toBe(201);
    expect(post.body).toMatchObject({
      playerNickname: 'fast_dev',
      elapsedMs: 60000,
      score: 85,
    });

    await handleLeaderboardRequest({
      method: 'POST',
      url: '/api/leaderboard',
      query: {},
      body: {
        problemId: URL_SHORTENER_ID,
        playerNickname: 'slow_dev',
        elapsedMs: 90000,
        score: 90,
        verdict: 'PASS',
      },
      service,
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

  it('rejects non-qualifying submit per AD-016 with 422', async () => {
    const result = await handleLeaderboardRequest({
      method: 'POST',
      url: '/api/leaderboard',
      query: {},
      body: {
        problemId: URL_SHORTENER_ID,
        playerNickname: 'player',
        elapsedMs: 1000,
        score: 50,
        verdict: 'FAIL',
      },
      service,
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
