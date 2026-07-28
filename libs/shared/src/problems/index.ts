import type { Difficulty, Problem } from '../schema/problem';
import { attachBilingualCopy } from '../i18n/localize-problem';
import { PROBLEM_COPY_EN } from './copy-en';
import { EASY_PROBLEMS } from './easy';
import { HARD_PROBLEMS } from './hard';
import { MEDIUM_PROBLEMS } from './medium';
import { URL_SHORTENER as URL_SHORTENER_DEF } from './url-shortener';

export type ProblemFilter = {
  difficulty?: Difficulty | 'all';
  tag?: string;
};

function withCopy(definition: (typeof URL_SHORTENER_DEF)): Problem {
  const en = PROBLEM_COPY_EN[definition.id];
  if (!en) {
    throw new Error(`Missing English problem copy for id: ${definition.id}`);
  }
  return attachBilingualCopy(definition, en);
}

export const URL_SHORTENER: Problem = withCopy(URL_SHORTENER_DEF);

const ALL_PROBLEMS: readonly Problem[] = [
  URL_SHORTENER,
  ...EASY_PROBLEMS.map(withCopy),
  ...MEDIUM_PROBLEMS.map(withCopy),
  ...HARD_PROBLEMS.map(withCopy),
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

export { URL_SHORTENER_ID } from './url-shortener';
