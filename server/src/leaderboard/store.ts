import type { LeaderboardEntry } from '@sdq/shared';

export interface LeaderboardStore {
  add(entry: LeaderboardEntry): void;
  listByProblem(problemId: string, limit: number): LeaderboardEntry[];
  reset(): void;
}

export class InMemoryLeaderboardStore implements LeaderboardStore {
  private entries: LeaderboardEntry[] = [];

  add(entry: LeaderboardEntry): void {
    this.entries.push({ ...entry });
  }

  listByProblem(problemId: string, limit: number): LeaderboardEntry[] {
    return this.entries
      .filter((entry) => entry.problemId === problemId)
      .sort((a, b) => {
        if (a.elapsedMs !== b.elapsedMs) {
          return a.elapsedMs - b.elapsedMs;
        }
        return b.score - a.score;
      })
      .slice(0, limit);
  }

  reset(): void {
    this.entries = [];
  }
}
