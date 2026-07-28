import { describe, expect, it, beforeEach } from 'vitest';
import type { Difficulty } from '@sdq/shared';
import { listProblemsByDifficulty } from '@sdq/shared';
import {
  completionPercentByDifficulty,
  countCompletedByDifficulty,
  isProblemCompleted,
  isQualifyingCompletion,
  loadProgress,
  PROGRESS_STORAGE_KEY,
  recordCompletion,
  resetProgress,
} from './progress';

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe('progress storage', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    resetProgress(storage);
  });

  it('isQualifyingCompletion accepts PARTIAL with score >= 70', () => {
    expect(isQualifyingCompletion('PARTIAL', 70)).toBe(true);
    expect(isQualifyingCompletion('PARTIAL', 69)).toBe(false);
    expect(isQualifyingCompletion('FAIL', 80)).toBe(false);
  });

  it('recordCompletion persists PARTIAL+ completions', () => {
    recordCompletion('url-shortener', 'PARTIAL', 75, storage, () => '2026-07-27T00:00:00.000Z');

    expect(isProblemCompleted('url-shortener', storage)).toBe(true);
    expect(loadProgress(storage).completions['url-shortener']).toEqual({
      problemId: 'url-shortener',
      verdict: 'PARTIAL',
      score: 75,
      completedAt: '2026-07-27T00:00:00.000Z',
    });
  });

  it('recordCompletion ignores FAIL results', () => {
    const result = recordCompletion('rate-limiter', 'FAIL', 40, storage);
    expect(result).toBeNull();
    expect(isProblemCompleted('rate-limiter', storage)).toBe(false);
  });

  it('recordCompletion keeps higher score when re-submitting lower', () => {
    recordCompletion('pastebin', 'PARTIAL', 80, storage);
    recordCompletion('pastebin', 'PARTIAL', 72, storage);

    expect(loadProgress(storage).completions['pastebin']?.score).toBe(80);
  });

  it('countCompletedByDifficulty counts per tier', () => {
    recordCompletion('url-shortener', 'PASS', 85, storage);
    recordCompletion('rate-limiter', 'PARTIAL', 70, storage);

    const idsForDifficulty = (difficulty: Difficulty) =>
      listProblemsByDifficulty(difficulty).map((problem) => problem.id);

    const easy = countCompletedByDifficulty('easy', idsForDifficulty, storage);
    expect(easy.completed).toBe(2);
    expect(easy.total).toBe(7);
  });

  it('completionPercentByDifficulty returns approved/total percent and persists across reload', () => {
    const idsForDifficulty = (difficulty: Difficulty) =>
      listProblemsByDifficulty(difficulty).map((problem) => problem.id);

    expect(completionPercentByDifficulty('easy', idsForDifficulty, storage)).toBe(0);

    recordCompletion('url-shortener', 'PASS', 85, storage);
    const percent = completionPercentByDifficulty('easy', idsForDifficulty, storage);
    expect(percent).toBe(Math.round((1 / 7) * 100));

    const reloaded = new MemoryStorage();
    const raw = storage.getItem(PROGRESS_STORAGE_KEY);
    if (raw) {
      reloaded.setItem(PROGRESS_STORAGE_KEY, raw);
    }
    expect(completionPercentByDifficulty('easy', idsForDifficulty, reloaded)).toBe(percent);
  });

  it('persists to storage key sdq-progress', () => {
    recordCompletion('chat-system', 'PASS', 90, storage);
    expect(storage.getItem(PROGRESS_STORAGE_KEY)).toContain('chat-system');
  });
});
