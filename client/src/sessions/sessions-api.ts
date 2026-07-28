import type {
  DesignSessionRecord,
  DesignSessionStatus,
  DesignSessionUpsertInput,
} from '@sdq/shared';
import {
  getLocalSession,
  listLocalSessions,
  LocalSessionsError,
  upsertLocalSession,
} from './local-sessions';

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
  /** Force localStorage persistence (Hobby / offline). */
  preferLocal?: boolean;
  storage?: Storage;
  now?: () => string;
  /** Non-blocking notice when falling back to local sessions (404/network). */
  onFallbackNotice?: () => void;
}

export interface ListSessionsQuery {
  nickname: string;
  status?: DesignSessionStatus;
}

/** Cached after first 404/405 so Hobby skips repeated failed remote calls. */
let remoteSessionsUnavailable = false;

export function resetSessionsRemoteAvailabilityForTests(): void {
  remoteSessionsUnavailable = false;
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

function shouldPreferLocal(options: SessionsApiOptions): boolean {
  if (options.preferLocal === true) {
    return true;
  }
  if (options.preferLocal === false) {
    return false;
  }
  if (remoteSessionsUnavailable) {
    return true;
  }
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SESSIONS_MODE === 'local') {
    return true;
  }
  return false;
}

function isRemoteSessionsMissing(response: Response): boolean {
  return response.status === 404 || response.status === 405;
}

function notifyFallback(options: SessionsApiOptions): void {
  try {
    options.onFallbackNotice?.();
  } catch {
    // Notice must never crash session flows
  }
}

function toApiErrorFromLocal(err: unknown): never {
  if (err instanceof LocalSessionsError) {
    const status = err.code === 'NOT_FOUND' ? 404 : 400;
    throw new SessionsApiError(err.message, status);
  }
  throw err;
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as { message?: string };
  return body.message ?? fallback;
}

/** Prefer the record with the newer ISO `updatedAt` (last-write-wins). */
export function pickNewerSession(
  a: DesignSessionRecord,
  b: DesignSessionRecord,
): DesignSessionRecord {
  return a.updatedAt >= b.updatedAt ? a : b;
}

/** Merge remote + local by id using LWW on `updatedAt`. */
export function mergeSessionsLww(
  remote: DesignSessionRecord[],
  local: DesignSessionRecord[],
): DesignSessionRecord[] {
  const byId = new Map<string, DesignSessionRecord>();
  for (const session of remote) {
    byId.set(session.id, session);
  }
  for (const session of local) {
    const existing = byId.get(session.id);
    byId.set(session.id, existing ? pickNewerSession(existing, session) : session);
  }
  return [...byId.values()];
}

function filterByStatus(
  sessions: DesignSessionRecord[],
  status?: DesignSessionStatus,
): DesignSessionRecord[] {
  if (status === undefined) {
    return sessions;
  }
  return sessions.filter((session) => session.status === status);
}

export async function upsertSession(
  input: DesignSessionUpsertInput,
  options: SessionsApiOptions = {},
): Promise<DesignSessionRecord> {
  if (shouldPreferLocal(options)) {
    try {
      return upsertLocalSession(input, { storage: options.storage, now: options.now });
    } catch (err) {
      return toApiErrorFromLocal(err);
    }
  }

  const fetchFn = options.fetchFn ?? fetch;
  const baseUrl = resolveBaseUrl(options.baseUrl);

  try {
    const response = await fetchFn(`${baseUrl}/api/sessions/${encodeURIComponent(input.id)}`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (isRemoteSessionsMissing(response)) {
      remoteSessionsUnavailable = true;
      notifyFallback(options);
      try {
        return upsertLocalSession(input, { storage: options.storage, now: options.now });
      } catch (err) {
        return toApiErrorFromLocal(err);
      }
    }

    if (!response.ok) {
      throw new SessionsApiError(
        await readErrorMessage(response, 'Session upsert failed'),
        response.status,
      );
    }

    const remote = (await response.json()) as DesignSessionRecord;
    try {
      const local = upsertLocalSession(input, {
        storage: options.storage,
        now: () => remote.updatedAt,
      });
      return pickNewerSession(remote, local);
    } catch {
      return remote;
    }
  } catch (err) {
    if (err instanceof SessionsApiError) {
      throw err;
    }
    remoteSessionsUnavailable = true;
    notifyFallback(options);
    try {
      return upsertLocalSession(input, { storage: options.storage, now: options.now });
    } catch (localErr) {
      return toApiErrorFromLocal(localErr);
    }
  }
}

export async function listSessions(
  query: ListSessionsQuery,
  options: SessionsApiOptions = {},
): Promise<DesignSessionRecord[]> {
  if (shouldPreferLocal(options)) {
    return listLocalSessions(query, { storage: options.storage });
  }

  const fetchFn = options.fetchFn ?? fetch;
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const params = new URLSearchParams({ nickname: query.nickname });
  if (query.status) {
    params.set('status', query.status);
  }

  try {
    const response = await fetchFn(`${baseUrl}/api/sessions?${params.toString()}`, {
      credentials: 'include',
    });

    if (isRemoteSessionsMissing(response)) {
      remoteSessionsUnavailable = true;
      notifyFallback(options);
      return listLocalSessions(query, { storage: options.storage });
    }

    if (!response.ok) {
      throw new SessionsApiError(
        await readErrorMessage(response, 'Session list failed'),
        response.status,
      );
    }

    const body = (await response.json()) as { sessions: DesignSessionRecord[] };
    const local = listLocalSessions(
      { nickname: query.nickname },
      { storage: options.storage },
    );
    // LWW across devices, then honor the requested status filter (remote may be stale).
    return filterByStatus(mergeSessionsLww(body.sessions, local), query.status);
  } catch (err) {
    if (err instanceof SessionsApiError) {
      throw err;
    }
    remoteSessionsUnavailable = true;
    notifyFallback(options);
    return listLocalSessions(query, { storage: options.storage });
  }
}

export async function getSession(
  id: string,
  options: SessionsApiOptions = {},
): Promise<DesignSessionRecord> {
  if (shouldPreferLocal(options)) {
    try {
      return getLocalSession(id, { storage: options.storage });
    } catch (err) {
      return toApiErrorFromLocal(err);
    }
  }

  const fetchFn = options.fetchFn ?? fetch;
  const baseUrl = resolveBaseUrl(options.baseUrl);

  try {
    const response = await fetchFn(`${baseUrl}/api/sessions/${encodeURIComponent(id)}`, {
      credentials: 'include',
    });

    if (isRemoteSessionsMissing(response)) {
      remoteSessionsUnavailable = true;
      notifyFallback(options);
      try {
        return getLocalSession(id, { storage: options.storage });
      } catch (err) {
        return toApiErrorFromLocal(err);
      }
    }

    if (!response.ok) {
      throw new SessionsApiError(
        await readErrorMessage(response, 'Session fetch failed'),
        response.status,
      );
    }

    const remote = (await response.json()) as DesignSessionRecord;
    try {
      const local = getLocalSession(id, { storage: options.storage });
      return pickNewerSession(remote, local);
    } catch {
      return remote;
    }
  } catch (err) {
    if (err instanceof SessionsApiError) {
      throw err;
    }
    remoteSessionsUnavailable = true;
    notifyFallback(options);
    try {
      return getLocalSession(id, { storage: options.storage });
    } catch (localErr) {
      return toApiErrorFromLocal(localErr);
    }
  }
}
