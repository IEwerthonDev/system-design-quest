import { beforeEach, describe, expect, it } from 'vitest';
import { URL_SHORTENER_ID } from '@sdq/shared';
import { buildApp } from '../main';
import { InMemoryLeaderboardStore } from '../leaderboard/store';
import { resetLeaderboardEntryCounterForTests } from '../leaderboard/service';
import { parseLeaderboardSubmitBody } from './leaderboard';

describe('parseLeaderboardSubmitBody', () => {
  it('accepts valid payload', () => {
    const parsed = parseLeaderboardSubmitBody({
      problemId: URL_SHORTENER_ID,
      playerNickname: 'player_1',
      elapsedMs: 90000,
      score: 82,
      verdict: 'PASS',
    });
    expect(parsed.ok).toBe(true);
  });

  it('rejects unknown problemId', () => {
    const parsed = parseLeaderboardSubmitBody({
      problemId: 'unknown',
      playerNickname: 'player_1',
      elapsedMs: 90000,
      score: 82,
      verdict: 'PASS',
    });
    expect(parsed.ok).toBe(false);
  });
});

describe('leaderboard routes', () => {
  beforeEach(() => {
    resetLeaderboardEntryCounterForTests();
  });

  it('POST qualifying entry then GET lists it', async () => {
    const store = new InMemoryLeaderboardStore();
    const app = await buildApp({ leaderboardStore: store });

    const post = await app.inject({
      method: 'POST',
      url: '/api/leaderboard',
      payload: {
        problemId: URL_SHORTENER_ID,
        playerNickname: 'fast_dev',
        elapsedMs: 60000,
        score: 85,
        verdict: 'PASS',
      },
    });

    expect(post.statusCode).toBe(201);
    const body = post.json() as { playerNickname: string; elapsedMs: number };
    expect(body.playerNickname).toBe('fast_dev');
    expect(body.elapsedMs).toBe(60000);

    const get = await app.inject({
      method: 'GET',
      url: `/api/leaderboard/${URL_SHORTENER_ID}`,
    });

    expect(get.statusCode).toBe(200);
    const list = get.json() as { entries: Array<{ playerNickname: string }> };
    expect(list.entries).toHaveLength(1);
    expect(list.entries[0]?.playerNickname).toBe('fast_dev');
  });

  it('POST FAIL returns 422 and does not persist', async () => {
    const store = new InMemoryLeaderboardStore();
    const app = await buildApp({ leaderboardStore: store });

    const post = await app.inject({
      method: 'POST',
      url: '/api/leaderboard',
      payload: {
        problemId: URL_SHORTENER_ID,
        playerNickname: 'slow_dev',
        elapsedMs: 120000,
        score: 40,
        verdict: 'FAIL',
      },
    });

    expect(post.statusCode).toBe(422);

    const get = await app.inject({
      method: 'GET',
      url: `/api/leaderboard/${URL_SHORTENER_ID}`,
    });
    const list = get.json() as { entries: unknown[] };
    expect(list.entries).toHaveLength(0);
  });

  it('POST invalid nickname returns 400', async () => {
    const app = await buildApp({ leaderboardStore: new InMemoryLeaderboardStore() });

    const post = await app.inject({
      method: 'POST',
      url: '/api/leaderboard',
      payload: {
        problemId: URL_SHORTENER_ID,
        playerNickname: 'ab',
        elapsedMs: 60000,
        score: 85,
        verdict: 'PASS',
      },
    });

    expect(post.statusCode).toBe(400);
  });
});
