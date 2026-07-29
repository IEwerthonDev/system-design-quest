import { describe, expect, it } from 'vitest';
import { getGoldenGraph, URL_SHORTENER_ID } from '@sdq/shared';
import type { JudgeInput } from '@sdq/shared';
import type { FeedbackItem, JudgePartialResult } from '@sdq/shared';
import {
  assertScaleNarrative,
  buildRequirementCoverage,
  judgeStructuralOnly,
  judgeSubmission,
  mergeConsensus,
  normalizeJudgePartialResult,
  UnknownProblemError,
} from './dual-judge';
import type { JudgeResult } from '@sdq/shared';
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

  it('includes structural blockers and scale mandate (JR-12)', () => {
    const zoom = getProblem('zoom-conference')!;
    const prompt = buildRigorousPrompt(zoom, {
      ...input,
      problemId: 'zoom-conference',
      graph: getGoldenGraph('good'),
    });
    expect(prompt).toMatch(/BLOCKER|Must-have gaps/i);
    expect(prompt).toMatch(/Scale mandate|scale analysis/i);
    expect(prompt).toMatch(/QPS|throughput|storage|fan-out/i);
  });

  it('includes Core Hard consistency/durability/coordination cue (JR-29)', () => {
    const stripe = getProblem('stripe-payments')!;
    const prompt = buildPragmaticPrompt(stripe, {
      ...input,
      problemId: 'stripe-payments',
    });
    expect(prompt).toMatch(/consistency/i);
    expect(prompt).toMatch(/durability/i);
    expect(prompt).toMatch(/coordination/i);
  });
});

describe('buildRequirementCoverage', () => {
  it('populates every declared requirement from the graph analysis (RC-03 AC4)', async () => {
    const graph = getGoldenGraph('good');
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
    expect(coverage.every((item) => item.status !== 'missing')).toBe(true);
    expect(coverage.every((item) => item.explanation.length > 0)).toBe(true);
  });

  it('lets the LLM downgrade a covered requirement (RC-03 AC1)', async () => {
    const graph = getGoldenGraph('good');
    const rigorous = await mockJudgePartial('rigorous', graph);
    const pragmatic = await mockJudgePartial('pragmatic', graph);
    const withLlmCoverage: typeof rigorous = {
      ...rigorous,
      requirementCoverage: [
        {
          requirement: 'Encurtar URL',
          type: 'functional',
          status: 'missing',
          explanation: 'LLM found no shorten path',
        },
      ],
    };
    const input = makeInput(graph, {
      functional: ['Encurtar URL', 'Redirect HTTP 302'],
      nonFunctional: [],
    });

    const coverage = buildRequirementCoverage(input, withLlmCoverage, pragmatic);

    expect(coverage[0]).toEqual(
      expect.objectContaining({
        requirement: 'Encurtar URL',
        status: 'missing',
        explanation: 'LLM found no shorten path',
      }),
    );
    expect(coverage[1]!.status).not.toBe('missing');
  });

  it('ignores LLM upgrades above the graph analysis (RC-03 AC2)', async () => {
    const graph = getGoldenGraph('medium');
    const rigorous = await mockJudgePartial('rigorous', graph);
    const pragmatic = await mockJudgePartial('pragmatic', graph);
    const input = makeInput(graph, {
      functional: [],
      nonFunctional: ['Redirect responde em menos de 100 ms no percentil 99'],
    });
    const baseline = buildRequirementCoverage(input, rigorous, pragmatic);
    expect(baseline[0]!.status).toBe('missing');

    const optimistic: typeof rigorous = {
      ...rigorous,
      requirementCoverage: [
        {
          requirement: 'Redirect responde em menos de 100 ms no percentil 99',
          type: 'nonFunctional',
          status: 'covered',
          explanation: 'LLM claims low latency',
        },
      ],
    };

    const coverage = buildRequirementCoverage(input, optimistic, pragmatic);

    expect(coverage[0]!.status).toBe('missing');
    expect(coverage[0]!.explanation).not.toBe('LLM claims low latency');
  });

  it('matches LLM items despite case, accent and punctuation drift (RC-03 AC3)', async () => {
    const graph = getGoldenGraph('good');
    const rigorous = await mockJudgePartial('rigorous', graph);
    const pragmatic = await mockJudgePartial('pragmatic', graph);
    const input = makeInput(graph, {
      functional: ['Usuário pode encurtar uma URL longa'],
      nonFunctional: [],
    });
    const drifted: typeof rigorous = {
      ...rigorous,
      requirementCoverage: [
        {
          requirement: '  usuario pode encurtar uma url longa!  ',
          type: 'functional',
          status: 'partial',
          explanation: 'LLM saw only a partial write path',
        },
      ],
    };

    const coverage = buildRequirementCoverage(input, drifted, pragmatic);

    expect(coverage[0]).toEqual(
      expect.objectContaining({
        status: 'partial',
        explanation: 'LLM saw only a partial write path',
      }),
    );
  });

  it('falls back to a locale explanation when the LLM downgrade has none', async () => {
    const graph = getGoldenGraph('good');
    const rigorous = await mockJudgePartial('rigorous', graph);
    const pragmatic = await mockJudgePartial('pragmatic', graph);
    const input = makeInput(graph, {
      functional: ['Usuário pode encurtar uma URL longa em um link curto único'],
      nonFunctional: [],
    });
    const noExplanation = {
      ...rigorous,
      requirementCoverage: [
        {
          requirement: 'Usuário pode encurtar uma URL longa em um link curto único',
          type: 'functional',
          status: 'missing',
          explanation: '   ',
        },
      ],
    } as typeof rigorous;

    const coverage = buildRequirementCoverage(input, noExplanation, pragmatic);

    expect(coverage[0]!.status).toBe('missing');
    expect(coverage[0]!.explanation.trim().length).toBeGreaterThan(0);
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

  it('tolerates LLM partials missing requirementCoverage arrays (prod 500 regression)', () => {
    const graph = getGoldenGraph('good');
    const malformed = {
      score: 72,
      strengths: [],
      criticalIssues: [],
      improvements: [],
      rationale: 'Coverage omitted by model',
    } as unknown as JudgePartialResult;

    const merged = mergeConsensus(
      malformed,
      { ...malformed, score: 80 },
      makeInput(graph, {
        functional: ['Encurtar URL'],
        nonFunctional: [],
      }),
    );

    expect(merged.score).toBe(72);
    expect(merged.requirementCoverage).toEqual([
      expect.objectContaining({
        requirement: 'Encurtar URL',
        status: 'covered',
      }),
    ]);
  });
});

describe('normalizeJudgePartialResult', () => {
  it('coerces omitted and non-array list fields to empty arrays', () => {
    const normalized = normalizeJudgePartialResult({
      score: 55.7,
      requirementCoverage: { not: 'an array' },
      strengths: 'oops',
    });

    expect(normalized).toEqual({
      score: 56,
      strengths: [],
      criticalIssues: [],
      improvements: [],
      requirementCoverage: [],
      rationale: '',
    });
  });
});

describe('judgeSubmission with malformed LLM JSON shape', () => {
  it('returns 200-path JudgeResult when requirementCoverage is missing', async () => {
    const client: LlmClient = {
      async completeJson<T>(): Promise<T> {
        return {
          score: 70,
          strengths: [],
          criticalIssues: [],
          improvements: [],
          rationale: 'No coverage field',
        } as T;
      },
    };

    const result = await judgeSubmission(makeInput(getGoldenGraph('good')), client);

    expect(result.score).toBeLessThanOrEqual(70);
    expect(result.requirementCoverage).toEqual([]);
    expect(result.judgeDebate.rigorous).toBe('No coverage field');
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

  it('grades coverage per requirement instead of all-covered on a PASS graph (RC-03)', () => {
    const result = judgeStructuralOnly({
      problemId: URL_SHORTENER_ID,
      requirements: {
        functional: ['Usuário pode encurtar uma URL longa'],
        nonFunctional: ['Disponibilidade de 99,9% para operações de leitura'],
      },
      graph: getGoldenGraph('good'),
      mode: 'study',
      locale: 'pt-BR',
    });

    expect(result.verdict).toBe('PASS');
    expect(result.requirementCoverage.map((item) => item.status)).toEqual(['covered', 'missing']);
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
        status: 'covered',
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
    expect(result.scaleNarrative.length).toBeGreaterThan(0);
  });
});

describe('assertScaleNarrative (JR-14, JR-15)', () => {
  const passBase: JudgeResult = {
    verdict: 'PASS',
    score: 95,
    summary: 'Your architecture scored 95/100.',
    nextStep: 'Review improvements.',
    strengths: [PASS_STRENGTH],
    criticalIssues: [],
    improvements: [],
    requirementCoverage: [],
    judgeDebate: {
      rigorous: 'ok',
      pragmatic: 'ok',
      consensus: 'ok',
    },
    scaleNarrative: '',
  };

  it('blocks PASS when scaleNarrative is empty', () => {
    const result = assertScaleNarrative(passBase, 'en');

    expect(result.verdict).not.toBe('PASS');
    expect(result.score).toBeLessThan(80);
    expect(result.scaleNarrative).toBe('');
  });

  it('allows PASS when scaleNarrative is non-empty and AD-016 otherwise met', () => {
    const result = assertScaleNarrative(
      { ...passBase, scaleNarrative: 'At 100k RPS, cache must absorb redirect reads.' },
      'en',
    );

    expect(result.verdict).toBe('PASS');
    expect(result.score).toBe(95);
  });
});
