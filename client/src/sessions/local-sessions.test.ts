import { describe, expect, it } from 'vitest';
import { SESSION_CAP_PER_NICKNAME, type DesignSessionUpsertInput } from '@sdq/shared';
import {
  listLocalSessions,
  resetLocalSessions,
  upsertLocalSession,
} from './local-sessions';

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

function upsertInput(overrides: Partial<DesignSessionUpsertInput> = {}): DesignSessionUpsertInput {
  return {
    id: 'sess-1',
    problemId: 'url-shortener',
    playerNickname: 'alice',
    status: 'in_progress',
    graph: { nodes: [], edges: [] },
    ...overrides,
  };
}

describe('local-sessions', () => {
  it('persists upserted sessions and lists by nickname', () => {
    const storage = memoryStorage();
    upsertLocalSession(upsertInput({ status: 'approved' }), {
      storage,
      now: () => '2026-07-27T12:00:00.000Z',
    });

    const listed = listLocalSessions({ nickname: 'alice', status: 'approved' }, { storage });
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe('sess-1');
    resetLocalSessions(storage);
  });

  it('evicts oldest sessions beyond the per-nickname cap', () => {
    const storage = memoryStorage();
    for (let i = 0; i < SESSION_CAP_PER_NICKNAME; i += 1) {
      upsertLocalSession(upsertInput({ id: `sess-${i}` }), {
        storage,
        now: () => `2026-07-27T10:${String(i).padStart(2, '0')}:00.000Z`,
      });
    }

    upsertLocalSession(upsertInput({ id: 'sess-newest' }), {
      storage,
      now: () => '2026-07-27T11:00:00.000Z',
    });

    const listed = listLocalSessions({ nickname: 'alice' }, { storage });
    expect(listed).toHaveLength(SESSION_CAP_PER_NICKNAME);
    expect(listed.some((session) => session.id === 'sess-0')).toBe(false);
    expect(listed.some((session) => session.id === 'sess-newest')).toBe(true);
    resetLocalSessions(storage);
  });
});
