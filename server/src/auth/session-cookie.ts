import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE_NAME = 'sdq_session';
export const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60; // 30 days

export interface SessionClaims {
  userId: string;
}

function secretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(
  userId: string,
  secret: string,
  nowMs: number = Date.now(),
  maxAgeSec: number = SESSION_MAX_AGE_SEC,
): Promise<string> {
  const exp = Math.floor(nowMs / 1000) + maxAgeSec;
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(Math.floor(nowMs / 1000))
    .setExpirationTime(exp)
    .sign(secretKey(secret));
}

export async function verifySessionToken(
  token: string,
  secret: string,
): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(secret));
    const userId = typeof payload.sub === 'string' ? payload.sub : null;
    if (!userId) {
      return null;
    }
    return { userId };
  } catch {
    return null;
  }
}

export function parseCookieHeader(
  cookieHeader: string | undefined,
  name: string = SESSION_COOKIE_NAME,
): string | null {
  if (!cookieHeader) {
    return null;
  }
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (rawKey === name) {
      return decodeURIComponent(rest.join('=') || '');
    }
  }
  return null;
}

export function buildSessionCookieHeader(
  token: string,
  options: { secure?: boolean; maxAgeSec?: number } = {},
): string {
  const maxAge = options.maxAgeSec ?? SESSION_MAX_AGE_SEC;
  const secure = options.secure ?? true;
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (secure) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function buildClearSessionCookieHeader(
  options: { secure?: boolean } = {},
): string {
  const secure = options.secure ?? true;
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (secure) {
    parts.push('Secure');
  }
  return parts.join('; ');
}
