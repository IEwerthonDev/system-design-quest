import type { Difficulty } from '../schema/problem';
import { evaluateStructuralRubric } from '../judge/evaluate-structural-rubric';
import { normalizeGraph } from '../schema/normalize-graph';
import {
  countByDifficulty,
  filterProblems,
  getProblem,
  getRecommendedProblems,
  listProblems,
  listProblemsByDifficulty,
} from './index';

const EXPECTED_EASY_IDS = [
  'url-shortener',
  'rate-limiter',
  'pastebin',
  'unique-id-gen',
  'distributed-cache',
  'notification-system',
  'key-value-store',
] as const;

const EXPECTED_MEDIUM_IDS = [
  'chat-system',
  'news-feed',
  'search-autocomplete',
  'instagram',
  'google-drive',
  'yelp-nearby',
  'hotel-booking',
  'youtube',
  'uber-ride',
  'tiktok-feed',
] as const;

const EXPECTED_HARD_IDS = [
  'netflix-streaming',
  'ticketmaster',
  'google-maps',
  'google-docs',
  'stripe-payments',
  'zoom-conference',
  'doordash-delivery',
  'distributed-kafka',
  's3-storage',
  'distributed-lock',
] as const;

function assertProblemShape(problem: ReturnType<typeof getProblem>): void {
  expect(problem).toBeDefined();
  if (!problem) {
    return;
  }

  expect(problem.company.length).toBeGreaterThan(1);
  expect(problem.title.length).toBeGreaterThan(3);
  expect(problem.description.length).toBeGreaterThan(50);
  expect(problem.constraints.length).toBeGreaterThanOrEqual(3);
  expect(problem.tags.length).toBeGreaterThanOrEqual(2);
  expect(problem.suggestedRequirements.functional.length).toBeGreaterThanOrEqual(3);
  expect(problem.suggestedRequirements.nonFunctional.length).toBeGreaterThanOrEqual(2);
  expect(problem.estimatedMinutes.study).toBeGreaterThan(0);
  expect(problem.estimatedMinutes.speedrun).toBeGreaterThan(0);
  expect(problem.rubric.expectedComponents.length).toBeGreaterThanOrEqual(1);
  expect(problem.rubric.criticalPatterns.length).toBeGreaterThanOrEqual(2);
  expect(problem.rubric.commonMistakes.length).toBeGreaterThanOrEqual(2);
}

describe('Problem catalog', () => {
  it('lists exactly 27 problems', () => {
    expect(listProblems()).toHaveLength(27);
  });

  it('has 7 easy, 10 medium, and 10 hard problems', () => {
    expect(countByDifficulty()).toEqual({ easy: 7, medium: 10, hard: 10 });
  });

  it('includes all launch problem ids from PROBLEM-LIBRARY.md', () => {
    const ids = new Set(listProblems().map((problem) => problem.id));

    for (const id of [...EXPECTED_EASY_IDS, ...EXPECTED_MEDIUM_IDS, ...EXPECTED_HARD_IDS]) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it('returns unique problem ids', () => {
    const ids = listProblems().map((problem) => problem.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('sorts problems by orderInTrack', () => {
    const tracks = listProblems().map((problem) => problem.orderInTrack ?? 0);
    const sorted = [...tracks].sort((a, b) => a - b);
    expect(tracks).toEqual(sorted);
  });

  it('marks only url-shortener as tutorial', () => {
    const tutorials = listProblems().filter((problem) => problem.isTutorial);
    expect(tutorials).toHaveLength(1);
    expect(tutorials[0]?.id).toBe('url-shortener');
  });

  it('every problem has complete briefing, suggestions, and rubric', () => {
    for (const problem of listProblems()) {
      assertProblemShape(problem);
    }
  });

  it('getProblem returns undefined for unknown ids', () => {
    expect(getProblem('does-not-exist')).toBeUndefined();
  });

  it('listProblemsByDifficulty filters correctly', () => {
    expect(listProblemsByDifficulty('easy')).toHaveLength(7);
    expect(listProblemsByDifficulty('medium')).toHaveLength(10);
    expect(listProblemsByDifficulty('hard')).toHaveLength(10);
    expect(listProblemsByDifficulty('hard').some((p) => p.id === 'netflix-streaming')).toBe(true);
  });

  it('filterProblems filters by difficulty', () => {
    const easy = filterProblems({ difficulty: 'easy' });
    expect(easy.every((p) => p.difficulty === 'easy')).toBe(true);
    expect(easy.some((p) => p.id === 'rate-limiter')).toBe(true);
  });

  it('filterProblems filters by tag', () => {
    const cdnProblems = filterProblems({ tag: 'cdn' });
    expect(cdnProblems.length).toBeGreaterThanOrEqual(3);
    expect(cdnProblems.every((p) => p.tags.includes('cdn'))).toBe(true);
  });

  it('getRecommendedProblems returns track starters', () => {
    const recommended = getRecommendedProblems();
    expect(recommended.length).toBeGreaterThanOrEqual(8);
    expect(recommended.some((p) => p.id === 'url-shortener')).toBe(true);
    expect(recommended.some((p) => p.id === 'youtube')).toBe(true);
    expect(recommended.some((p) => p.id === 'netflix-streaming')).toBe(true);
  });

  it('hard tier includes netflix-streaming and ticketmaster', () => {
    const hardIds = listProblemsByDifficulty('hard').map((p) => p.id);
    expect(hardIds).toContain('netflix-streaming');
    expect(hardIds).toContain('ticketmaster');
  });
});

describe('Baseline structural coverage (JR-04 / JR-23)', () => {
  it('all 27 problems produce ≥1 must-have check and ≥1 scale line without throwing', () => {
    const empty = normalizeGraph({ nodes: [], edges: [] });
    const problems = listProblems();
    expect(problems).toHaveLength(27);

    for (const problem of problems) {
      expect(problem.rubric.expectedComponents.length).toBeGreaterThanOrEqual(1);

      const report = evaluateStructuralRubric({
        problem,
        graph: empty,
        locale: 'en',
      });

      expect(report.problemId).toBe(problem.id);
      expect(report.blockers.length + report.strengths.length).toBeGreaterThanOrEqual(1);
      expect(report.scaleChecklistLines.length).toBeGreaterThanOrEqual(1);
      expect(report.scaleChecklistLines.every((line) => line.length > 0)).toBe(true);
    }
  });
});

describe('Difficulty distribution', () => {
  it.each<[Difficulty, number]>([
    ['easy', 7],
    ['medium', 10],
    ['hard', 10],
  ])('%s tier has %i problems', (difficulty, count) => {
    expect(listProblemsByDifficulty(difficulty)).toHaveLength(count);
  });
});
