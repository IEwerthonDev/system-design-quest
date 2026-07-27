import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { DesignSessionRecord, DesignSessionStatus } from '@sdq/shared';
import type { SessionStore } from './store';

interface SessionsFilePayload {
  sessions: DesignSessionRecord[];
}

export interface JsonFileSessionStoreOptions {
  filePath: string;
}

export class JsonFileSessionStore implements SessionStore {
  private readonly filePath: string;
  private byId = new Map<string, DesignSessionRecord>();

  constructor(options: JsonFileSessionStoreOptions) {
    this.filePath = options.filePath;
    this.load();
  }

  private load(): void {
    try {
      const raw = readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as unknown;
      const sessions = extractSessions(parsed);
      this.byId = new Map(sessions.map((s) => [s.id, cloneRecord(s)]));
    } catch {
      this.byId = new Map();
    }
  }

  private persist(): void {
    const dir = dirname(this.filePath);
    mkdirSync(dir, { recursive: true });
    const payload: SessionsFilePayload = {
      sessions: [...this.byId.values()].map(cloneRecord),
    };
    const tmpPath = `${this.filePath}.${process.pid}.tmp`;
    writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf8');
    renameSync(tmpPath, this.filePath);
  }

  upsert(record: DesignSessionRecord): DesignSessionRecord {
    const copy = cloneRecord(record);
    this.byId.set(copy.id, copy);
    this.persist();
    return cloneRecord(copy);
  }

  getById(id: string): DesignSessionRecord | null {
    const found = this.byId.get(id);
    return found ? cloneRecord(found) : null;
  }

  listByNickname(nickname: string, status?: DesignSessionStatus): DesignSessionRecord[] {
    return [...this.byId.values()]
      .filter((session) => session.playerNickname === nickname)
      .filter((session) => (status === undefined ? true : session.status === status))
      .map(cloneRecord);
  }

  delete(id: string): void {
    if (!this.byId.has(id)) {
      return;
    }
    this.byId.delete(id);
    this.persist();
  }

  reset(): void {
    this.byId.clear();
    this.persist();
  }
}

function cloneRecord(record: DesignSessionRecord): DesignSessionRecord {
  return structuredClone(record);
}

function extractSessions(parsed: unknown): DesignSessionRecord[] {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('invalid payload');
  }
  const sessions = (parsed as SessionsFilePayload).sessions;
  if (!Array.isArray(sessions)) {
    throw new Error('invalid sessions');
  }
  return sessions as DesignSessionRecord[];
}
