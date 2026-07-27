import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { JudgeInput, JudgeResult } from '@sdq/shared';
import { initGameState } from '../test-hook';
import {
  clearCachedJudgePayload,
  formatRateLimitMessage,
  JudgeApiError,
  retryLastJudging,
  submitForJudging,
} from './judge-api';

const sampleInput: JudgeInput = {
  problemId: 'url-shortener',
  requirements: {
    functional: ['Redirect HTTP 302'],
    nonFunctional: ['Baixa latência'],
  },
  graph: {
    nodes: [
      {
        id: 'app-1',
        type: 'app_server',
        label: 'App',
        position: { x: 0, y: 0, z: 0 },
      },
    ],
    edges: [],
  },
  mode: 'study',
};

const sampleResult: JudgeResult = {
  verdict: 'PASS',
  score: 85,
  summary: 'Solid layered design.',
  nextStep: 'Add monitoring.',
  strengths: [],
  criticalIssues: [],
  improvements: [],
  requirementCoverage: [],
  judgeDebate: {
    rigorous: 'Good.',
    pragmatic: 'Good enough.',
    consensus: 'PASS.',
  },
};

describe('judge API client', () => {
  beforeEach(() => {
    clearCachedJudgePayload();
    initGameState();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns JudgeResult on successful fetch and reports progress steps', async () => {
    const progressSteps: string[] = [];
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(sampleResult), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const promise = submitForJudging(
      sampleInput,
      (step) => {
        progressSteps.push(step);
      },
      { fetchFn, stepIntervalMs: 1_000 },
    );

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual(sampleResult);
    expect(fetchFn).toHaveBeenCalledWith('/api/judge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sampleInput),
      signal: expect.any(AbortSignal),
    });
    expect(progressSteps[0]).toBe('analyzing');
    expect(progressSteps).toContain('consensus');
    expect(window.__GAME_STATE__.judgingStep).toBeNull();
  });

  it('throws timeout JudgeApiError when request exceeds configured timeout', async () => {
    const fetchFn = vi.fn((_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new DOMException('The operation was aborted.', 'AbortError'));
        });
      });
    });

    const timeoutMs = 1_000;
    const promise = submitForJudging(sampleInput, () => undefined, {
      fetchFn: fetchFn as typeof fetch,
      timeoutMs,
      stepIntervalMs: 5_000,
    });

    const assertion = expect(promise).rejects.toMatchObject({
      code: 'timeout',
      message:
        'O julgamento demorou mais de 60 segundos. Verifique sua conexão e tente novamente.',
    });

    await vi.advanceTimersByTimeAsync(timeoutMs);
    await assertion;
    expect(window.__GAME_STATE__.judgingStep).toBeNull();
  });

  it('throws server_error JudgeApiError with PT-BR message for HTTP 500', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const promise = submitForJudging(sampleInput, () => undefined, {
      fetchFn,
      stepIntervalMs: 5_000,
    });

    const assertion = expect(promise).rejects.toMatchObject({
      code: 'server_error',
      message:
        'O servidor não conseguiu julgar sua arquitetura agora. Tente novamente em instantes.',
    });

    await vi.runAllTimersAsync();
    await assertion;
    expect(window.__GAME_STATE__.judgingStep).toBeNull();
  });

  it('throws rate_limit JudgeApiError with PT-BR message for HTTP 429', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfterSec: 1800,
        }),
        {
          status: 429,
          headers: { 'Retry-After': '1800' },
        },
      ),
    );

    const promise = submitForJudging(sampleInput, () => undefined, {
      fetchFn,
      stepIntervalMs: 5_000,
    });

    const assertion = expect(promise).rejects.toEqual(
      new JudgeApiError(formatRateLimitMessage(1800), 'rate_limit', 1800),
    );

    await vi.runAllTimersAsync();
    await assertion;
  });

  it('retryLastJudging reuses cached payload without requiring a new input', async () => {
    const bodies: string[] = [];
    const fetchFn = vi.fn().mockImplementation(async (_url, init) => {
      bodies.push(String(init?.body));
      return new Response(JSON.stringify(sampleResult), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const firstInput: JudgeInput = {
      ...sampleInput,
      requirements: {
        functional: ['Primeira submissão'],
        nonFunctional: [],
      },
    };

    const firstPromise = submitForJudging(firstInput, () => undefined, {
      fetchFn,
      stepIntervalMs: 1_000,
    });
    await vi.runAllTimersAsync();
    await firstPromise;

    const secondInput: JudgeInput = {
      ...sampleInput,
      requirements: {
        functional: ['Submissão diferente'],
        nonFunctional: [],
      },
    };

    const retryPromise = retryLastJudging(() => undefined, {
      fetchFn,
      stepIntervalMs: 1_000,
    });
    await vi.runAllTimersAsync();
    await retryPromise;

    expect(bodies).toHaveLength(2);
    expect(JSON.parse(bodies[0]!)).toEqual(firstInput);
    expect(JSON.parse(bodies[1]!)).toEqual(firstInput);
    expect(JSON.parse(bodies[1]!)).not.toEqual(secondInput);
  });
});
