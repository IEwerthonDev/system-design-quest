import { beforeEach, describe, expect, it } from 'vitest';
import { createLeaderboardService, resetLeaderboardEntryCounterForTests } from './service';
import { InMemoryLeaderboardStore } from './store';

describe('createLeaderboardService', () => {
  beforeEach(() => {
    resetLeaderboardEntryCounterForTests();
  });

  it('persists qualifying PASS submissions', async () => {
    const store = new InMemoryLeaderboardStore();
    const service = createLeaderboardService(store);

    const result = await service.submit(
      {
        problemId: 'url-shortener',
        playerNickname: 'speed_runner',
        elapsedMs: 120000,
        score: 85,
        verdict: 'PASS',
      },
      () => '2026-07-27T12:00:00.000Z',
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.entry.playerNickname).toBe('speed_runner');
      expect(result.entry.elapsedMs).toBe(120000);
    }
    expect(await service.list('url-shortener')).toHaveLength(1);
  });

  it('rejects FAIL submissions', async () => {
    const store = new InMemoryLeaderboardStore();
    const service = createLeaderboardService(store);

    const result = await service.submit({
      problemId: 'url-shortener',
      playerNickname: 'player',
      elapsedMs: 1000,
      score: 50,
      verdict: 'FAIL',
    });

    expect(result).toEqual({
      ok: false,
      code: 'NOT_QUALIFYING',
      message: 'Only PASS or PARTIAL with score >= 70 qualify for the leaderboard',
    });
  });

  it('rejects invalid nicknames', async () => {
    const store = new InMemoryLeaderboardStore();
    const service = createLeaderboardService(store);

    const result = await service.submit({
      problemId: 'url-shortener',
      playerNickname: 'ab',
      elapsedMs: 1000,
      score: 80,
      verdict: 'PASS',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('INVALID_NICKNAME');
    }
  });
});
