import type { MentorResult } from '@sdq/shared';
import { analyzeTopology } from '@sdq/shared';
import { checkRateLimit } from '../judge/rate-limit';
import { createJudgeLlmClient } from '../judge/handle-judge-request';
import { shouldUseMock, type LlmClient } from '../judge/mock-llm-client';
import {
  buildMentorPrompt,
  buildMockMentorResult,
  parseMentorRequestBody,
} from './mentor-service';

export interface MentorHttpResponse {
  status: number;
  headers?: Record<string, string>;
  body: Record<string, unknown> | MentorResult;
}

export interface HandleMentorRequestOptions {
  body: unknown;
  ip: string;
  env?: NodeJS.ProcessEnv;
  llmClient?: LlmClient;
}

export async function handleMentorRequest(
  options: HandleMentorRequestOptions,
): Promise<MentorHttpResponse> {
  const env = options.env ?? process.env;
  const rateLimit = checkRateLimit(options.ip, env);
  if (!rateLimit.allowed) {
    return {
      status: 429,
      headers: { 'Retry-After': String(rateLimit.retryAfterSec ?? 3600) },
      body: {
        error: 'Rate limit exceeded',
        message: 'Too many mentor requests from this IP. Try again later.',
        retryAfterSec: rateLimit.retryAfterSec,
      },
    };
  }

  const parsed = parseMentorRequestBody(options.body);
  if (!parsed.ok) {
    return {
      status: 400,
      body: { error: 'Invalid request', message: parsed.message },
    };
  }

  const findings = parsed.input.findings ?? analyzeTopology(parsed.input.graph);
  const input = { ...parsed.input, findings };

  if (shouldUseMock(env) && !options.llmClient) {
    return { status: 200, body: buildMockMentorResult(input) };
  }

  const client = createJudgeLlmClient(env, options.llmClient);
  if (!client) {
    return { status: 200, body: buildMockMentorResult(input) };
  }

  try {
    const promptText = buildMentorPrompt(input, findings);
    const json = await client.completeJson<{ title?: string; body?: string }>({
      role: 'pragmatic',
      graph: input.graph,
      locale: input.locale,
      text: promptText,
      problemId: '__sandbox__',
    });
    const mock = buildMockMentorResult(input);
    return {
      status: 200,
      body: {
        action: input.action,
        title: typeof json.title === 'string' && json.title.trim() ? json.title : mock.title,
        body: typeof json.body === 'string' && json.body.trim() ? json.body : mock.body,
        relatedFindings: findings.map((f) => f.code),
      },
    };
  } catch {
    return { status: 200, body: buildMockMentorResult(input) };
  }
}
