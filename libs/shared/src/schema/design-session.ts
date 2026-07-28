import type { ArchitectureGraph } from './architecture-graph';
import type { GameMode, JudgeResult, Verdict } from './judge';

export type DesignSessionStatus = 'approved' | 'rejected' | 'partial' | 'in_progress';

export interface DesignSessionRecord {
  id: string;
  problemId: string;
  playerNickname: string;
  /** Google subject when owned by an authenticated account (AD-026). */
  userId?: string;
  status: DesignSessionStatus;
  graph: ArchitectureGraph;
  requirements?: { functional: string[]; nonFunctional: string[] };
  judgeResult?: JudgeResult | null;
  score?: number;
  verdict?: Verdict | null;
  mode?: GameMode;
  createdAt: string;
  updatedAt: string;
}

export interface DesignSessionUpsertInput {
  id: string;
  problemId: string;
  playerNickname: string;
  userId?: string;
  status: DesignSessionStatus;
  graph: ArchitectureGraph;
  requirements?: DesignSessionRecord['requirements'];
  judgeResult?: JudgeResult | null;
  mode?: GameMode;
}

/** Cap of persisted design sessions per nickname (PP-06). */
export const SESSION_CAP_PER_NICKNAME = 50;

/** Map judge verdict to persisted session status (AD-016 / PP-06). */
export function verdictToSessionStatus(
  verdict: Verdict,
): Exclude<DesignSessionStatus, 'in_progress'> {
  if (verdict === 'PASS') {
    return 'approved';
  }
  if (verdict === 'PARTIAL') {
    return 'partial';
  }
  return 'rejected';
}
