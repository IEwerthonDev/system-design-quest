import { afterEach, describe, expect, it } from 'vitest';
import { getGoldenGraph, URL_SHORTENER_ID } from '@sdq/shared';
import { buildApp } from '../main';
import { resetRateLimitsForTests } from '../judge/rate-limit';
import { LlmParseError } from '../judge/parse-llm-json';
import { parseJudgeRequestBody } from './judge';

const TEST_IP = '203.0.113.10';

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    problemId: URL_SHORTENER_ID,
    requirements: { functional: ['Encurtar URL'], nonFunctional: [] },
    graph: getGoldenGraph('good'),
    mode: 'study',
    ...overrides,
  };
}

describe('parseJudgeRequestBody', () => {
  it('accepts a valid judge payload', () => {
    const parsed = parseJudgeRequestBody(validPayload());
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.input.problemId).toBe(URL_SHORTENER_ID);
      expect(parsed.input.mode).toBe('study');
    }
  });

  it('rejects unknown problemId', () => {
    const parsed = parseJudgeRequestBody(validPayload({ problemId: 'unknown' }));
    expect(parsed).toEqual({
      ok: false,
      message: 'Unknown problemId: unknown',
    });
  });

  it('rejects empty graph', () => {
    const parsed = parseJudgeRequestBody(
      validPayload({ graph: { nodes: [], edges: [] } }),
    );
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.message).toContain('at least one component');
    }
  });
});

describe('POST /api/judge', () => {
  afterEach(() => {
    resetRateLimitsForTests();
  });

  it('returns 200 and JudgeResult for valid submission in dev without API key', async () => {
    const app = await buildApp({ env: { NODE_ENV: 'test' } });
    const response = await app.inject({
      method: 'POST',
      url: '/api/judge',
      remoteAddress: TEST_IP,
      payload: validPayload(),
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.verdict).toBe('PASS');
    expect(body.score).toBeGreaterThanOrEqual(70);
    expect(body.summary).toEqual(expect.any(String));
    expect(body.judgeDebate.consensus).toEqual(expect.any(String));
  });

  it('returns 400 for invalid problemId', async () => {
    const app = await buildApp({ env: { NODE_ENV: 'test' } });
    const response = await app.inject({
      method: 'POST',
      url: '/api/judge',
      payload: validPayload({ problemId: 'does-not-exist' }),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual(
      expect.objectContaining({
        error: 'Invalid request',
        message: 'Unknown problemId: does-not-exist',
      }),
    );
  });

  it('returns 400 for empty graph', async () => {
    const app = await buildApp({ env: { NODE_ENV: 'test' } });
    const response = await app.inject({
      method: 'POST',
      url: '/api/judge',
      payload: validPayload({ graph: { nodes: [], edges: [] } }),
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().message).toContain('at least one component');
  });

  it('returns 502 when LLM response cannot be parsed after repair', async () => {
    const app = await buildApp({
      env: { NODE_ENV: 'test' },
      llmClient: {
        completeJson: async () => {
          throw new LlmParseError();
        },
      },
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/judge',
      payload: validPayload(),
    });

    expect(response.statusCode).toBe(502);
    expect(response.json()).toEqual(
      expect.objectContaining({
        error: 'Bad gateway',
        message: 'Erro ao processar resposta da IA. Tente novamente.',
      }),
    );
  });

  it('returns 503 in production when LLM_API_KEY is missing', async () => {
    const app = await buildApp({ env: { NODE_ENV: 'production' } });
    const response = await app.inject({
      method: 'POST',
      url: '/api/judge',
      payload: validPayload(),
    });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual(
      expect.objectContaining({
        error: 'Service unavailable',
        message: 'LLM_API_KEY is not configured on the server.',
      }),
    );
  });

  it('returns 429 after 20 requests per IP in production', async () => {
    const app = await buildApp({
      env: { NODE_ENV: 'production', LLM_API_KEY: 'sk-test', JUDGE_USE_MOCK: 'true' },
    });

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/judge',
        remoteAddress: TEST_IP,
        payload: validPayload(),
      });
      expect(response.statusCode).toBe(200);
    }

    const blocked = await app.inject({
      method: 'POST',
      url: '/api/judge',
      remoteAddress: TEST_IP,
      payload: validPayload(),
    });

    expect(blocked.statusCode).toBe(429);
    expect(blocked.headers['retry-after']).toEqual(expect.any(String));
    expect(blocked.json()).toEqual(
      expect.objectContaining({
        error: 'Rate limit exceeded',
        retryAfterSec: expect.any(Number),
      }),
    );
  });

  it('does not rate limit in non-production environments', async () => {
    const app = await buildApp({ env: { NODE_ENV: 'development' } });

    for (let attempt = 0; attempt < 25; attempt += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/judge',
        remoteAddress: TEST_IP,
        payload: validPayload(),
      });
      expect(response.statusCode).toBe(200);
    }
  });
});
