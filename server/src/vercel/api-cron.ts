import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  createKvClient,
  createKvSessionStore,
  isSessionOlderThan,
  SESSION_MAX_AGE_DAYS,
  type KvClient,
  type KvSessionStore,
} from '../sessions/kv-store';

export const config = {
  maxDuration: 60,
};

export interface CronHttpResponse {
  status: number;
  body: Record<string, unknown>;
}

export interface HandleCronRequestOptions {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  env?: NodeJS.ProcessEnv;
  store?: KvSessionStore;
  kv?: KvClient;
  now?: () => number;
  fetchFn?: typeof fetch;
  warmUpUrl?: string;
}

function headerValue(
  headers: HandleCronRequestOptions['headers'],
  name: string,
): string | undefined {
  if (!headers) {
    return undefined;
  }
  const raw = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(raw)) {
    return raw[0];
  }
  return raw;
}

/** Authorize via `Authorization: Bearer CRON_SECRET`. */
export function authorizeCron(
  headers: HandleCronRequestOptions['headers'],
  env: NodeJS.ProcessEnv,
): boolean {
  const secret = env.CRON_SECRET;
  if (!secret || secret.trim() === '') {
    return false;
  }
  const auth = headerValue(headers, 'authorization') ?? headerValue(headers, 'Authorization');
  return auth === `Bearer ${secret}`;
}

export function dailyStatsKey(nowMs: number): string {
  const d = new Date(nowMs);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `stats:daily:${yyyy}-${mm}-${dd}`;
}

function resolveWarmUpUrl(options: HandleCronRequestOptions, env: NodeJS.ProcessEnv): string {
  if (options.warmUpUrl) {
    return options.warmUpUrl;
  }
  const vercelUrl = env.VERCEL_URL;
  if (vercelUrl) {
    const host = vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
    return `${host.replace(/\/$/, '')}/api/judge`;
  }
  return 'http://127.0.0.1:3000/api/judge';
}

/** Shared cron HTTP logic: cleanup, stats, judge warm-up. */
export async function handleCronRequest(
  options: HandleCronRequestOptions = {},
): Promise<CronHttpResponse> {
  const method = (options.method ?? 'GET').toUpperCase();
  const env = options.env ?? process.env;

  if (method !== 'GET' && method !== 'POST') {
    return {
      status: 405,
      body: { error: 'Method not allowed', message: 'Use GET or POST /api/cron' },
    };
  }

  if (!authorizeCron(options.headers, env)) {
    return {
      status: 401,
      body: { error: 'Unauthorized', message: 'Invalid or missing CRON_SECRET bearer token' },
    };
  }

  const nowMs = options.now?.() ?? Date.now();
  let kv = options.kv;
  let store = options.store;

  if (!store) {
    try {
      kv = kv ?? createKvClient(env);
      store = createKvSessionStore(env, kv);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'KV unavailable';
      return {
        status: 503,
        body: { error: 'Service unavailable', message },
      };
    }
  }

  const cleanup = await store.deleteOlderThan(nowMs, SESSION_MAX_AGE_DAYS);

  let statsWritten = false;
  let statsError: string | null = null;
  try {
    if (kv?.incr) {
      await kv.incr(dailyStatsKey(nowMs));
      statsWritten = true;
    }
  } catch (err) {
    // Aggregate errors must not fail the job (CRON-01).
    statsError = err instanceof Error ? err.message : 'stats failed';
  }

  const fetchFn = options.fetchFn ?? fetch;
  const warmUrl = resolveWarmUpUrl(options, env);
  let warmUpOk = false;
  let warmUpError: string | null = null;
  try {
    const response = await fetchFn(warmUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        problemId: 'url-shortener',
        requirements: { functional: [], nonFunctional: [] },
        graph: { nodes: [], edges: [] },
        mode: 'study',
        locale: 'pt-BR',
      }),
    });
    warmUpOk = response.ok || response.status < 500;
  } catch (err) {
    warmUpError = err instanceof Error ? err.message : 'warm-up failed';
  }

  return {
    status: 200,
    body: {
      ok: true,
      deleted: cleanup.deleted,
      scanned: cleanup.scanned,
      maxAgeDays: SESSION_MAX_AGE_DAYS,
      statsKey: dailyStatsKey(nowMs),
      statsWritten,
      statsError,
      warmUpOk,
      warmUpError,
    },
  };
}

export { isSessionOlderThan, SESSION_MAX_AGE_DAYS };

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const result = await handleCronRequest({
    method: req.method,
    headers: req.headers as Record<string, string | string[] | undefined>,
    env: process.env,
  });
  res.status(result.status).json(result.body);
}
