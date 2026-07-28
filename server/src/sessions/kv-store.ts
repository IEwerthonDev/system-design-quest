import { createClient } from '@vercel/kv';
import type { DesignSessionRecord, DesignSessionStatus } from '@sdq/shared';
import type { SessionStore } from './store';

/** Minimal Redis/KV surface used by KvSessionStore (mockable in unit tests). */
export interface KvClient {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
  sadd(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
  srem(key: string, ...members: string[]): Promise<number>;
}

function sessionKey(id: string): string {
  return `sess:${id}`;
}

function nicknameIndexKey(nickname: string): string {
  return `sessidx:${nickname}`;
}

export class KvSessionStore implements SessionStore {
  private readonly trackedSessionIds = new Set<string>();
  private readonly trackedNicknames = new Set<string>();

  constructor(private readonly kv: KvClient) {}

  async upsert(record: DesignSessionRecord): Promise<DesignSessionRecord> {
    const copy = cloneRecord(record);
    const key = sessionKey(copy.id);
    const previous = await this.kv.get<DesignSessionRecord>(key);

    await this.kv.set(key, copy);
    await this.kv.sadd(nicknameIndexKey(copy.playerNickname), copy.id);
    this.trackedSessionIds.add(copy.id);
    this.trackedNicknames.add(copy.playerNickname);

    if (previous && previous.playerNickname !== copy.playerNickname) {
      await this.kv.srem(nicknameIndexKey(previous.playerNickname), copy.id);
    }

    return cloneRecord(copy);
  }

  async getById(id: string): Promise<DesignSessionRecord | null> {
    const found = await this.kv.get<DesignSessionRecord>(sessionKey(id));
    return found ? cloneRecord(found) : null;
  }

  async listByNickname(
    nickname: string,
    status?: DesignSessionStatus,
  ): Promise<DesignSessionRecord[]> {
    const ids = await this.kv.smembers(nicknameIndexKey(nickname));
    const records: DesignSessionRecord[] = [];
    for (const id of ids) {
      const session = await this.getById(id);
      if (!session || session.playerNickname !== nickname) {
        continue;
      }
      if (status !== undefined && session.status !== status) {
        continue;
      }
      records.push(session);
    }
    return records;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) {
      return;
    }
    await this.kv.del(sessionKey(id));
    await this.kv.srem(nicknameIndexKey(existing.playerNickname), id);
    this.trackedSessionIds.delete(id);
  }

  async reset(): Promise<void> {
    for (const id of [...this.trackedSessionIds]) {
      await this.delete(id);
    }
    for (const nickname of this.trackedNicknames) {
      await this.kv.del(nicknameIndexKey(nickname));
    }
    this.trackedSessionIds.clear();
    this.trackedNicknames.clear();
  }
}

export function createKvSessionStore(
  env: NodeJS.ProcessEnv = process.env,
  client?: KvClient,
): KvSessionStore {
  if (client) {
    return new KvSessionStore(client);
  }

  const url = env.KV_REST_API_URL;
  const token = env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error(
      'Vercel KV is not configured: set KV_REST_API_URL and KV_REST_API_TOKEN',
    );
  }

  const kv = createClient({ url, token });
  return new KvSessionStore(kv as unknown as KvClient);
}

function cloneRecord(record: DesignSessionRecord): DesignSessionRecord {
  return structuredClone(record);
}
