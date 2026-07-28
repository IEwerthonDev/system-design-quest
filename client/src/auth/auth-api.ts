import type { AuthMeResponse, DesignSessionRecord } from '@sdq/shared';

export class AuthApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}

export interface AuthApiOptions {
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

export interface MergeGuestSessionsResult {
  merged: number;
  failed: string[];
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
  const body = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
  return body.message ?? body.error ?? fallback;
}

export async function fetchMe(options: AuthApiOptions = {}): Promise<AuthMeResponse> {
  const fetchFn = options.fetchFn ?? fetch;
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const response = await fetchFn(`${baseUrl}/api/auth/me`, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new AuthApiError(await readErrorMessage(response, 'Auth me failed'), response.status);
  }

  return (await response.json()) as AuthMeResponse;
}

export async function logout(options: AuthApiOptions = {}): Promise<void> {
  const fetchFn = options.fetchFn ?? fetch;
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const response = await fetchFn(`${baseUrl}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new AuthApiError(await readErrorMessage(response, 'Logout failed'), response.status);
  }
}

export async function claimNickname(
  nickname: string,
  options: AuthApiOptions = {},
): Promise<AuthMeResponse> {
  const fetchFn = options.fetchFn ?? fetch;
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const response = await fetchFn(`${baseUrl}/api/auth/nickname`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname }),
  });

  if (!response.ok) {
    throw new AuthApiError(
      await readErrorMessage(response, 'Nickname claim failed'),
      response.status,
    );
  }

  return (await response.json()) as AuthMeResponse;
}

export async function mergeGuestSessions(
  sessions: DesignSessionRecord[],
  options: AuthApiOptions = {},
): Promise<MergeGuestSessionsResult> {
  const fetchFn = options.fetchFn ?? fetch;
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const response = await fetchFn(`${baseUrl}/api/auth/merge`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessions }),
  });

  if (!response.ok) {
    throw new AuthApiError(await readErrorMessage(response, 'Merge failed'), response.status);
  }

  return (await response.json()) as MergeGuestSessionsResult;
}

export function startGoogleLogin(
  assignFn: (url: string) => void = (url) => {
    window.location.assign(url);
  },
): void {
  assignFn('/api/auth/google');
}
