import type { DesignSessionRecord, DesignSessionStatus } from '@sdq/shared';

export type MaybePromise<T> = T | Promise<T>;

export interface SessionStore {
  upsert(record: DesignSessionRecord): MaybePromise<DesignSessionRecord>;
  getById(id: string): MaybePromise<DesignSessionRecord | null>;
  listByNickname(
    nickname: string,
    status?: DesignSessionStatus,
  ): MaybePromise<DesignSessionRecord[]>;
  delete(id: string): MaybePromise<void>;
  reset(): MaybePromise<void>;
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
