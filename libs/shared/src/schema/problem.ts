export type Difficulty = 'easy' | 'medium' | 'hard';

export interface ProblemMetrics {
  /** Daily active users */
  dau?: number;
  /** Peak read requests per second (redirects, GET) */
  readRps?: number;
  /** Peak write requests per second (creates, POST) */
  writeRps?: number;
  /** Legacy aggregate RPS when read/write split is not modeled */
  rps?: number;
  /** Estimated storage footprint in gigabytes */
  storageGb?: number;
  /** Human-readable read/write ratio label (e.g. "100:1") */
  readWriteRatio?: string;
}

export interface SuggestedRequirements {
  functional: string[];
  nonFunctional: string[];
}

export interface Problem {
  id: string;
  title: string;
  difficulty: Difficulty;
  /** Narrative briefing shown before requirements phase */
  description: string;
  metrics: ProblemMetrics;
  constraints: string[];
  tags: string[];
  suggestedRequirements: SuggestedRequirements;
  /** True for the guided tutorial problem (URL Shortener only at launch) */
  isTutorial?: boolean;
  /** Order in the global recommended learning track */
  orderInTrack?: number;
}
