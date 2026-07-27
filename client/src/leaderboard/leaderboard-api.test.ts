import { describe, expect, it } from 'vitest';
import { URL_SHORTENER_ID } from '@sdq/shared';
import {
  fetchLeaderboard,
  LeaderboardApiError,
  submitLeaderboardScore,
} from './leaderboard-api';

describe('leaderboard-api', () => {
  it('submitLeaderboardScore returns null for FAIL without calling API', async () => {
    const fetchFn = vi.fn();
    const result = await submitLeaderboardScore(
      {
        problemId: URL_SHORTENER_ID,
        playerNickname: 'player',
        elapsedMs: 1000,
        score: 50,
        verdict: 'FAIL',
      },
      { fetchFn },
    );
    expect(result).toBeNull();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('submitLeaderboardScore POSTs qualifying entries', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'lb-1',
        problemId: URL_SHORTENER_ID,
        playerNickname: 'player',
        elapsedMs: 60000,
        score: 85,
        verdict: 'PASS',
        createdAt: '2026-07-27T12:00:00.000Z',
      }),
    });

    const entry = await submitLeaderboardScore(
      {
        problemId: URL_SHORTENER_ID,
        playerNickname: 'player',
        elapsedMs: 60000,
        score: 85,
        verdict: 'PASS',
      },
      { fetchFn, baseUrl: 'http://localhost:3000' },
    );

    expect(entry?.playerNickname).toBe('player');
    expect(fetchFn).toHaveBeenCalledWith(
      'http://localhost:3000/api/leaderboard',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('fetchLeaderboard GETs entries', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        problemId: URL_SHORTENER_ID,
        entries: [],
      }),
    });

    const list = await fetchLeaderboard(URL_SHORTENER_ID, {
      fetchFn,
      baseUrl: 'http://localhost:3000',
    });

    expect(list.entries).toEqual([]);
    expect(fetchFn).toHaveBeenCalledWith(
      `http://localhost:3000/api/leaderboard/${URL_SHORTENER_ID}`,
    );
  });

  it('throws LeaderboardApiError on failed POST', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ message: 'Not qualifying' }),
    });

    await expect(
      submitLeaderboardScore(
        {
          problemId: URL_SHORTENER_ID,
          playerNickname: 'player',
          elapsedMs: 60000,
          score: 85,
          verdict: 'PASS',
        },
        { fetchFn, baseUrl: '' },
      ),
    ).rejects.toBeInstanceOf(LeaderboardApiError);
  });
});
