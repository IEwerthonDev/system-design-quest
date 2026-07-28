import { describe, expect, it } from 'vitest';
import { getGoldenGraph, URL_SHORTENER_ID } from '@sdq/shared';
import type { JudgeInput } from '@sdq/shared';
import type { FeedbackItem, JudgePartialResult } from '@sdq/shared';
import {
  buildRequirementCoverage,
  judgeStructuralOnly,
  judgeSubmission,
  mergeConsensus,
  UnknownProblemError,
} from './dual-judge';
import { createMockLlmClient, mockJudgePartial, type LlmClient } from './mock-llm-client';
import { buildPragmaticPrompt, buildRigorousPrompt } from './prompts';
import { getProblem } from '@sdq/shared';

const PASS_STRENGTH: FeedbackItem = {
  title: 'LLM invented strength',
  explanation: 'Stub says architecture is excellent.',
  howToImprove: 'None',
  whyItMatters: 'Tests narrative preservation',
};

function createPassStubClient(overrides: Partial<JudgePartialResult> = {}): LlmClient {
  const partial: JudgePartialResult = {
    score: 95,
    strengths: [PASS_STRENGTH],
    criticalIssues: [],
    improvements: [],
    requirementCoverage: [],
    rationale: 'Stub LLM would PASS this design.',
    ...overrides,
  };
  return {
    async completeJson<T>(): Promise<T> {
      return partial as T;
    },
  };
}

function makeInput(
  graph: JudgeInput['graph'],
  requirements: JudgeInput['requirements'] = { functional: [], nonFunctional: [] },
): JudgeInput {
  return {
    problemId: URL_SHORTENER_ID,
    requirements,
    graph,
    mode: 'study',
  };
}

describe('buildRigorousPrompt / buildPragmaticPrompt', () => {
  const problem = getProblem(URL_SHORTENER_ID)!;
  const input = makeInput(getGoldenGraph('good'), {
    functional: ['Encurtar URL'],
    nonFunctional: ['Baixa latência'],
  });

  it('includes problem title and declared requirements in rigorous prompt', () => {
    const prompt = buildRigorousPrompt(problem, input);
    expect(prompt).toContain(problem.title);
    expect(prompt).toContain('Encurtar URL');
    expect(prompt).toContain('Baixa latência');
    expect(prompt).toContain('rigorous');
  });

  it('includes pragmatic focus in pragmatic prompt', () => {
    const prompt = buildPragmaticPrompt(problem, input);
    expect(prompt).toContain('pragmatic');
    expect(prompt).toContain('trade-offs');
  });

  it('includes hidden rubric for URL Shortener', () => {
    const prompt = buildRigorousPrompt(problem, input);
    expect(prompt).toContain('Hidden rubric');
    expect(prompt).toContain('cache_redis');
    expect(prompt).toContain('Common mistakes');
  });

  it('includes rate-limiter rubric patterns in prompt', () => {
    const rateLimiter = getProblem('rate-limiter')!;
    const prompt = buildRigorousPrompt(rateLimiter, input);
    expect(prompt).toContain('Token bucket');
    expect(prompt).toContain('api_gateway');
  });
});

describe('buildRequirementCoverage', () => {
  it('populates every declared requirement with coverage status', async () => {
    const graph = getGoldenGraph('medium');
    const rigorous = await mockJudgePartial('rigorous', graph);
    const pragmatic = await mockJudgePartial('pragmatic', graph);
    const input = makeInput(graph, {
      functional: ['Encurtar URL', 'Redirect HTTP 302'],
      nonFunctional: ['100k read RPS'],
    });

    const coverage = buildRequirementCoverage(input, rigorous, pragmatic);

    expect(coverage).toHaveLength(3);
    expect(coverage.map((item) => item.requirement)).toEqual([
      'Encurtar URL',
      'Redirect HTTP 302',
      '100k read RPS',
    ]);
    expect(coverage.every((item) => item.status === 'missing')).toBe(true);
    expect(coverage.every((item) => item.explanation.length > 0)).toBe(true);
  });

  it('merges LLM-provided coverage and does not invent covered from golden tiers', async () => {
    const graph = getGoldenGraph('good');
    const rigorous = await mockJudgePartial('rigorous', graph);
    const pragmatic = await mockJudgePartial('pragmatic', graph);
    const withLlmCoverage: typeof rigorous = {
      ...rigorous,
      requirementCoverage: [
        {
          requirement: 'Encurtar URL',
          type: 'functional',
          status: 'covered',
          explanation: 'LLM found shorten path',
        },
      ],
    };
    const input = makeInput(graph, {
      functional: ['Encurtar URL', 'Redirect HTTP 302'],
      nonFunctional: [],
    });

    const coverage = buildRequirementCoverage(input, withLlmCoverage, pragmatic);

    expect(coverage).toEqual([
      expect.objectContaining({
        requirement: 'Encurtar URL',
        status: 'covered',
        explanation: 'LLM found shorten path',
      }),
      expect.objectContaining({
        requirement: 'Redirect HTTP 302',
        status: 'missing',
      }),
    ]);
  });

  it('returns empty array when no requirements were declared', async () => {
    const graph = getGoldenGraph('good');
    const rigorous = await mockJudgePartial('rigorous', graph);
    const pragmatic = await mockJudgePartial('pragmatic', graph);

    const coverage = buildRequirementCoverage(makeInput(graph), rigorous, pragmatic);

    expect(coverage).toEqual([]);
  });
});

describe('mergeConsensus', () => {
  it('uses the lower score from both judges', async () => {
    const graph = getGoldenGraph('good');
    const rigorous = await mockJudgePartial('rigorous', graph);
    const pragmatic = await mockJudgePartial('pragmatic', graph);

    const merged = mergeConsensus(rigorous, pragmatic, makeInput(graph));

    expect(merged.score).toBe(Math.min(rigorous.score, pragmatic.score));
    expect(merged.judgeDebate.rigorous).toBe(rigorous.rationale);
    expect(merged.judgeDebate.pragmatic).toBe(pragmatic.rationale);
  });
});

describe('judgeStructuralOnly', () => {
  it('FAILS shortener-good graph on zoom-conference with missing_component codes', () => {
    const result = judgeStructuralOnly({
      problemId: 'zoom-conference',
      requirements: { functional: [], nonFunctional: [] },
      graph: getGoldenGraph('good'),
      mode: 'study',
      locale: 'en',
    });

    expect(result.verdict).toBe('FAIL');
    expect(result.structuralCodes).toContain('missing_component');
    expect(result.criticalIssues.some((i) => i.severity === 'blocker')).toBe(true);
    expect(result.scaleNarrative.length).toBeGreaterThan(0);
    expect(result.summary).toContain('LLM_API_KEY');
  });

  it('PASSes url-shortener good graph on structural Baseline', () => {
    const result = judgeStructuralOnly({
      problemId: URL_SHORTENER_ID,
      requirements: { functional: [], nonFunctional: [] },
      graph: getGoldenGraph('good'),
      mode: 'study',
      locale: 'en',
    });

    expect(result.verdict).toBe('PASS');
    expect(result.structuralCodes ?? []).not.toContain('missing_component');
    expect(result.scaleNarrative.length).toBeGreaterThan(0);
  });
});

describe('judgeSubmission', () => {
  const client = createMockLlmClient();

  it('returns PASS or PARTIAL with score ≥ 70 for good golden graph', async () => {
    const result = await judgeSubmission(makeInput(getGoldenGraph('good')), client);

    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(['PASS', 'PARTIAL']).toContain(result.verdict);
    expect(result.summary.length).toBeGreaterThan(0);
    expect(result.nextStep.length).toBeGreaterThan(0);
  });

  it('returns FAIL for bad golden graph', async () => {
    const result = await judgeSubmission(makeInput(getGoldenGraph('bad')), client);

    expect(result.verdict).toBe('FAIL');
    expect(result.criticalIssues.some((issue) => issue.severity === 'blocker')).toBe(true);
  });

  it('returns PARTIAL or FAIL for medium golden graph', async () => {
    const result = await judgeSubmission(makeInput(getGoldenGraph('medium')), client);

    expect(['PARTIAL', 'FAIL']).toContain(result.verdict);
    expect(result.criticalIssues.some((issue) => issue.title.includes('cache'))).toBe(true);
  });

  it('throws UnknownProblemError for invalid problemId', async () => {
    await expect(
      judgeSubmission({ ...makeInput(getGoldenGraph('good')), problemId: 'unknown-problem' }, client),
    ).rejects.toBeInstanceOf(UnknownProblemError);
  });

  it('includes requirement coverage when requirements are declared', async () => {
    const result = await judgeSubmission(
      makeInput(getGoldenGraph('good'), {
        functional: ['Gerar link curto'],
        nonFunctional: ['Alta disponibilidade'],
      }),
      client,
    );

    expect(result.requirementCoverage).toEqual([
      expect.objectContaining({
        requirement: 'Gerar link curto',
        type: 'functional',
        status: 'missing',
      }),
      expect.objectContaining({
        requirement: 'Alta disponibilidade',
        type: 'nonFunctional',
        status: 'missing',
      }),
    ]);
  });

  it('FAILS when stub LLM returns PASS but structural blockers exist (JR-11)', async () => {
    const result = await judgeSubmission(
      {
        problemId: 'zoom-conference',
        requirements: { functional: [], nonFunctional: [] },
        graph: getGoldenGraph('good'),
        mode: 'study',
        locale: 'en',
      },
      createPassStubClient(),
    );

    expect(result.verdict).toBe('FAIL');
    expect(result.criticalIssues.some((i) => i.severity === 'blocker')).toBe(true);
    expect(result.structuralCodes).toContain('missing_component');
  });

  it('preserves LLM narrative fields when structural has no blockers (JR-12)', async () => {
    const result = await judgeSubmission(makeInput(getGoldenGraph('good')), createPassStubClient());

    expect(result.verdict).toBe('PASS');
    expect(result.score).toBe(95);
    expect(result.strengths).toEqual(
      expect.arrayContaining([expect.objectContaining({ title: PASS_STRENGTH.title })]),
    );
    expect(result.judgeDebate.rigorous).toContain('Stub LLM would PASS');
    expect(result.judgeDebate.pragmatic).toContain('Stub LLM would PASS');
  });
});
