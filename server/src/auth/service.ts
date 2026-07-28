import { createHash, randomBytes } from 'node:crypto';
import type { AuthMeResponse, AuthUser, DesignSessionRecord } from '@sdq/shared';
import { isValidNickname, normalizeNickname } from '@sdq/shared';
import type { KvUserStore } from './kv-user-store';
import {
  buildClearSessionCookieHeader,
  buildSessionCookieHeader,
  parseCookieHeader,
  signSessionToken,
  verifySessionToken,
} from './session-cookie';
import type { SessionStore } from '../sessions/store';

export interface GoogleTokenResponse {
  access_token: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
}

export interface GoogleUserInfo {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}

export interface AuthEnv {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  AUTH_SECRET?: string;
  AUTH_BASE_URL?: string;
}

export interface AuthServiceDeps {
  users: KvUserStore;
  sessions?: SessionStore;
  env: AuthEnv;
  fetchFn?: typeof fetch;
  now?: () => number;
  random?: () => string;
}

function requireEnv(env: AuthEnv): {
  clientId: string;
  clientSecret: string;
  authSecret: string;
  baseUrl: string;
} {
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  const authSecret = env.AUTH_SECRET?.trim();
  const baseUrl = (env.AUTH_BASE_URL ?? '').replace(/\/$/, '');
  if (!clientId || !clientSecret || !authSecret || !baseUrl) {
    throw new Error(
      'Auth is not configured: set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, AUTH_SECRET, AUTH_BASE_URL',
    );
  }
  return { clientId, clientSecret, authSecret, baseUrl };
}

function base64Url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function createPkcePair(random: () => string = defaultRandom): {
  verifier: string;
  challenge: string;
} {
  const verifier = random();
  const challenge = base64Url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function defaultRandom(): string {
  return base64Url(randomBytes(32));
}

export function createAuthService(deps: AuthServiceDeps) {
  const fetchFn = deps.fetchFn ?? fetch;
  const now = deps.now ?? Date.now;
  const random = deps.random ?? defaultRandom;

  return {
    isConfigured(): boolean {
      try {
        requireEnv(deps.env);
        return true;
      } catch {
        return false;
      }
    },

    async startGoogleLogin(): Promise<{ redirectUrl: string }> {
      const { clientId, baseUrl } = requireEnv(deps.env);
      const state = random();
      const { verifier, challenge } = createPkcePair(random);
      await deps.users.saveOAuthPending(state, {
        codeVerifier: verifier,
        createdAt: new Date(now()).toISOString(),
      });
      const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', `${baseUrl}/api/auth/callback`);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('scope', 'openid email profile');
      url.searchParams.set('state', state);
      url.searchParams.set('code_challenge', challenge);
      url.searchParams.set('code_challenge_method', 'S256');
      url.searchParams.set('access_type', 'online');
      url.searchParams.set('prompt', 'select_account');
      return { redirectUrl: url.toString() };
    },

    async handleGoogleCallback(
      code: string,
      state: string,
    ): Promise<{ user: AuthUser; setCookie: string }> {
      const { clientId, clientSecret, authSecret, baseUrl } = requireEnv(deps.env);
      const pending = await deps.users.takeOAuthPending(state);
      if (!pending) {
        throw new AuthError('INVALID_STATE', 'Invalid or expired OAuth state');
      }
      const tokenRes = await fetchFn('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: `${baseUrl}/api/auth/callback`,
          grant_type: 'authorization_code',
          code_verifier: pending.codeVerifier,
        }),
      });
      if (!tokenRes.ok) {
        throw new AuthError('TOKEN_EXCHANGE_FAILED', 'Google token exchange failed');
      }
      const tokens = (await tokenRes.json()) as GoogleTokenResponse;
      const infoRes = await fetchFn('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (!infoRes.ok) {
        throw new AuthError('USERINFO_FAILED', 'Google userinfo failed');
      }
      const info = (await infoRes.json()) as GoogleUserInfo;
      if (!info.sub) {
        throw new AuthError('USERINFO_FAILED', 'Google userinfo missing sub');
      }
      const existing = await deps.users.getUser(info.sub);
      const stamp = new Date(now()).toISOString();
      const user: AuthUser = {
        userId: info.sub,
        email: info.email,
        displayName: info.name,
        pictureUrl: info.picture,
        publicNickname: existing?.publicNickname,
        createdAt: existing?.createdAt ?? stamp,
        updatedAt: stamp,
      };
      await deps.users.upsertUser(user);
      const token = await signSessionToken(user.userId, authSecret, now());
      const secure = baseUrl.startsWith('https://');
      return {
        user,
        setCookie: buildSessionCookieHeader(token, { secure }),
      };
    },

    async getMe(cookieHeader: string | undefined): Promise<AuthMeResponse> {
      const authSecret = deps.env.AUTH_SECRET?.trim();
      if (!authSecret) {
        return { authenticated: false };
      }
      const raw = parseCookieHeader(cookieHeader);
      if (!raw) {
        return { authenticated: false };
      }
      const claims = await verifySessionToken(raw, authSecret);
      if (!claims) {
        return { authenticated: false };
      }
      const user = await deps.users.getUser(claims.userId);
      if (!user) {
        return { authenticated: false };
      }
      return {
        authenticated: true,
        userId: user.userId,
        email: user.email,
        displayName: user.displayName,
        pictureUrl: user.pictureUrl,
        publicNickname: user.publicNickname,
      };
    },

    async requireUser(cookieHeader: string | undefined): Promise<AuthUser> {
      const me = await this.getMe(cookieHeader);
      if (!me.authenticated || !me.userId) {
        throw new AuthError('UNAUTHORIZED', 'Authentication required');
      }
      const user = await deps.users.getUser(me.userId);
      if (!user) {
        throw new AuthError('UNAUTHORIZED', 'Authentication required');
      }
      return user;
    },

    logoutCookie(): string {
      const baseUrl = (deps.env.AUTH_BASE_URL ?? '').replace(/\/$/, '');
      const secure = baseUrl.startsWith('https://');
      return buildClearSessionCookieHeader({ secure });
    },

    async claimNickname(cookieHeader: string | undefined, nickname: string): Promise<AuthUser> {
      const user = await this.requireUser(cookieHeader);
      const normalized = normalizeNickname(nickname);
      if (!isValidNickname(normalized)) {
        throw new AuthError('INVALID_NICKNAME', 'Invalid nickname');
      }
      const ok = await deps.users.claimNickname(user.userId, normalized);
      if (!ok) {
        throw new AuthError('NICKNAME_TAKEN', 'Nickname already taken');
      }
      const updated = await deps.users.getUser(user.userId);
      if (!updated?.publicNickname) {
        throw new AuthError('NICKNAME_TAKEN', 'Nickname already taken');
      }
      return updated;
    },

    async mergeGuestSessions(
      cookieHeader: string | undefined,
      sessions: DesignSessionRecord[],
    ): Promise<{ merged: number; failed: string[] }> {
      const user = await this.requireUser(cookieHeader);
      if (!user.publicNickname) {
        throw new AuthError('NICKNAME_REQUIRED', 'Claim a nickname before merging');
      }
      if (!deps.sessions) {
        throw new AuthError('MERGE_UNAVAILABLE', 'Session store unavailable');
      }
      const failed: string[] = [];
      let merged = 0;
      for (const raw of sessions) {
        try {
          const existing = await deps.sessions.getById(raw.id);
          const incoming: DesignSessionRecord = {
            ...raw,
            userId: user.userId,
            playerNickname: user.publicNickname,
            updatedAt: raw.updatedAt || new Date(now()).toISOString(),
          };
          if (
            existing &&
            Date.parse(existing.updatedAt) > Date.parse(incoming.updatedAt)
          ) {
            // keep existing (LWW)
            merged += 1;
            continue;
          }
          await deps.sessions.upsert(incoming);
          merged += 1;
        } catch {
          failed.push(raw.id);
        }
      }
      return { merged, failed };
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;

export class AuthError extends Error {
  constructor(
    readonly code:
      | 'INVALID_STATE'
      | 'TOKEN_EXCHANGE_FAILED'
      | 'USERINFO_FAILED'
      | 'UNAUTHORIZED'
      | 'INVALID_NICKNAME'
      | 'NICKNAME_TAKEN'
      | 'NICKNAME_REQUIRED'
      | 'MERGE_UNAVAILABLE'
      | 'NOT_CONFIGURED',
    message: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
