export type Difficulty = 'easy' | 'medium' | 'hard';

/** UI / problem narrative locale */
export type Locale = 'en' | 'pt-BR';

/** Hidden scoring guidance for the AI judge — not shown to the player */
export interface JudgeRubric {
  expectedComponents: string[];
  criticalPatterns: string[];
  commonMistakes: string[];
}

export interface EstimatedMinutes {
  study: number;
  speedrun: number;
}

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

/** Per-locale player-facing problem text (rubric stays language-agnostic). */
export interface ProblemCopy {
  title: string;
  description: string;
  constraints: string[];
  suggestedRequirements: SuggestedRequirements;
}

export interface Problem {
  id: string;
  /** Well-known company or product this problem is modeled after */
  company: string;
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
  /** Estimated completion time in minutes */
  estimatedMinutes: EstimatedMinutes;
  /** Hidden rubric for AI judge prompts (English / language-agnostic) */
  rubric: JudgeRubric;
  /** Badge "Recomendado" on the recommended learning track */
  isRecommended?: boolean;
  /** Player-facing copy for each supported locale */
  copy: Record<Locale, ProblemCopy>;
}

/** Catalog entry before bilingual copy is attached. */
export type ProblemDefinition = Omit<Problem, 'copy'>;
