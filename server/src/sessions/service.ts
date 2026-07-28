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
import type { SessionStore } from './store';

const VALID_STATUSES: ReadonlySet<DesignSessionStatus> = new Set([
  'approved',
  'rejected',
  'partial',
  'in_progress',
]);

export interface UpsertSessionResult {
  ok: true;
  record: DesignSessionRecord;
}

export interface UpsertSessionError {
  ok: false;
  code: 'INVALID_NICKNAME' | 'INVALID_BODY';
  message: string;
}

export type UpsertSessionOutcome = UpsertSessionResult | UpsertSessionError;

export interface SessionService {
  upsert(input: DesignSessionUpsertInput, now?: () => string): Promise<UpsertSessionOutcome>;
  list(nickname: string, status?: DesignSessionStatus): Promise<DesignSessionRecord[]>;
  get(id: string): Promise<DesignSessionRecord | null>;
}

export function createSessionService(store: SessionStore): SessionService {
  return {
    async upsert(input, now = () => new Date().toISOString()) {
      const nickname = normalizeNickname(input.playerNickname);
      if (!isValidNickname(nickname)) {
        return {
          ok: false,
          code: 'INVALID_NICKNAME',
          message: 'playerNickname must be 3-20 characters (letters, numbers, _ or -)',
        };
      }

      if (typeof input.id !== 'string' || input.id.trim() === '') {
        return {
          ok: false,
          code: 'INVALID_BODY',
          message: 'id must be a non-empty string',
        };
      }

      if (typeof input.problemId !== 'string' || input.problemId.trim() === '') {
        return {
          ok: false,
          code: 'INVALID_BODY',
          message: 'problemId must be a non-empty string',
        };
      }

      if (!VALID_STATUSES.has(input.status)) {
        return {
          ok: false,
          code: 'INVALID_BODY',
          message: 'status must be approved, rejected, partial, or in_progress',
        };
      }

      if (!input.graph || typeof input.graph !== 'object' || !Array.isArray(input.graph.nodes)) {
        return {
          ok: false,
          code: 'INVALID_BODY',
          message: 'graph is required',
        };
      }

      const existing = await store.getById(input.id);
      const timestamp = now();
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

      await store.upsert(record);

      const forNick = await store.listByNickname(nickname);
      if (forNick.length > SESSION_CAP_PER_NICKNAME) {
        const others = forNick
          .filter((session) => session.id !== record.id)
          .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
        const excess = forNick.length - SESSION_CAP_PER_NICKNAME;
        for (let i = 0; i < excess; i += 1) {
          const victim = others[i];
          if (victim) {
            await store.delete(victim.id);
          }
        }
      }

      return { ok: true, record: (await store.getById(record.id))! };
    },

    async list(nickname, status) {
      return store.listByNickname(normalizeNickname(nickname), status);
    },

    async get(id) {
      return store.getById(id);
    },
  };
}
