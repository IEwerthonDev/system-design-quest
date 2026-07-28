import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getProblem, LEADERBOARD_DEFAULT_LIMIT } from '@sdq/shared';
import { parseLeaderboardSubmitBody } from '../routes/leaderboard';
import { createKvLeaderboardStore } from '../leaderboard/kv-store';
import {
  createLeaderboardService,
  type LeaderboardService,
} from '../leaderboard/service';

export const config = {
  maxDuration: 30,
};

export interface LeaderboardHttpResponse {
  status: number;
  body: Record<string, unknown>;
}

export interface HandleLeaderboardRequestOptions {
  method?: string;
  url?: string;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
  service?: LeaderboardService;
  env?: NodeJS.ProcessEnv;
}

function firstQueryValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function problemIdFromRequest(
  url: string | undefined,
  query: HandleLeaderboardRequestOptions['query'],
): string | undefined {
  const fromQuery = firstQueryValue(query?.problemId);
  if (fromQuery && fromQuery.trim()) {
    return fromQuery.trim();
  }
  if (!url) {
    return undefined;
  }
  try {
    const pathname = url.startsWith('http')
      ? new URL(url).pathname
      : url.split('?')[0] ?? url;
    const match = pathname.match(/\/api\/leaderboard\/([^/]+)\/?$/);
    if (match?.[1] && match[1] !== '') {
      return decodeURIComponent(match[1]);
    }
  } catch {
    // ignore malformed URL
  }
  return undefined;
}

function resolveService(
  options: HandleLeaderboardRequestOptions,
): { ok: true; service: LeaderboardService } | { ok: false; response: LeaderboardHttpResponse } {
  if (options.service) {
    return { ok: true, service: options.service };
  }
  try {
    const store = createKvLeaderboardStore(options.env ?? process.env);
    return { ok: true, service: createLeaderboardService(store) };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Leaderboard store unavailable';
    return {
      ok: false,
      response: {
        status: 503,
        body: {
          error: 'Service unavailable',
          message,
        },
      },
    };
  }
}

/** Shared leaderboard HTTP logic for the Hobby Vercel serverless route. */
export async function handleLeaderboardRequest(
  options: HandleLeaderboardRequestOptions,
): Promise<LeaderboardHttpResponse> {
  const method = (options.method ?? 'GET').toUpperCase();
  const resolved = resolveService(options);
  if (!resolved.ok) {
    return resolved.response;
  }
  const { service } = resolved;
  const query = options.query ?? {};

  if (method === 'POST') {
    const parsed = parseLeaderboardSubmitBody(options.body);
    if (!parsed.ok) {
      return {
        status: 400,
        body: {
          error: 'Invalid request',
          message: parsed.message,
        },
      };
    }

    const result = await service.submit(parsed.input);
    if (!result.ok) {
      if (result.code === 'NOT_QUALIFYING') {
        return {
          status: 422,
          body: {
            error: 'Not qualifying',
            message: result.message,
          },
        };
      }
      return {
        status: 400,
        body: {
          error: 'Invalid request',
          message: result.message,
        },
      };
    }

    return { status: 201, body: result.entry as unknown as Record<string, unknown> };
  }

  if (method === 'GET') {
    const problemId = problemIdFromRequest(options.url, query);
    if (!problemId) {
      return {
        status: 400,
        body: {
          error: 'Invalid request',
          message: 'problemId is required',
        },
      };
    }
    if (!getProblem(problemId)) {
      return {
        status: 400,
        body: {
          error: 'Invalid request',
          message: `Unknown problemId: ${problemId}`,
        },
      };
    }

    const limitRaw = firstQueryValue(query.limit);
    let limit = LEADERBOARD_DEFAULT_LIMIT;
    if (limitRaw !== undefined) {
      const parsedLimit = Number(limitRaw);
      if (!Number.isFinite(parsedLimit) || parsedLimit < 1) {
        return {
          status: 400,
          body: {
            error: 'Invalid request',
            message: 'limit must be a positive number',
          },
        };
      }
      limit = Math.min(Math.floor(parsedLimit), LEADERBOARD_DEFAULT_LIMIT);
    }

    const entries = await service.list(problemId, limit);
    return {
      status: 200,
      body: { problemId, entries },
    };
  }

  return {
    status: 405,
    body: {
      error: 'Method not allowed',
      message: 'Use GET /api/leaderboard/:problemId or POST /api/leaderboard',
    },
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const result = await handleLeaderboardRequest({
    method: req.method,
    url: req.url,
    query: req.query as Record<string, string | string[] | undefined>,
    body: req.body,
    env: process.env,
  });
  res.status(result.status).json(result.body);
}
