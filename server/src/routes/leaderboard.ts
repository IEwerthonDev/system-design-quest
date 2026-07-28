import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getProblem, LEADERBOARD_DEFAULT_LIMIT, type LeaderboardSubmitInput } from '@sdq/shared';
import { createLeaderboardService, type LeaderboardService } from '../leaderboard/service';
import { InMemoryLeaderboardStore, type LeaderboardStore } from '../leaderboard/store';

export interface LeaderboardRouteOptions {
  store?: LeaderboardStore;
  service?: LeaderboardService;
}

type ParseSubmitResult =
  | { ok: true; input: LeaderboardSubmitInput }
  | { ok: false; message: string };

export function parseLeaderboardSubmitBody(body: unknown): ParseSubmitResult {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Request body must be a JSON object' };
  }

  const record = body as Record<string, unknown>;
  const problemId = record.problemId;
  const playerNickname = record.playerNickname;
  const elapsedMs = record.elapsedMs;
  const score = record.score;
  const verdict = record.verdict;

  if (typeof problemId !== 'string' || problemId.trim() === '') {
    return { ok: false, message: 'problemId must be a non-empty string' };
  }

  if (!getProblem(problemId)) {
    return { ok: false, message: `Unknown problemId: ${problemId}` };
  }

  if (typeof playerNickname !== 'string') {
    return { ok: false, message: 'playerNickname must be a string' };
  }

  if (typeof elapsedMs !== 'number' || !Number.isFinite(elapsedMs)) {
    return { ok: false, message: 'elapsedMs must be a finite number' };
  }

  if (typeof score !== 'number' || !Number.isFinite(score)) {
    return { ok: false, message: 'score must be a finite number' };
  }

  if (verdict !== 'PASS' && verdict !== 'PARTIAL' && verdict !== 'FAIL') {
    return { ok: false, message: 'verdict must be PASS, PARTIAL, or FAIL' };
  }

  return {
    ok: true,
    input: {
      problemId,
      playerNickname,
      elapsedMs,
      score,
      verdict,
    },
  };
}

export async function registerLeaderboardRoutes(
  app: FastifyInstance,
  options: LeaderboardRouteOptions = {},
): Promise<LeaderboardService> {
  const store = options.store ?? new InMemoryLeaderboardStore();
  const service = options.service ?? createLeaderboardService(store);

  app.post('/api/leaderboard', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = parseLeaderboardSubmitBody(request.body);
    if (!parsed.ok) {
      return reply.code(400).send({
        error: 'Invalid request',
        message: parsed.message,
      });
    }

    const result = await service.submit(parsed.input);
    if (!result.ok) {
      if (result.code === 'NOT_QUALIFYING') {
        return reply.code(422).send({
          error: 'Not qualifying',
          message: result.message,
        });
      }

      return reply.code(400).send({
        error: 'Invalid request',
        message: result.message,
      });
    }

    return reply.code(201).send(result.entry);
  });

  app.get(
    '/api/leaderboard/:problemId',
    async (
      request: FastifyRequest<{ Params: { problemId: string }; Querystring: { limit?: string } }>,
      reply: FastifyReply,
    ) => {
      const { problemId } = request.params;
      if (!getProblem(problemId)) {
        return reply.code(400).send({
          error: 'Invalid request',
          message: `Unknown problemId: ${problemId}`,
        });
      }

      const limitRaw = request.query.limit;
      let limit = LEADERBOARD_DEFAULT_LIMIT;
      if (limitRaw !== undefined) {
        const parsedLimit = Number(limitRaw);
        if (!Number.isFinite(parsedLimit) || parsedLimit < 1) {
          return reply.code(400).send({
            error: 'Invalid request',
            message: 'limit must be a positive number',
          });
        }
        limit = Math.min(Math.floor(parsedLimit), LEADERBOARD_DEFAULT_LIMIT);
      }

      const entries = await service.list(problemId, limit);
      return reply.code(200).send({ problemId, entries });
    },
  );

  return service;
}
