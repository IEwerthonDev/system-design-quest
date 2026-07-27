import { afterEach, describe, expect, it } from 'vitest';
import {
  getGoldenGraph,
  type GoldenGraphTier,
  type JudgeInput,
  URL_SHORTENER_ID,
} from '@sdq/shared';
import { buildApp } from '../main';
import { judgeSubmission } from './dual-judge';
import { createMockLlmClient } from './mock-llm-client';
import { resetRateLimitsForTests } from './rate-limit';

const GOLDEN_TIERS: GoldenGraphTier[] = ['good', 'medium', 'bad'];

function makeGoldenInput(tier: GoldenGraphTier): JudgeInput {
  return {
    problemId: URL_SHORTENER_ID,
    requirements: {
      functional: ['Encurtar URL', 'Redirect HTTP 302'],
      nonFunctional: ['100k read RPS'],
    },
    graph: getGoldenGraph(tier),
    mode: 'study',
  };
}

function goldenPayload(tier: GoldenGraphTier) {
  const input = makeGoldenInput(tier);
  return {
    problemId: input.problemId,
    requirements: input.requirements,
    graph: input.graph,
    mode: input.mode,
  };
}

describe('golden submission integration (JUDGE-08)', () => {
  const mockClient = createMockLlmClient();

  describe('judgeSubmission pipeline (mock LLM, no API key)', () => {
    it.each(GOLDEN_TIERS)('judges %s golden graph without external API', async (tier) => {
      const result = await judgeSubmission(makeGoldenInput(tier), mockClient);

      expect(result.summary.length).toBeGreaterThan(0);
      expect(result.nextStep.length).toBeGreaterThan(0);
      expect(result.judgeDebate.consensus.length).toBeGreaterThan(0);
    });

    it('returns PASS or PARTIAL with score ≥ 70 for good graph', async () => {
      const result = await judgeSubmission(makeGoldenInput('good'), mockClient);

      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(['PASS', 'PARTIAL']).toContain(result.verdict);
    });

    it('returns FAIL for bad graph (client → DB only)', async () => {
      const result = await judgeSubmission(makeGoldenInput('bad'), mockClient);

      expect(result.verdict).toBe('FAIL');
      expect(result.criticalIssues.some((issue) => issue.severity === 'blocker')).toBe(true);
    });

    it('returns PARTIAL or FAIL for medium graph with cache or scale issues', async () => {
      const result = await judgeSubmission(makeGoldenInput('medium'), mockClient);

      expect(['PARTIAL', 'FAIL']).toContain(result.verdict);
      const mentionsCacheOrScale = result.criticalIssues.some(
        (issue) =>
          issue.title.toLowerCase().includes('cache') ||
          issue.explanation.toLowerCase().includes('cache') ||
          issue.title.toLowerCase().includes('load balancer') ||
          issue.explanation.toLowerCase().includes('scale'),
      );
      expect(mentionsCacheOrScale).toBe(true);
    });
  });

  describe('POST /api/judge HTTP pipeline (mock LLM, no API key)', () => {
    afterEach(() => {
      resetRateLimitsForTests();
    });

    it.each(GOLDEN_TIERS)(
      'returns 200 JudgeResult for %s golden submission in test env',
      async (tier) => {
        const app = await buildApp({ env: { NODE_ENV: 'test' } });
        const response = await app.inject({
          method: 'POST',
          url: '/api/judge',
          payload: goldenPayload(tier),
        });

        expect(response.statusCode).toBe(200);
        const body = response.json();
        expect(body.verdict).toEqual(expect.stringMatching(/^(PASS|PARTIAL|FAIL)$/));
        expect(body.score).toEqual(expect.any(Number));
        expect(body.judgeDebate.consensus).toEqual(expect.any(String));
      },
    );

    it('returns FAIL verdict band for bad golden graph via HTTP', async () => {
      const app = await buildApp({ env: { NODE_ENV: 'test' } });
      const response = await app.inject({
        method: 'POST',
        url: '/api/judge',
        payload: goldenPayload('bad'),
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().verdict).toBe('FAIL');
    });

    it('returns PASS or PARTIAL with score ≥ 70 for good golden graph via HTTP', async () => {
      const app = await buildApp({ env: { NODE_ENV: 'test' } });
      const response = await app.inject({
        method: 'POST',
        url: '/api/judge',
        payload: goldenPayload('good'),
      });

      const body = response.json();
      expect(response.statusCode).toBe(200);
      expect(body.score).toBeGreaterThanOrEqual(70);
      expect(['PASS', 'PARTIAL']).toContain(body.verdict);
    });
  });
});
