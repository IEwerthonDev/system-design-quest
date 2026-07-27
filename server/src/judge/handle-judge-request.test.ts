import { afterEach, describe, expect, it } from 'vitest';
import { getGoldenGraph, URL_SHORTENER_ID } from '@sdq/shared';
import { handleJudgeRequest } from './handle-judge-request';
import { resetRateLimitsForTests } from './rate-limit';
import { LlmParseError } from './parse-llm-json';

const TEST_IP = '203.0.113.55';

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    problemId: URL_SHORTENER_ID,
    requirements: { functional: ['Encurtar URL'], nonFunctional: [] },
    graph: getGoldenGraph('good'),
    mode: 'study',
    ...overrides,
  };
}

describe('handleJudgeRequest', () => {
  afterEach(() => {
    resetRateLimitsForTests();
  });

  it('returns 200 with mock in production when LLM_API_KEY is missing', async () => {
    const result = await handleJudgeRequest({
      body: validPayload(),
      ip: TEST_IP,
      env: { NODE_ENV: 'production' },
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual(
      expect.objectContaining({
        verdict: expect.any(String),
        score: expect.any(Number),
      }),
    );
  });

  it('returns 400 for invalid body', async () => {
    const result = await handleJudgeRequest({
      body: validPayload({ problemId: 'missing-problem' }),
      ip: TEST_IP,
      env: { NODE_ENV: 'test' },
    });

    expect(result.status).toBe(400);
    expect(result.body).toEqual(
      expect.objectContaining({
        error: 'Invalid request',
        message: 'Unknown problemId: missing-problem',
      }),
    );
  });

  it('returns 502 when LLM parse fails', async () => {
    const result = await handleJudgeRequest({
      body: validPayload(),
      ip: TEST_IP,
      env: { NODE_ENV: 'test' },
      llmClient: {
        completeJson: async () => {
          throw new LlmParseError();
        },
      },
    });

    expect(result.status).toBe(502);
  });
});
