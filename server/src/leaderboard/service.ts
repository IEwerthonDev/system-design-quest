import {
  isQualifyingForLeaderboard,
  LEADERBOARD_DEFAULT_LIMIT,
  normalizeNickname,
  type LeaderboardEntry,
  type LeaderboardSubmitInput,
  type Verdict,
} from '@sdq/shared';
import type { LeaderboardStore } from './store';

let entryCounter = 0;

export function resetLeaderboardEntryCounterForTests(): void {
  entryCounter = 0;
}

function nextEntryId(): string {
  entryCounter += 1;
  return `lb-${entryCounter}`;
}

export interface SubmitLeaderboardResult {
  ok: true;
  entry: LeaderboardEntry;
}

export interface SubmitLeaderboardError {
  ok: false;
  code: 'NOT_QUALIFYING' | 'INVALID_NICKNAME' | 'INVALID_ELAPSED';
  message: string;
}

export type SubmitLeaderboardOutcome = SubmitLeaderboardResult | SubmitLeaderboardError;

export interface LeaderboardService {
  submit(input: LeaderboardSubmitInput, now?: () => string): SubmitLeaderboardOutcome;
  list(problemId: string, limit?: number): LeaderboardEntry[];
}

export function createLeaderboardService(store: LeaderboardStore): LeaderboardService {
  return {
    submit(input, now = () => new Date().toISOString()) {
      const nickname = normalizeNickname(input.playerNickname);
      if (!/^[a-zA-Z0-9_-]{3,20}$/.test(nickname)) {
        return {
          ok: false,
          code: 'INVALID_NICKNAME',
          message: 'playerNickname must be 3-20 characters (letters, numbers, _ or -)',
        };
      }

      if (!Number.isFinite(input.elapsedMs) || input.elapsedMs < 0) {
        return {
          ok: false,
          code: 'INVALID_ELAPSED',
          message: 'elapsedMs must be a non-negative number',
        };
      }

      if (!isQualifyingForLeaderboard(input.verdict, input.score)) {
        return {
          ok: false,
          code: 'NOT_QUALIFYING',
          message: 'Only PASS or PARTIAL with score >= 70 qualify for the leaderboard',
        };
      }

      const verdict = input.verdict as 'PASS' | 'PARTIAL';
      const entry: LeaderboardEntry = {
        id: nextEntryId(),
        problemId: input.problemId,
        playerNickname: nickname,
        elapsedMs: Math.round(input.elapsedMs),
        score: input.score,
        verdict,
        createdAt: now(),
      };

      store.add(entry);
      return { ok: true, entry };
    },

    list(problemId, limit = LEADERBOARD_DEFAULT_LIMIT) {
      return store.listByProblem(problemId, limit);
    },
  };
}

export function assertQualifyingVerdict(verdict: Verdict): verdict is 'PASS' | 'PARTIAL' {
  return verdict === 'PASS' || verdict === 'PARTIAL';
}
