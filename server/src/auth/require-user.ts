import { AuthError, createAuthService, type AuthService } from './service';
import { createKvUserStoreFromEnv } from './kv-user-store';
import type { AuthUser } from '@sdq/shared';

export function createAuthServiceFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  service?: AuthService,
): AuthService {
  if (service) {
    return service;
  }
  const users = createKvUserStoreFromEnv(env);
  return createAuthService({ users, env });
}

export async function requireAuthedUserWithNick(
  cookieHeader: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
  authService?: AuthService,
): Promise<
  | { ok: true; user: AuthUser }
  | { ok: false; status: number; body: Record<string, unknown> }
> {
  try {
    const service = createAuthServiceFromEnv(env, authService);
    const user = await service.requireUser(cookieHeader);
    if (!user.publicNickname) {
      return {
        ok: false,
        status: 401,
        body: {
          error: 'NICKNAME_REQUIRED',
          message: 'Claim a public nickname before using durable APIs',
        },
      };
    }
    return { ok: true, user };
  } catch (err) {
    if (err instanceof AuthError && err.code === 'UNAUTHORIZED') {
      return {
        ok: false,
        status: 401,
        body: { error: 'UNAUTHORIZED', message: 'Authentication required' },
      };
    }
    const message = err instanceof Error ? err.message : 'Auth unavailable';
    return {
      ok: false,
      status: 503,
      body: { error: 'Service unavailable', message },
    };
  }
}

export function cookieFromHeaders(
  headers?: Record<string, string | string[] | undefined>,
): string | undefined {
  if (!headers) return undefined;
  const raw = headers.cookie ?? headers.Cookie;
  if (Array.isArray(raw)) return raw[0];
  return raw;
}
