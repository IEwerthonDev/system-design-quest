import type { Verdict } from './judge';

export interface LeaderboardEntry {
  id: string;
  problemId: string;
  playerNickname: string;
  elapsedMs: number;
  score: number;
  verdict: 'PASS' | 'PARTIAL';
  createdAt: string;
}

export interface LeaderboardSubmitInput {
  problemId: string;
  playerNickname: string;
  elapsedMs: number;
  score: number;
  verdict: Verdict;
}

/** AD-016: ranking accepts PASS or PARTIAL with score ≥ 70. */
export function isQualifyingForLeaderboard(verdict: Verdict, score: number): boolean {
  return (verdict === 'PASS' || verdict === 'PARTIAL') && score >= 70;
}

export const LEADERBOARD_DEFAULT_LIMIT = 50;

export const NICKNAME_MIN_LENGTH = 3;
export const NICKNAME_MAX_LENGTH = 20;
const NICKNAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

export function isValidNickname(value: string): boolean {
  const trimmed = value.trim();
  return (
    trimmed.length >= NICKNAME_MIN_LENGTH &&
    trimmed.length <= NICKNAME_MAX_LENGTH &&
    NICKNAME_PATTERN.test(trimmed)
  );
}

export function normalizeNickname(value: string): string {
  return value.trim();
}
