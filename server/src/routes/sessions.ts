import { resolve } from 'node:path';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { DesignSessionStatus, DesignSessionUpsertInput } from '@sdq/shared';
import { createSessionService, type SessionService } from '../sessions/service';
import { JsonFileSessionStore } from '../sessions/json-file-store';
import { InMemorySessionStore, type SessionStore } from '../sessions/store';

export interface SessionRouteOptions {
  store?: SessionStore;
  service?: SessionService;
  /** Used when `store` is omitted — defaults to JsonFile at SESSIONS_DATA_PATH. */
  env?: NodeJS.ProcessEnv;
  dataPath?: string;
}

const VALID_STATUSES: ReadonlySet<string> = new Set([
  'approved',
  'rejected',
  'partial',
  'in_progress',
]);

type ParseUpsertResult =
  | { ok: true; input: DesignSessionUpsertInput }
  | { ok: false; message: string };

export function parseSessionUpsertBody(body: unknown, pathId: string): ParseUpsertResult {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Request body must be a JSON object' };
  }

  const record = body as Record<string, unknown>;
  const id = record.id;
  const problemId = record.problemId;
  const playerNickname = record.playerNickname;
  const status = record.status;
  const graph = record.graph;

  if (typeof id !== 'string' || id.trim() === '') {
    return { ok: false, message: 'id must be a non-empty string' };
  }

  if (id !== pathId) {
    return { ok: false, message: 'id in body must match path parameter' };
  }

  if (typeof problemId !== 'string' || problemId.trim() === '') {
    return { ok: false, message: 'problemId must be a non-empty string' };
  }

  if (typeof playerNickname !== 'string') {
    return { ok: false, message: 'playerNickname must be a string' };
  }

  if (typeof status !== 'string' || !VALID_STATUSES.has(status)) {
    return { ok: false, message: 'status must be approved, rejected, partial, or in_progress' };
  }

  if (!graph || typeof graph !== 'object') {
    return { ok: false, message: 'graph is required' };
  }

  const input: DesignSessionUpsertInput = {
    id,
    problemId,
    playerNickname,
    status: status as DesignSessionStatus,
    graph: graph as DesignSessionUpsertInput['graph'],
  };

  if (record.requirements !== undefined) {
    input.requirements = record.requirements as DesignSessionUpsertInput['requirements'];
  }
  if (record.judgeResult !== undefined) {
    input.judgeResult = record.judgeResult as DesignSessionUpsertInput['judgeResult'];
  }
  if (record.mode === 'study' || record.mode === 'speedrun') {
    input.mode = record.mode;
  }

  return { ok: true, input };
}

export function defaultSessionsDataPath(env: NodeJS.ProcessEnv = process.env): string {
  return env.SESSIONS_DATA_PATH ?? resolve(process.cwd(), 'data', 'sessions.json');
}

export function createDefaultSessionStore(
  env: NodeJS.ProcessEnv = process.env,
  dataPath?: string,
): SessionStore {
  if (env.SESSIONS_STORE === 'memory') {
    return new InMemorySessionStore();
  }
  return new JsonFileSessionStore({ filePath: dataPath ?? defaultSessionsDataPath(env) });
}

export async function registerSessionRoutes(
  app: FastifyInstance,
  options: SessionRouteOptions = {},
): Promise<SessionService> {
  const store =
    options.store ??
    createDefaultSessionStore(options.env ?? process.env, options.dataPath);
  const service = options.service ?? createSessionService(store);

  app.put(
    '/api/sessions/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      const parsed = parseSessionUpsertBody(request.body, request.params.id);
      if (!parsed.ok) {
        return reply.code(400).send({
          error: 'Invalid request',
          message: parsed.message,
        });
      }

      const result = await service.upsert(parsed.input);
      if (!result.ok) {
        return reply.code(400).send({
          error: 'Invalid request',
          message: result.message,
          code: result.code,
        });
      }

      return reply.code(200).send(result.record);
    },
  );

  app.get(
    '/api/sessions',
    async (
      request: FastifyRequest<{
        Querystring: { nickname?: string; status?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const nickname = request.query.nickname;
      if (typeof nickname !== 'string' || nickname.trim() === '') {
        return reply.code(400).send({
          error: 'Invalid request',
          message: 'nickname query parameter is required',
        });
      }

      const statusRaw = request.query.status;
      let status: DesignSessionStatus | undefined;
      if (statusRaw !== undefined) {
        if (!VALID_STATUSES.has(statusRaw)) {
          return reply.code(400).send({
            error: 'Invalid request',
            message: 'status must be approved, rejected, partial, or in_progress',
          });
        }
        status = statusRaw as DesignSessionStatus;
      }

      const sessions = await service.list(nickname, status);
      return reply.code(200).send({ nickname, sessions });
    },
  );

  app.get(
    '/api/sessions/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      const session = await service.get(request.params.id);
      if (!session) {
        return reply.code(404).send({
          error: 'Not found',
          message: `Session not found: ${request.params.id}`,
        });
      }
      return reply.code(200).send(session);
    },
  );

  return service;
}
