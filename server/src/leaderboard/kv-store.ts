import { createClient } from '@vercel/kv';
import type { LeaderboardEntry } from '@sdq/shared';
import type { LeaderboardStore } from './store';

/** Minimal KV surface for leaderboard persistence (mockable in unit tests). */
export interface KvLeaderboardClient {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
}

function leaderboardKey(problemId: string): string {
  return `lb:${problemId}`;
}

/** True when `candidate` should replace `current` for the same nickname. */
export function isBetterLeaderboardEntry(
  candidate: LeaderboardEntry,
  current: LeaderboardEntry,
): boolean {
  if (candidate.elapsedMs !== current.elapsedMs) {
    return candidate.elapsedMs < current.elapsedMs;
  }
  return candidate.score > current.score;
}

function sortSpeedrun(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    if (a.elapsedMs !== b.elapsedMs) {
      return a.elapsedMs - b.elapsedMs;
    }
    return b.score - a.score;
  });
}

export class KvLeaderboardStore implements LeaderboardStore {
  private readonly trackedProblemIds = new Set<string>();

  constructor(private readonly kv: KvLeaderboardClient) {}

  async add(entry: LeaderboardEntry): Promise<void> {
    const key = leaderboardKey(entry.problemId);
    const existing = (await this.kv.get<LeaderboardEntry[]>(key)) ?? [];
    const copy = { ...entry };
    const idx = existing.findIndex(
      (item) => item.playerNickname === copy.playerNickname,
    );

    if (idx === -1) {
      existing.push(copy);
    } else {
      const current = existing[idx]!;
      if (isBetterLeaderboardEntry(copy, current)) {
        existing[idx] = copy;
      }
    }

    await this.kv.set(key, existing);
    this.trackedProblemIds.add(entry.problemId);
  }

  async listByProblem(problemId: string, limit: number): Promise<LeaderboardEntry[]> {
    const existing = (await this.kv.get<LeaderboardEntry[]>(leaderboardKey(problemId))) ?? [];
    return sortSpeedrun(existing)
      .slice(0, limit)
      .map((item) => ({ ...item }));
  }

  async reset(): Promise<void> {
    for (const problemId of this.trackedProblemIds) {
      await this.kv.del(leaderboardKey(problemId));
    }
    this.trackedProblemIds.clear();
  }
}

export function createKvLeaderboardStore(
  env: NodeJS.ProcessEnv = process.env,
  client?: KvLeaderboardClient,
): KvLeaderboardStore {
  if (client) {
    return new KvLeaderboardStore(client);
  }

  const url = env.KV_REST_API_URL;
  const token = env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error(
      'Vercel KV is not configured: set KV_REST_API_URL and KV_REST_API_TOKEN',
    );
  }

  const kv = createClient({ url, token });
  return new KvLeaderboardStore(kv as unknown as KvLeaderboardClient);
}
