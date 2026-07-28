import type { LeaderboardEntry, Verdict } from '@sdq/shared';
import { isQualifyingForLeaderboard } from '@sdq/shared';

export interface LeaderboardSubmitPayload {
  problemId: string;
  playerNickname: string;
  elapsedMs: number;
  score: number;
  verdict: Verdict;
}

export interface LeaderboardListResponse {
  problemId: string;
  entries: LeaderboardEntry[];
}

export class LeaderboardApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'LeaderboardApiError';
  }
}

export interface LeaderboardApiOptions {
  baseUrl?: string;
  fetchFn?: typeof fetch;
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

export async function submitLeaderboardScore(
  payload: LeaderboardSubmitPayload,
  options: LeaderboardApiOptions = {},
): Promise<LeaderboardEntry | null> {
  if (!isQualifyingForLeaderboard(payload.verdict, payload.score)) {
    return null;
  }

  const fetchFn = options.fetchFn ?? fetch;
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const response = await fetchFn(`${baseUrl}/api/leaderboard`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new LeaderboardApiError(body.message ?? 'Leaderboard submit failed', response.status);
  }

  return (await response.json()) as LeaderboardEntry;
}

export async function fetchLeaderboard(
  problemId: string,
  options: LeaderboardApiOptions = {},
): Promise<LeaderboardListResponse> {
  const fetchFn = options.fetchFn ?? fetch;
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const response = await fetchFn(`${baseUrl}/api/leaderboard/${encodeURIComponent(problemId)}`);

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new LeaderboardApiError(body.message ?? 'Leaderboard fetch failed', response.status);
  }

  return (await response.json()) as LeaderboardListResponse;
}
