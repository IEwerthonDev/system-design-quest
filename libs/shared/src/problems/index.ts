import type { Difficulty, Problem } from '../schema/problem';
import { EASY_PROBLEMS } from './easy';
import { HARD_PROBLEMS } from './hard';
import { MEDIUM_PROBLEMS } from './medium';
import { URL_SHORTENER } from './url-shortener';

export type ProblemFilter = {
  difficulty?: Difficulty | 'all';
  tag?: string;
};

const ALL_PROBLEMS: readonly Problem[] = [
  URL_SHORTENER,
  ...EASY_PROBLEMS,
  ...MEDIUM_PROBLEMS,
  ...HARD_PROBLEMS,
];

const PROBLEMS_BY_ID: Record<string, Problem> = Object.fromEntries(
  ALL_PROBLEMS.map((problem) => [problem.id, problem]),
);

export function getProblem(id: string): Problem | undefined {
  return PROBLEMS_BY_ID[id];
}

export function listProblems(): Problem[] {
  return [...ALL_PROBLEMS].sort((a, b) => (a.orderInTrack ?? 0) - (b.orderInTrack ?? 0));
}

export function listProblemsByDifficulty(difficulty: Difficulty): Problem[] {
  return listProblems().filter((problem) => problem.difficulty === difficulty);
}

export function filterProblems(filter: ProblemFilter = {}): Problem[] {
  let results = listProblems();

  if (filter.difficulty && filter.difficulty !== 'all') {
    results = results.filter((problem) => problem.difficulty === filter.difficulty);
  }

  if (filter.tag) {
    const tag = filter.tag.toLowerCase();
    results = results.filter((problem) =>
      problem.tags.some((entry) => entry.toLowerCase() === tag),
    );
  }

  return results;
}

export function getRecommendedProblems(): Problem[] {
  return listProblems().filter((problem) => problem.isRecommended);
}

export function countByDifficulty(): Record<Difficulty, number> {
  const counts: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
  for (const problem of ALL_PROBLEMS) {
    counts[problem.difficulty] += 1;
  }
  return counts;
}

export { URL_SHORTENER, URL_SHORTENER_ID } from './url-shortener';
