export type Difficulty = 'easy' | 'medium' | 'hard';

/** UI / problem narrative locale */
export type Locale = 'en' | 'pt-BR';

export type StructuralDepth = 'baseline' | 'deep';

export interface StructuralAntiPattern {
  code: string;
  /** If any of these types present, pattern does not fire */
  unlessAnyOf?: string[];
  /** Fire when none of requiredAnyOf are present (and graph non-empty) */
  requiredAnyOf?: string[];
  /** Fire when forbidden type present */
  forbiddenType?: string;
  severity: 'blocker' | 'major';
  messageKey: string;
}

export interface StructuralConfigRule {
  code: string;
  componentType: string;
  minHitRate?: number;
  minShardCount?: number;
  minTtlSeconds?: number;
  minPartitionCount?: number;
  minFanOutLimit?: number;
  requireMqDurability?: 'disk';
  severity: 'blocker' | 'major';
  messageKey: string;
}

/** Hidden scoring guidance for the AI judge — not shown to the player */
export interface JudgeRubric {
  expectedComponents: string[];
  criticalPatterns: string[];
  commonMistakes: string[];
  /** default baseline; core set forced to deep at runtime even if omitted */
  structuralDepth?: StructuralDepth;
  antiPatterns?: StructuralAntiPattern[];
  configRules?: StructuralConfigRule[];
  /** Explicit scale lines; if empty, engine derives from metrics */
  scaleChecklist?: { en: string[]; 'pt-BR': string[] };
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
