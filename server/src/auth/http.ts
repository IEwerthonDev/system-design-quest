import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { DesignSessionRecord } from '@sdq/shared';
import { AuthError, createAuthService, type AuthService } from '../auth/service';
import { createKvUserStoreFromEnv } from '../auth/kv-user-store';
import { createKvSessionStore } from '../sessions/kv-store';

export const config = {
  maxDuration: 30,
};

export interface AuthHttpResponse {
  status: number;
  body: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface HandleAuthRequestOptions {
  method?: string;
  url?: string;
  query?: Record<string, string | string[] | undefined>;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
  service?: AuthService;
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

function headerValue(
  headers: HandleAuthRequestOptions['headers'],
  name: string,
): string | undefined {
  if (!headers) return undefined;
  const raw = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

function pathOf(url: string | undefined): string {
  if (!url) return '';
  try {
    const pathname = url.startsWith('http')
      ? new URL(url).pathname
      : url.split('?')[0] ?? url;
    return pathname.replace(/\/+$/, '') || '/';
  } catch {
    return '';
  }
}

function resolveAuthService(
  options: HandleAuthRequestOptions,
): { ok: true; service: AuthService } | { ok: false; response: AuthHttpResponse } {
  if (options.service) {
    return { ok: true, service: options.service };
  }
  const env = options.env ?? process.env;
  try {
    const users = createKvUserStoreFromEnv(env);
    let sessions;
    try {
      sessions = createKvSessionStore(env);
    } catch {
      sessions = undefined;
    }
    return {
      ok: true,
      service: createAuthService({ users, sessions, env }),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Auth unavailable';
    return {
      ok: false,
      response: {
        status: 503,
        body: { error: 'Service unavailable', message },
      },
    };
  }
}

function mapAuthError(err: unknown): AuthHttpResponse {
  if (err instanceof AuthError) {
    const status =
      err.code === 'UNAUTHORIZED' || err.code === 'NICKNAME_REQUIRED'
        ? 401
        : err.code === 'NICKNAME_TAKEN'
          ? 409
          : err.code === 'INVALID_NICKNAME' || err.code === 'INVALID_STATE'
            ? 400
            : 502;
    return {
      status,
      body: { error: err.code, message: err.message },
    };
  }
  const message = err instanceof Error ? err.message : 'Auth failed';
  return { status: 500, body: { error: 'INTERNAL', message } };
}

export async function handleAuthRequest(
  options: HandleAuthRequestOptions,
): Promise<AuthHttpResponse> {
  const resolved = resolveAuthService(options);
  if (!resolved.ok) {
    return resolved.response;
  }
  const { service } = resolved;
  const method = (options.method ?? 'GET').toUpperCase();
  const path = pathOf(options.url);
  const cookie = headerValue(options.headers, 'cookie');
  const query = options.query ?? {};

  try {
    if (method === 'GET' && (path.endsWith('/api/auth/google') || path.endsWith('/auth/google'))) {
      if (!service.isConfigured()) {
        return {
          status: 503,
          body: {
            error: 'NOT_CONFIGURED',
            message: 'Google OAuth is not configured',
          },
        };
      }
      const { redirectUrl } = await service.startGoogleLogin();
      return {
        status: 302,
        body: { redirectUrl },
        headers: { Location: redirectUrl },
      };
    }

    if (
      method === 'GET' &&
      (path.endsWith('/api/auth/callback') || path.endsWith('/auth/callback'))
    ) {
      const code = firstQueryValue(query.code);
      const state = firstQueryValue(query.state);
      const oauthError = firstQueryValue(query.error);
      const base = (options.env ?? process.env).AUTH_BASE_URL?.replace(/\/$/, '') || '/';
      if (oauthError || !code || !state) {
        return {
          status: 302,
          body: {},
          headers: { Location: `${base}/?auth=error` },
        };
      }
      const { setCookie } = await service.handleGoogleCallback(code, state);
      const user = await service.getMe(setCookie.split(';')[0]);
      const next =
        user.publicNickname != null && user.publicNickname !== ''
          ? `${base}/?auth=ok`
          : `${base}/?auth=claim`;
      return {
        status: 302,
        body: {},
        headers: { Location: next, 'Set-Cookie': setCookie },
      };
    }

    if (method === 'GET' && (path.endsWith('/api/auth/me') || path.endsWith('/auth/me'))) {
      const me = await service.getMe(cookie);
      return { status: 200, body: me as unknown as Record<string, unknown> };
    }

    if (method === 'POST' && (path.endsWith('/api/auth/logout') || path.endsWith('/auth/logout'))) {
      return {
        status: 200,
        body: { ok: true },
        headers: { 'Set-Cookie': service.logoutCookie() },
      };
    }

    if (
      method === 'POST' &&
      (path.endsWith('/api/auth/nickname') || path.endsWith('/auth/nickname'))
    ) {
      const nickname =
        options.body &&
        typeof options.body === 'object' &&
        options.body !== null &&
        'nickname' in options.body
          ? String((options.body as { nickname: unknown }).nickname ?? '')
          : '';
      const user = await service.claimNickname(cookie, nickname);
      return {
        status: 200,
        body: {
          authenticated: true,
          userId: user.userId,
          publicNickname: user.publicNickname,
          email: user.email,
          displayName: user.displayName,
          pictureUrl: user.pictureUrl,
        },
      };
    }

    if (method === 'POST' && (path.endsWith('/api/auth/merge') || path.endsWith('/auth/merge'))) {
      const sessions =
        options.body &&
        typeof options.body === 'object' &&
        options.body !== null &&
        'sessions' in options.body &&
        Array.isArray((options.body as { sessions: unknown }).sessions)
          ? ((options.body as { sessions: DesignSessionRecord[] }).sessions)
          : [];
      const result = await service.mergeGuestSessions(cookie, sessions);
      return { status: 200, body: result as unknown as Record<string, unknown> };
    }

    return {
      status: 404,
      body: { error: 'Not found', message: `Unknown auth route: ${path}` },
    };
  } catch (err) {
    return mapAuthError(err);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const action = typeof req.query?.action === 'string' ? req.query.action : undefined;
  let url = req.url ?? '/api/auth';
  if (action && !String(url).includes(`/auth/${action}`)) {
    url = `/api/auth/${action}`;
  }

  const result = await handleAuthRequest({
    method: req.method,
    url,
    query: req.query as Record<string, string | string[] | undefined>,
    headers: req.headers as Record<string, string | string[] | undefined>,
    body: req.body,
    env: process.env,
  });

  if (result.headers) {
    for (const [key, value] of Object.entries(result.headers)) {
      res.setHeader(key, value);
    }
  }
  if (result.status >= 300 && result.status < 400 && result.headers?.Location) {
    res.statusCode = result.status;
    res.end();
    return;
  }
  res.status(result.status).json(result.body);
}
