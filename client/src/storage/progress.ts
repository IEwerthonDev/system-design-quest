import type { Difficulty, Verdict } from '@sdq/shared';

export const PROGRESS_STORAGE_KEY = 'sdq-progress';

export interface ProblemCompletion {
  problemId: string;
  verdict: Verdict;
  score: number;
  completedAt: string;
}

export interface ProgressStore {
  completions: Record<string, ProblemCompletion>;
}

export const EMPTY_PROGRESS: ProgressStore = {
  completions: {},
};

function resolveStorage(storage?: Storage): Storage {
  if (storage) {
    return storage;
  }
  if (typeof localStorage === 'undefined') {
    throw new Error('localStorage is not available');
  }
  return localStorage;
}

export function loadProgress(storage?: Storage): ProgressStore {
  const target = resolveStorage(storage);
  const raw = target.getItem(PROGRESS_STORAGE_KEY);
  if (!raw) {
    return { completions: {} };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ProgressStore>;
    return {
      completions: parsed.completions ?? {},
    };
  } catch {
    return { completions: {} };
  }
}

export function saveProgress(store: ProgressStore, storage?: Storage): ProgressStore {
  const target = resolveStorage(storage);
  target.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(store));
  return store;
}

export function isQualifyingCompletion(verdict: Verdict, score: number): boolean {
  return (verdict === 'PASS' || verdict === 'PARTIAL') && score >= 70;
}

export function recordCompletion(
  problemId: string,
  verdict: Verdict,
  score: number,
  storage?: Storage,
  now: () => string = () => new Date().toISOString(),
): ProgressStore | null {
  if (!isQualifyingCompletion(verdict, score)) {
    return null;
  }

  const current = loadProgress(storage);
  const existing = current.completions[problemId];
  const nextCompletion: ProblemCompletion = {
    problemId,
    verdict,
    score,
    completedAt: now(),
  };

  if (existing && existing.score >= score) {
    return current;
  }

  const next: ProgressStore = {
    completions: {
      ...current.completions,
      [problemId]: nextCompletion,
    },
  };

  return saveProgress(next, storage);
}

export function isProblemCompleted(
  problemId: string,
  storage?: Storage,
  progress?: ProgressStore,
): boolean {
  const store = progress ?? loadProgress(storage);
  return problemId in store.completions;
}

export function getCompletion(
  problemId: string,
  storage?: Storage,
): ProblemCompletion | undefined {
  return loadProgress(storage).completions[problemId];
}

export function countCompletedByDifficulty(
  difficulty: Difficulty,
  problemIdsByDifficulty: (difficulty: Difficulty) => string[],
  storage?: Storage,
): { completed: number; total: number } {
  const store = loadProgress(storage);
  const ids = problemIdsByDifficulty(difficulty);
  const completed = ids.filter((id) => id in store.completions).length;
  return { completed, total: ids.length };
}

export function resetProgress(storage?: Storage): void {
  resolveStorage(storage).removeItem(PROGRESS_STORAGE_KEY);
}
