import { describe, expect, it, beforeEach } from 'vitest';
import { InMemoryLeaderboardStore } from './store';
import type { LeaderboardEntry } from '@sdq/shared';

function entry(overrides: Partial<LeaderboardEntry>): LeaderboardEntry {
  return {
    id: 'entry-1',
    problemId: 'url-shortener',
    playerNickname: 'player',
    elapsedMs: 1000,
    score: 80,
    verdict: 'PASS',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('InMemoryLeaderboardStore', () => {
  let store: InMemoryLeaderboardStore;

  beforeEach(() => {
    store = new InMemoryLeaderboardStore();
  });

  it('sorts by elapsedMs ascending', () => {
    store.add(entry({ id: 'slow', elapsedMs: 5000 }));
    store.add(entry({ id: 'fast', elapsedMs: 1000 }));

    const list = store.listByProblem('url-shortener', 50);
    expect(list.map((item) => item.id)).toEqual(['fast', 'slow']);
  });

  it('breaks ties by score descending', () => {
    store.add(entry({ id: 'lower-score', elapsedMs: 2000, score: 75 }));
    store.add(entry({ id: 'higher-score', elapsedMs: 2000, score: 90 }));

    const list = store.listByProblem('url-shortener', 50);
    expect(list.map((item) => item.id)).toEqual(['higher-score', 'lower-score']);
  });

  it('caps results at limit', () => {
    for (let i = 0; i < 60; i += 1) {
      store.add(entry({ id: `entry-${i}`, elapsedMs: i * 100 }));
    }

    expect(store.listByProblem('url-shortener', 50)).toHaveLength(50);
  });

  it('filters by problemId', () => {
    store.add(entry({ problemId: 'url-shortener' }));
    store.add(entry({ id: 'other', problemId: 'youtube' }));

    expect(store.listByProblem('url-shortener', 50)).toHaveLength(1);
  });
});
