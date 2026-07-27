import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ArchitectureGraph, DesignSessionRecord } from '@sdq/shared';
import { JsonFileSessionStore } from './json-file-store';

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

function tempStorePath(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sdq-sessions-'));
  return join(dir, 'sessions.json');
}

describe('JsonFileSessionStore', () => {
  it('persists data that survives a new store instance on the same path', () => {
    const filePath = tempStorePath();
    const first = new JsonFileSessionStore({ filePath });
    first.upsert(record({ id: 'persist-me', status: 'approved' }));

    const second = new JsonFileSessionStore({ filePath });
    expect(second.getById('persist-me')?.status).toBe('approved');
    expect(second.listByNickname('alice')).toHaveLength(1);
  });

  it('boots empty without throwing when JSON is corrupt', () => {
    const filePath = tempStorePath();
    writeFileSync(filePath, '{not-valid-json', 'utf8');

    expect(() => new JsonFileSessionStore({ filePath })).not.toThrow();
    const store = new JsonFileSessionStore({ filePath });
    expect(store.listByNickname('alice')).toHaveLength(0);
    expect(store.getById('anything')).toBeNull();
  });
});
