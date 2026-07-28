import { beforeEach, describe, expect, it } from 'vitest';
import { SESSION_CAP_PER_NICKNAME, type ArchitectureGraph, type DesignSessionUpsertInput } from '@sdq/shared';
import { createSessionService } from './service';
import { InMemorySessionStore } from './store';

const emptyGraph: ArchitectureGraph = { nodes: [], edges: [] };

function upsertInput(overrides: Partial<DesignSessionUpsertInput> = {}): DesignSessionUpsertInput {
  return {
    id: 'sess-1',
    problemId: 'url-shortener',
    playerNickname: 'alice',
    status: 'in_progress',
    graph: emptyGraph,
    ...overrides,
  };
}

describe('createSessionService', () => {
  let store: InMemorySessionStore;
  let service: ReturnType<typeof createSessionService>;

  beforeEach(() => {
    store = new InMemorySessionStore();
    service = createSessionService(store);
  });

  it('rejects invalid nicknames', async () => {
    const result = await service.upsert(upsertInput({ playerNickname: 'ab' }));
    expect(result).toEqual({
      ok: false,
      code: 'INVALID_NICKNAME',
      message: 'playerNickname must be 3-20 characters (letters, numbers, _ or -)',
    });
  });

  it('re-upserting the same id does not inflate the count', async () => {
    const now = () => '2026-07-27T12:00:00.000Z';
    expect((await service.upsert(upsertInput({ id: 'same' }), now)).ok).toBe(true);
    expect((await service.upsert(upsertInput({ id: 'same', status: 'approved' }), now)).ok).toBe(
      true,
    );
    expect(await service.list('alice')).toHaveLength(1);
  });

  it('evicts the oldest other session when the 51st distinct id is upserted', async () => {
    for (let i = 0; i < SESSION_CAP_PER_NICKNAME; i += 1) {
      const ts = `2026-07-27T10:${String(i).padStart(2, '0')}:00.000Z`;
      const result = await service.upsert(
        upsertInput({ id: `sess-${i}` }),
        () => ts,
      );
      expect(result.ok).toBe(true);
    }

    expect(await service.list('alice')).toHaveLength(SESSION_CAP_PER_NICKNAME);

    const result = await service.upsert(
      upsertInput({ id: 'sess-newest' }),
      () => '2026-07-27T11:00:00.000Z',
    );
    expect(result.ok).toBe(true);
    const list = await service.list('alice');
    expect(list).toHaveLength(SESSION_CAP_PER_NICKNAME);
    expect(list.find((s) => s.id === 'sess-0')).toBeUndefined();
    expect(list.find((s) => s.id === 'sess-newest')).toBeDefined();
    expect(list.find((s) => s.id === 'sess-1')).toBeDefined();
  });
});
