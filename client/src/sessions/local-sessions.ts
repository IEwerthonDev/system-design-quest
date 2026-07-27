import {
  isValidNickname,
  normalizeGraph,
  normalizeNickname,
  SESSION_CAP_PER_NICKNAME,
  verdictToSessionStatus,
  type DesignSessionRecord,
  type DesignSessionStatus,
  type DesignSessionUpsertInput,
} from '@sdq/shared';

export const SESSIONS_STORAGE_KEY = 'sdq-sessions';

export class LocalSessionsError extends Error {
  constructor(
    message: string,
    readonly code: 'INVALID_NICKNAME' | 'INVALID_BODY' | 'NOT_FOUND',
  ) {
    super(message);
    this.name = 'LocalSessionsError';
  }
}

interface SessionsPayload {
  sessions: DesignSessionRecord[];
}

function resolveStorage(storage?: Storage): Storage {
  if (storage) {
    return storage;
  }
  if (typeof localStorage === 'undefined') {
    throw new Error('localStorage is not available');
  }
  return localStorage;
}

function cloneRecord(record: DesignSessionRecord): DesignSessionRecord {
  return { ...record, graph: structuredClone(record.graph) };
}

export function loadLocalSessions(storage?: Storage): DesignSessionRecord[] {
  const raw = resolveStorage(storage).getItem(SESSIONS_STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as Partial<SessionsPayload>;
    if (!Array.isArray(parsed.sessions)) {
      return [];
    }
    return parsed.sessions.map(cloneRecord);
  } catch {
    return [];
  }
}

function saveLocalSessions(sessions: DesignSessionRecord[], storage?: Storage): void {
  const payload: SessionsPayload = { sessions: sessions.map(cloneRecord) };
  resolveStorage(storage).setItem(SESSIONS_STORAGE_KEY, JSON.stringify(payload));
}

export function upsertLocalSession(
  input: DesignSessionUpsertInput,
  options: { storage?: Storage; now?: () => string } = {},
): DesignSessionRecord {
  const nickname = normalizeNickname(input.playerNickname);
  if (!isValidNickname(nickname)) {
    throw new LocalSessionsError(
      'playerNickname must be 3-20 characters (letters, numbers, _ or -)',
      'INVALID_NICKNAME',
    );
  }

  if (typeof input.id !== 'string' || input.id.trim() === '') {
    throw new LocalSessionsError('id must be a non-empty string', 'INVALID_BODY');
  }

  if (typeof input.problemId !== 'string' || input.problemId.trim() === '') {
    throw new LocalSessionsError('problemId must be a non-empty string', 'INVALID_BODY');
  }

  const validStatuses: ReadonlySet<DesignSessionStatus> = new Set([
    'approved',
    'rejected',
    'partial',
    'in_progress',
  ]);
  if (!validStatuses.has(input.status)) {
    throw new LocalSessionsError(
      'status must be approved, rejected, partial, or in_progress',
      'INVALID_BODY',
    );
  }

  if (!input.graph || typeof input.graph !== 'object' || !Array.isArray(input.graph.nodes)) {
    throw new LocalSessionsError('graph is required', 'INVALID_BODY');
  }

  const now = options.now ?? (() => new Date().toISOString());
  const timestamp = now();
  const sessions = loadLocalSessions(options.storage);
  const existing = sessions.find((session) => session.id === input.id);

  let status = input.status;
  if (input.judgeResult?.verdict) {
    status = verdictToSessionStatus(input.judgeResult.verdict);
  }

  const record: DesignSessionRecord = {
    id: input.id,
    problemId: input.problemId,
    playerNickname: nickname,
    status,
    graph: normalizeGraph(input.graph),
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };

  if (input.requirements) {
    record.requirements = input.requirements;
  }
  if (input.judgeResult !== undefined) {
    record.judgeResult = input.judgeResult;
    record.verdict = input.judgeResult?.verdict ?? null;
    record.score = input.judgeResult?.score;
  }
  if (input.mode) {
    record.mode = input.mode;
  }

  const next = sessions.filter((session) => session.id !== record.id);
  next.push(cloneRecord(record));

  const forNick = next
    .filter((session) => session.playerNickname === nickname)
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  if (forNick.length > SESSION_CAP_PER_NICKNAME) {
    const excess = forNick.length - SESSION_CAP_PER_NICKNAME;
    const victims = new Set(forNick.slice(0, excess).map((session) => session.id));
    const pruned = next.filter((session) => !victims.has(session.id));
    saveLocalSessions(pruned, options.storage);
  } else {
    saveLocalSessions(next, options.storage);
  }

  const saved = loadLocalSessions(options.storage).find((session) => session.id === record.id);
  if (!saved) {
    throw new LocalSessionsError('Session upsert failed', 'INVALID_BODY');
  }
  return saved;
}

export function listLocalSessions(
  query: { nickname: string; status?: DesignSessionStatus },
  options: { storage?: Storage } = {},
): DesignSessionRecord[] {
  const nickname = normalizeNickname(query.nickname);
  return loadLocalSessions(options.storage)
    .filter((session) => session.playerNickname === nickname)
    .filter((session) => (query.status === undefined ? true : session.status === query.status))
    .map(cloneRecord)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getLocalSession(
  id: string,
  options: { storage?: Storage } = {},
): DesignSessionRecord {
  const found = loadLocalSessions(options.storage).find((session) => session.id === id);
  if (!found) {
    throw new LocalSessionsError(`Session not found: ${id}`, 'NOT_FOUND');
  }
  return cloneRecord(found);
}

export function resetLocalSessions(storage?: Storage): void {
  resolveStorage(storage).removeItem(SESSIONS_STORAGE_KEY);
}
