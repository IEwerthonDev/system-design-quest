import { describe, expect, it, vi } from 'vitest';
import {
  AuthApiError,
  claimNickname,
  fetchMe,
  logout,
  mergeGuestSessions,
  startGoogleLogin,
} from './auth-api';

describe('auth-api', () => {
  it('fetchMe GETs /api/auth/me with credentials', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ authenticated: true, userId: 'u1', publicNickname: 'Hero' }),
    });

    const me = await fetchMe({ fetchFn, baseUrl: 'http://localhost:3000' });

    expect(me).toEqual({ authenticated: true, userId: 'u1', publicNickname: 'Hero' });
    expect(fetchFn).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/me',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    );
  });

  it('logout POSTs /api/auth/logout with credentials', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });

    await logout({ fetchFn, baseUrl: '' });

    expect(fetchFn).toHaveBeenCalledWith(
      '/api/auth/logout',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });

  it('claimNickname POSTs nickname with credentials', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ authenticated: true, userId: 'u1', publicNickname: 'Hero' }),
    });

    const me = await claimNickname('Hero', { fetchFn, baseUrl: 'http://localhost:3000' });

    expect(me.publicNickname).toBe('Hero');
    expect(fetchFn).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/nickname',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: 'Hero' }),
      }),
    );
  });

  it('mergeGuestSessions POSTs sessions with credentials', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ merged: 1, failed: [] }),
    });
    const sessions = [{ id: 's1' }] as never;

    const result = await mergeGuestSessions(sessions, { fetchFn, baseUrl: '' });

    expect(result).toEqual({ merged: 1, failed: [] });
    expect(fetchFn).toHaveBeenCalledWith(
      '/api/auth/merge',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ sessions }),
      }),
    );
  });

  it('startGoogleLogin assigns /api/auth/google', () => {
    const assignFn = vi.fn();
    startGoogleLogin(assignFn);
    expect(assignFn).toHaveBeenCalledWith('/api/auth/google');
  });

  it('throws AuthApiError on failed responses', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ message: 'Nickname already taken' }),
    });

    await expect(claimNickname('taken', { fetchFn, baseUrl: '' })).rejects.toMatchObject({
      name: 'AuthApiError',
      message: 'Nickname already taken',
      status: 409,
    });
    await expect(claimNickname('taken', { fetchFn, baseUrl: '' })).rejects.toBeInstanceOf(
      AuthApiError,
    );
  });
});
