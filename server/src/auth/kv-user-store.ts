import type { AuthUser } from '@sdq/shared';
import { normalizeNickname } from '@sdq/shared';
import type { KvClient } from '../sessions/kv-store';

export interface AuthKvClient extends KvClient {
  set(
    key: string,
    value: unknown,
    opts?: { nx?: boolean; ex?: number },
  ): Promise<unknown>;
}

function userKey(userId: string): string {
  return `user:${userId}`;
}

function nickKey(nickname: string): string {
  return `nick:${normalizeNickname(nickname).toLowerCase()}`;
}

function oauthKey(state: string): string {
  return `oauth:${state}`;
}

export interface OAuthPending {
  codeVerifier: string;
  createdAt: string;
}

export class KvUserStore {
  constructor(private readonly kv: AuthKvClient) {}

  async getUser(userId: string): Promise<AuthUser | null> {
    return this.kv.get<AuthUser>(userKey(userId));
  }

  async upsertUser(user: AuthUser): Promise<AuthUser> {
    const copy = { ...user };
    await this.kv.set(userKey(copy.userId), copy);
    return copy;
  }

  async getUserIdByNickname(nickname: string): Promise<string | null> {
    return this.kv.get<string>(nickKey(nickname));
  }

  /**
   * Atomically claim nickname for userId. Returns false if taken by another user.
   * Allows re-claim of the same nick by the same user.
   */
  async claimNickname(userId: string, nickname: string): Promise<boolean> {
    const normalized = normalizeNickname(nickname);
    const key = nickKey(normalized);
    const existing = await this.kv.get<string>(key);
    if (existing && existing !== userId) {
      return false;
    }
    if (existing === userId) {
      const userSame = await this.getUser(userId);
      if (userSame && userSame.publicNickname !== normalized) {
        userSame.publicNickname = normalized;
        userSame.updatedAt = new Date().toISOString();
        await this.upsertUser(userSame);
      }
      return true;
    }
    const setResult = await this.kv.set(key, userId, { nx: true });
    // @vercel/kv returns null when NX fails
    if (setResult === null) {
      const again = await this.kv.get<string>(key);
      return again === userId;
    }
    const user = await this.getUser(userId);
    if (user) {
      const previous = user.publicNickname;
      user.publicNickname = normalized;
      user.updatedAt = new Date().toISOString();
      await this.upsertUser(user);
      if (previous && nickKey(previous) !== key) {
        await this.kv.del(nickKey(previous));
      }
    }
    return true;
  }

  async saveOAuthPending(state: string, pending: OAuthPending, ttlSec = 600): Promise<void> {
    await this.kv.set(oauthKey(state), pending, { ex: ttlSec });
  }

  async takeOAuthPending(state: string): Promise<OAuthPending | null> {
    const key = oauthKey(state);
    const pending = await this.kv.get<OAuthPending>(key);
    if (pending) {
      await this.kv.del(key);
    }
    return pending;
  }
}

export function createKvUserStoreFromEnv(env: NodeJS.ProcessEnv = process.env): KvUserStore {
  const url = env.KV_REST_API_URL;
  const token = env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error('Vercel KV is not configured: set KV_REST_API_URL and KV_REST_API_TOKEN');
  }
  // Lazy require to keep unit tests free of real client when injecting mocks
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@vercel/kv') as typeof import('@vercel/kv');
  const kv = createClient({ url, token }) as AuthKvClient;
  return new KvUserStore(kv);
}
