import { beforeEach, describe, expect, it } from 'vitest';
import type { ArchitectureGraph, DesignSessionRecord } from '@sdq/shared';
import { InMemorySessionStore } from './store';

const emptyGraph: ArchitectureGraph = { nodes: [], edges: [] };

function record(overrides: Partial<DesignSessionRecord> = {}): DesignSessionRecord {
  return {
    id: 'sess-1',
    problemId: 'url-shortener',
    playerNickname: 'alice',
    status: 'in_progress',
    graph: emptyGraph,
    createdAt: '2026-07-27T10:00:00.000Z',
    updatedAt: '2026-07-27T10:00:00.000Z',
    ...overrides,
  };
}

describe('InMemorySessionStore', () => {
  let store: InMemorySessionStore;

  beforeEach(() => {
    store = new InMemorySessionStore();
  });

  it('upserts by id and getById returns the record', () => {
    const saved = store.upsert(record({ id: 'a', status: 'approved' }));
    expect(saved.id).toBe('a');
    expect(store.getById('a')?.status).toBe('approved');

    store.upsert(record({ id: 'a', status: 'rejected', updatedAt: '2026-07-27T11:00:00.000Z' }));
    expect(store.getById('a')?.status).toBe('rejected');
    expect(store.listByNickname('alice')).toHaveLength(1);
  });

  it('listByNickname filters by nickname and optional status', () => {
    store.upsert(record({ id: '1', playerNickname: 'alice', status: 'approved' }));
    store.upsert(record({ id: '2', playerNickname: 'alice', status: 'rejected' }));
    store.upsert(record({ id: '3', playerNickname: 'bob', status: 'approved' }));

    expect(store.listByNickname('alice')).toHaveLength(2);
    expect(store.listByNickname('alice', 'approved').map((s) => s.id)).toEqual(['1']);
    expect(store.listByNickname('bob')).toHaveLength(1);
  });

  it('delete removes a record; getById returns null for missing', () => {
    store.upsert(record({ id: 'gone' }));
    store.delete('gone');
    expect(store.getById('gone')).toBeNull();
  });

  it('reset clears all sessions', () => {
    store.upsert(record({ id: '1' }));
    store.upsert(record({ id: '2', playerNickname: 'bob' }));
    store.reset();
    expect(store.listByNickname('alice')).toHaveLength(0);
    expect(store.getById('1')).toBeNull();
  });
});
