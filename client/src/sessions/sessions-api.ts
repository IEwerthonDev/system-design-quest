import type {
  DesignSessionRecord,
  DesignSessionStatus,
  DesignSessionUpsertInput,
} from '@sdq/shared';

export class SessionsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'SessionsApiError';
  }
}

export interface SessionsApiOptions {
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

export interface ListSessionsQuery {
  nickname: string;
  status?: DesignSessionStatus;
}

function resolveBaseUrl(baseUrl?: string): string {
  if (baseUrl !== undefined) {
    return baseUrl;
  }
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  return '';
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { message?: string };
  return body.message ?? fallback;
}

export async function upsertSession(
  input: DesignSessionUpsertInput,
  options: SessionsApiOptions = {},
): Promise<DesignSessionRecord> {
  const fetchFn = options.fetchFn ?? fetch;
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const response = await fetchFn(`${baseUrl}/api/sessions/${encodeURIComponent(input.id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new SessionsApiError(
      await readErrorMessage(response, 'Session upsert failed'),
      response.status,
    );
  }

  return (await response.json()) as DesignSessionRecord;
}

export async function listSessions(
  query: ListSessionsQuery,
  options: SessionsApiOptions = {},
): Promise<DesignSessionRecord[]> {
  const fetchFn = options.fetchFn ?? fetch;
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const params = new URLSearchParams({ nickname: query.nickname });
  if (query.status) {
    params.set('status', query.status);
  }
  const response = await fetchFn(`${baseUrl}/api/sessions?${params.toString()}`);

  if (!response.ok) {
    throw new SessionsApiError(
      await readErrorMessage(response, 'Session list failed'),
      response.status,
    );
  }

  const body = (await response.json()) as { sessions: DesignSessionRecord[] };
  return body.sessions;
}

export async function getSession(
  id: string,
  options: SessionsApiOptions = {},
): Promise<DesignSessionRecord> {
  const fetchFn = options.fetchFn ?? fetch;
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const response = await fetchFn(`${baseUrl}/api/sessions/${encodeURIComponent(id)}`);

  if (!response.ok) {
    throw new SessionsApiError(
      await readErrorMessage(response, 'Session fetch failed'),
      response.status,
    );
  }

  return (await response.json()) as DesignSessionRecord;
}
