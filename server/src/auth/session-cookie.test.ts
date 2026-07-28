import { describe, expect, it } from 'vitest';
import {
  buildClearSessionCookieHeader,
  buildSessionCookieHeader,
  parseCookieHeader,
  signSessionToken,
  verifySessionToken,
} from './session-cookie';

const SECRET = 'test-auth-secret-at-least-32-chars!!';

describe('session-cookie', () => {
  it('signs and verifies a session token', async () => {
    const token = await signSessionToken('google-sub-1', SECRET, Date.now());
    const claims = await verifySessionToken(token, SECRET);
    expect(claims).toEqual({ userId: 'google-sub-1' });
  });

  it('rejects tampered tokens', async () => {
    const token = await signSessionToken('u1', SECRET);
    expect(await verifySessionToken(`${token}x`, SECRET)).toBeNull();
  });

  it('rejects expired tokens', async () => {
    const token = await signSessionToken('u1', SECRET, 1_000_000_000_000, 1);
    expect(await verifySessionToken(token, SECRET)).toBeNull();
  });

  it('parses cookie header and builds set/clear headers', () => {
    const header = buildSessionCookieHeader('abc.def', { secure: true, maxAgeSec: 60 });
    expect(header).toContain('sdq_session=abc.def');
    expect(header).toContain('HttpOnly');
    expect(header).toContain('Secure');
    expect(parseCookieHeader(`foo=1; ${header.split(';')[0]}`)).toBe('abc.def');
    expect(buildClearSessionCookieHeader({ secure: false })).toContain('Max-Age=0');
  });
});
