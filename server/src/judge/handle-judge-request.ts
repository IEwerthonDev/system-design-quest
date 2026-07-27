import type { JudgeResult } from '@sdq/shared';
import { judgeSubmission, UnknownProblemError } from './dual-judge';
import { createLlmClient } from './llm-client';
import { createMockLlmClient, shouldUseMock, type LlmClient } from './mock-llm-client';
import { LlmParseError } from './parse-llm-json';
import { checkRateLimit } from './rate-limit';
import { parseJudgeRequestBody } from '../routes/judge-parse';

export interface JudgeHttpResponse {
  status: number;
  headers?: Record<string, string>;
  body: Record<string, unknown> | JudgeResult;
}

export interface HandleJudgeRequestOptions {
  body: unknown;
  ip: string;
  env?: NodeJS.ProcessEnv;
  llmClient?: LlmClient;
}

/** Hybrid LLM: mock when no key (incl. production) or JUDGE_USE_MOCK; else real client. */
export function createJudgeLlmClient(
  env: NodeJS.ProcessEnv = process.env,
  override?: LlmClient,
): LlmClient | null {
  if (override) {
    return override;
  }

  if (shouldUseMock(env)) {
    return createMockLlmClient();
  }

  const apiKey = env.LLM_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  return createLlmClient({
    apiKey,
    baseUrl: env.LLM_BASE_URL,
    model: env.LLM_MODEL,
  });
}

/** Shared judge HTTP logic for Fastify and Vercel serverless. */
export async function handleJudgeRequest(
  options: HandleJudgeRequestOptions,
): Promise<JudgeHttpResponse> {
  const env = options.env ?? process.env;
  const rateLimit = checkRateLimit(options.ip, env);
  if (!rateLimit.allowed) {
    return {
      status: 429,
      headers: { 'Retry-After': String(rateLimit.retryAfterSec ?? 3600) },
      body: {
        error: 'Rate limit exceeded',
        message: 'Too many judge requests from this IP. Try again later.',
        retryAfterSec: rateLimit.retryAfterSec,
      },
    };
  }

  const parsed = parseJudgeRequestBody(options.body);
  if (!parsed.ok) {
    return {
      status: 400,
      body: {
        error: 'Invalid request',
        message: parsed.message,
      },
    };
  }

  const client = createJudgeLlmClient(env, options.llmClient);
  if (!client) {
    return {
      status: 503,
      body: {
        error: 'Service unavailable',
        message: 'LLM_API_KEY is not configured on the server.',
      },
    };
  }

  try {
    const result: JudgeResult = await judgeSubmission(parsed.input, client);
    return { status: 200, body: result };
  } catch (error) {
    if (error instanceof UnknownProblemError) {
      return {
        status: 400,
        body: {
          error: 'Invalid request',
          message: error.message,
        },
      };
    }
    if (error instanceof LlmParseError) {
      return {
        status: 502,
        body: {
          error: 'Bad gateway',
          message: 'Erro ao processar resposta da IA. Tente novamente.',
        },
      };
    }
    throw error;
  }
}
