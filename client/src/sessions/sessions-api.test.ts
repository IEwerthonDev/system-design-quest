import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DesignSessionRecord, DesignSessionUpsertInput } from '@sdq/shared';
import {
  getSession,
  listSessions,
  resetSessionsRemoteAvailabilityForTests,
  SessionsApiError,
  upsertSession,
} from './sessions-api';
import { resetLocalSessions, SESSIONS_STORAGE_KEY } from './local-sessions';

const sampleGraph = { nodes: [], edges: [] };

const sampleInput: DesignSessionUpsertInput = {
  id: 'sess-1',
  problemId: 'url-shortener',
  playerNickname: 'alice',
  status: 'approved',
  graph: sampleGraph,
};

const sampleRecord: DesignSessionRecord = {
  ...sampleInput,
  createdAt: '2026-07-27T12:00:00.000Z',
  updatedAt: '2026-07-27T12:00:00.000Z',
};

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => {
      map.delete(key);
    },
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

describe('sessions-api', () => {
  beforeEach(() => {
    resetSessionsRemoteAvailabilityForTests();
  });

  it('upsertSession PUTs to /api/sessions/:id', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleRecord,
    });

    const record = await upsertSession(sampleInput, {
      fetchFn,
      baseUrl: 'http://localhost:3000',
    });

    expect(record.id).toBe('sess-1');
    expect(record.status).toBe('approved');
    expect(fetchFn).toHaveBeenCalledWith(
      'http://localhost:3000/api/sessions/sess-1',
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleInput),
      }),
    );
  });

  it('listSessions GETs /api/sessions with nickname and optional status', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ sessions: [sampleRecord] }),
    });

    const listed = await listSessions(
      { nickname: 'alice', status: 'in_progress' },
      { fetchFn, baseUrl: 'http://localhost:3000' },
    );

    expect(listed).toHaveLength(1);
    expect(listed[0]?.playerNickname).toBe('alice');
    expect(fetchFn).toHaveBeenCalledWith(
      'http://localhost:3000/api/sessions?nickname=alice&status=in_progress',
    );
  });

  it('getSession GETs /api/sessions/:id', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sampleRecord,
    });

    const record = await getSession('sess-1', {
      fetchFn,
      baseUrl: 'http://localhost:3000',
    });

    expect(record.id).toBe('sess-1');
    expect(fetchFn).toHaveBeenCalledWith('http://localhost:3000/api/sessions/sess-1');
  });

  it('surfaces API errors via SessionsApiError', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: 'nickname is required' }),
    });

    await expect(
      listSessions({ nickname: '' }, { fetchFn, baseUrl: '' }),
    ).rejects.toMatchObject({
      name: 'SessionsApiError',
      message: 'nickname is required',
      status: 400,
    });
    await expect(listSessions({ nickname: '' }, { fetchFn, baseUrl: '' })).rejects.toBeInstanceOf(
      SessionsApiError,
    );
  });

  it('falls back to localStorage when remote sessions API is missing (Hobby 404)', async () => {
    const storage = memoryStorage();
    const fetchFn = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Not found' }),
    });

    const record = await upsertSession(sampleInput, {
      fetchFn,
      baseUrl: '',
      storage,
      now: () => '2026-07-27T12:00:00.000Z',
    });

    expect(record.id).toBe('sess-1');
    expect(record.status).toBe('approved');
    expect(storage.getItem(SESSIONS_STORAGE_KEY)).toContain('sess-1');

    const listed = await listSessions(
      { nickname: 'alice' },
      { fetchFn, baseUrl: '', storage },
    );
    expect(listed).toHaveLength(1);
    // Second call uses cached "remote unavailable" — no extra fetch
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('preferLocal skips remote fetch', async () => {
    const storage = memoryStorage();
    const fetchFn = vi.fn();

    const record = await upsertSession(sampleInput, {
      fetchFn,
      preferLocal: true,
      storage,
      now: () => '2026-07-27T15:00:00.000Z',
    });

    expect(fetchFn).not.toHaveBeenCalled();
    expect(record.updatedAt).toBe('2026-07-27T15:00:00.000Z');
    resetLocalSessions(storage);
  });
});
