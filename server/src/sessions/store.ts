import type { DesignSessionRecord, DesignSessionStatus } from '@sdq/shared';

export interface SessionStore {
  upsert(record: DesignSessionRecord): DesignSessionRecord;
  getById(id: string): DesignSessionRecord | null;
  listByNickname(nickname: string, status?: DesignSessionStatus): DesignSessionRecord[];
  delete(id: string): void;
  reset(): void;
}

export class InMemorySessionStore implements SessionStore {
  private byId = new Map<string, DesignSessionRecord>();

  upsert(record: DesignSessionRecord): DesignSessionRecord {
    const copy = { ...record, graph: structuredClone(record.graph) };
    this.byId.set(copy.id, copy);
    return { ...copy, graph: structuredClone(copy.graph) };
  }

  getById(id: string): DesignSessionRecord | null {
    const found = this.byId.get(id);
    if (!found) {
      return null;
    }
    return { ...found, graph: structuredClone(found.graph) };
  }

  listByNickname(nickname: string, status?: DesignSessionStatus): DesignSessionRecord[] {
    return [...this.byId.values()]
      .filter((session) => session.playerNickname === nickname)
      .filter((session) => (status === undefined ? true : session.status === status))
      .map((session) => ({ ...session, graph: structuredClone(session.graph) }));
  }

  delete(id: string): void {
    this.byId.delete(id);
  }

  reset(): void {
    this.byId.clear();
  }
}
