import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { DesignSessionStatus } from '@sdq/shared';
import { parseSessionUpsertBody } from '../routes/sessions';
import { createKvSessionStore } from '../sessions/kv-store';
import { createSessionService, type SessionService } from '../sessions/service';

export const config = {
  maxDuration: 30,
};

const VALID_STATUSES: ReadonlySet<string> = new Set([
  'approved',
  'rejected',
  'partial',
  'in_progress',
]);

export interface SessionsHttpResponse {
  status: number;
  body: Record<string, unknown>;
}

export interface HandleSessionsRequestOptions {
  method?: string;
  url?: string;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
  service?: SessionService;
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

function sessionIdFromRequest(url: string | undefined, query: HandleSessionsRequestOptions['query']): string | undefined {
  const fromQuery = firstQueryValue(query?.id) ?? firstQueryValue(query?.sessionId);
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
    const match = pathname.match(/\/api\/sessions\/([^/]+)\/?$/);
    if (match?.[1] && match[1] !== '') {
      return decodeURIComponent(match[1]);
    }
  } catch {
    // ignore malformed URL
  }
  return undefined;
}

function resolveService(
  options: HandleSessionsRequestOptions,
): { ok: true; service: SessionService } | { ok: false; response: SessionsHttpResponse } {
  if (options.service) {
    return { ok: true, service: options.service };
  }
  try {
    const store = createKvSessionStore(options.env ?? process.env);
    return { ok: true, service: createSessionService(store) };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sessions store unavailable';
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

/** Shared sessions HTTP logic for the Hobby Vercel serverless route. */
export async function handleSessionsRequest(
  options: HandleSessionsRequestOptions,
): Promise<SessionsHttpResponse> {
  const method = (options.method ?? 'GET').toUpperCase();
  const resolved = resolveService(options);
  if (!resolved.ok) {
    return resolved.response;
  }
  const { service } = resolved;
  const query = options.query ?? {};
  const sessionId = sessionIdFromRequest(options.url, query);

  if (method === 'PUT') {
    if (!sessionId) {
      return {
        status: 400,
        body: {
          error: 'Invalid request',
          message: 'session id path parameter is required',
        },
      };
    }
    const parsed = parseSessionUpsertBody(options.body, sessionId);
    if (!parsed.ok) {
      return {
        status: 400,
        body: {
          error: 'Invalid request',
          message: parsed.message,
        },
      };
    }
    const result = await service.upsert(parsed.input);
    if (!result.ok) {
      return {
        status: 400,
        body: {
          error: 'Invalid request',
          message: result.message,
          code: result.code,
        },
      };
    }
    return { status: 200, body: result.record as unknown as Record<string, unknown> };
  }

  if (method === 'GET') {
    if (sessionId) {
      const session = await service.get(sessionId);
      if (!session) {
        return {
          status: 404,
          body: {
            error: 'Not found',
            message: `Session not found: ${sessionId}`,
          },
        };
      }
      return { status: 200, body: session as unknown as Record<string, unknown> };
    }

    const nickname = firstQueryValue(query.nickname);
    if (typeof nickname !== 'string' || nickname.trim() === '') {
      return {
        status: 400,
        body: {
          error: 'Invalid request',
          message: 'nickname query parameter is required',
        },
      };
    }

    const statusRaw = firstQueryValue(query.status);
    let status: DesignSessionStatus | undefined;
    if (statusRaw !== undefined) {
      if (!VALID_STATUSES.has(statusRaw)) {
        return {
          status: 400,
          body: {
            error: 'Invalid request',
            message: 'status must be approved, rejected, partial, or in_progress',
          },
        };
      }
      status = statusRaw as DesignSessionStatus;
    }

    const sessions = await service.list(nickname, status);
    return {
      status: 200,
      body: { nickname, sessions },
    };
  }

  return {
    status: 405,
    body: {
      error: 'Method not allowed',
      message: 'Use GET /api/sessions or PUT /api/sessions/:id',
    },
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const result = await handleSessionsRequest({
    method: req.method,
    url: req.url,
    query: req.query as Record<string, string | string[] | undefined>,
    body: req.body,
    env: process.env,
  });
  res.status(result.status).json(result.body);
}
