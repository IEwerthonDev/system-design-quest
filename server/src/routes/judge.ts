import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  getProblem,
  validateGraph,
  type ArchitectureGraph,
  type GameMode,
  type JudgeInput,
  type JudgeResult,
} from '@sdq/shared';
import { judgeSubmission, UnknownProblemError } from '../judge/dual-judge';
import { createLlmClient } from '../judge/llm-client';
import { createMockLlmClient, shouldUseMock, type LlmClient } from '../judge/mock-llm-client';
import { checkRateLimit } from '../judge/rate-limit';

export interface JudgeRouteOptions {
  env?: NodeJS.ProcessEnv;
}

type ParseResult =
  | { ok: true; input: JudgeInput }
  | { ok: false; message: string };

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isGameMode(value: unknown): value is GameMode {
  return value === 'study' || value === 'speedrun';
}

function isArchitectureGraph(value: unknown): value is ArchitectureGraph {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const graph = value as ArchitectureGraph;
  return Array.isArray(graph.nodes) && Array.isArray(graph.edges);
}

export function parseJudgeRequestBody(body: unknown): ParseResult {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Request body must be a JSON object' };
  }

  const record = body as Record<string, unknown>;
  const problemId = record.problemId;
  const requirements = record.requirements;
  const graph = record.graph;
  const mode = record.mode;

  if (typeof problemId !== 'string' || problemId.trim() === '') {
    return { ok: false, message: 'problemId must be a non-empty string' };
  }

  if (!getProblem(problemId)) {
    return { ok: false, message: `Unknown problemId: ${problemId}` };
  }

  if (!requirements || typeof requirements !== 'object') {
    return { ok: false, message: 'requirements must be an object with functional and nonFunctional arrays' };
  }

  const req = requirements as Record<string, unknown>;
  if (!isStringArray(req.functional) || !isStringArray(req.nonFunctional)) {
    return { ok: false, message: 'requirements.functional and requirements.nonFunctional must be string arrays' };
  }

  if (!isArchitectureGraph(graph)) {
    return { ok: false, message: 'graph must include nodes and edges arrays' };
  }

  const graphValidation = validateGraph(graph);
  if (!graphValidation.valid) {
    return { ok: false, message: graphValidation.errors[0]?.message ?? 'Invalid architecture graph' };
  }

  if (!isGameMode(mode)) {
    return { ok: false, message: 'mode must be "study" or "speedrun"' };
  }

  return {
    ok: true,
    input: {
      problemId,
      requirements: {
        functional: req.functional,
        nonFunctional: req.nonFunctional,
      },
      graph,
      mode,
    },
  };
}

export function createJudgeLlmClient(env: NodeJS.ProcessEnv = process.env): LlmClient | null {
  const apiKey = env.LLM_API_KEY?.trim();

  if (env.NODE_ENV === 'production' && !apiKey) {
    return null;
  }

  if (shouldUseMock(env)) {
    return createMockLlmClient();
  }

  return createLlmClient({
    apiKey: apiKey!,
    baseUrl: env.LLM_BASE_URL,
    model: env.LLM_MODEL,
  });
}

export async function registerJudgeRoutes(
  app: FastifyInstance,
  options: JudgeRouteOptions = {},
): Promise<void> {
  const env = options.env ?? process.env;

  app.post('/api/judge', async (request: FastifyRequest, reply: FastifyReply) => {
    const rateLimit = checkRateLimit(request.ip, env);
    if (!rateLimit.allowed) {
      return reply
        .code(429)
        .header('Retry-After', String(rateLimit.retryAfterSec ?? 3600))
        .send({
          error: 'Rate limit exceeded',
          message: 'Too many judge requests from this IP. Try again later.',
          retryAfterSec: rateLimit.retryAfterSec,
        });
    }

    const parsed = parseJudgeRequestBody(request.body);
    if (!parsed.ok) {
      return reply.code(400).send({
        error: 'Invalid request',
        message: parsed.message,
      });
    }

    const client = createJudgeLlmClient(env);
    if (!client) {
      return reply.code(503).send({
        error: 'Service unavailable',
        message: 'LLM_API_KEY is not configured on the server.',
      });
    }

    try {
      const result: JudgeResult = await judgeSubmission(parsed.input, client);
      return reply.code(200).send(result);
    } catch (error) {
      if (error instanceof UnknownProblemError) {
        return reply.code(400).send({
          error: 'Invalid request',
          message: error.message,
        });
      }
      throw error;
    }
  });
}
