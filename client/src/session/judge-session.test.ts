import { beforeEach, describe, expect, it } from 'vitest';
import type { JudgeResult } from '@sdq/shared';
import { setJudgingStep } from '../test-hook';
import {
  clearJudgeResult,
  createSession,
  getJudgeResult,
  resetSessionStore,
  setJudgeResult,
} from './session-store';

const sampleJudgeResult: JudgeResult = {
  verdict: 'PARTIAL',
  score: 75,
  summary: 'Promising design with gaps to close.',
  nextStep: 'Add a Redis cache for redirect lookups.',
  strengths: [
    {
      title: 'Clear client path',
      explanation: 'Traffic flows through an app server before the database.',
      howToImprove: 'Keep documenting read vs write paths.',
      whyItMatters: 'Layering makes scaling easier.',
    },
  ],
  criticalIssues: [],
  improvements: [],
  requirementCoverage: [
    {
      requirement: 'Redirect HTTP 302',
      type: 'functional',
      status: 'partial',
      explanation: 'App tier exists but redirect latency path is not fully detailed.',
    },
  ],
  judgeDebate: {
    rigorous: 'Missing cache for read-heavy workload.',
    pragmatic: 'Acceptable prototype, add cache before peak traffic.',
    consensus: 'Score 75/100 — add cache to reach production readiness.',
  },
};

describe('session judge result state', () => {
  beforeEach(() => {
    resetSessionStore();
    createSession('url-shortener', 'study');
  });

  it('setJudgeResult and getJudgeResult round-trip without mutating stored copy', () => {
    setJudgeResult(sampleJudgeResult);

    const stored = getJudgeResult();
    expect(stored).toEqual(sampleJudgeResult);

    stored!.score = 0;
    expect(getJudgeResult()?.score).toBe(75);
  });

  it('clearJudgeResult removes the stored result', () => {
    setJudgeResult(sampleJudgeResult);
    clearJudgeResult();

    expect(getJudgeResult()).toBeNull();
  });

  it('syncs judgeResult to window.__GAME_STATE__', () => {
    setJudgeResult(sampleJudgeResult);

    expect(window.__GAME_STATE__.judgeResult).toEqual(sampleJudgeResult);
    expect(window.__GAME_STATE__.judgeResult?.verdict).toBe('PARTIAL');
  });

  it('exposes judgingStep on window.__GAME_STATE__ independently of session store', () => {
    setJudgingStep('rigorous');

    expect(window.__GAME_STATE__.judgingStep).toBe('rigorous');
    expect(getJudgeResult()).toBeNull();
  });

  it('preserves judgingStep when session store syncs after setJudgeResult', () => {
    setJudgingStep('consensus');
    setJudgeResult(sampleJudgeResult);

    expect(window.__GAME_STATE__.judgingStep).toBe('consensus');
    expect(window.__GAME_STATE__.judgeResult?.score).toBe(75);
  });
});
