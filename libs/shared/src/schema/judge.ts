import type { ArchitectureGraph } from './architecture-graph';

export type Verdict = 'PASS' | 'PARTIAL' | 'FAIL';

export type GameMode = 'study' | 'speedrun';

export interface JudgeInput {
  problemId: string;
  requirements: {
    functional: string[];
    nonFunctional: string[];
  };
  graph: ArchitectureGraph;
  mode: GameMode;
}

export interface FeedbackItem {
  title: string;
  explanation: string;
  howToImprove: string;
  whyItMatters: string;
  severity?: 'blocker' | 'major' | 'minor';
  relatedComponents?: string[];
}

export interface ReqCoverageItem {
  requirement: string;
  type: 'functional' | 'nonFunctional';
  status: 'covered' | 'partial' | 'missing';
  explanation: string;
}

export interface JudgeDebate {
  rigorous: string;
  pragmatic: string;
  consensus: string;
}

export interface JudgeResult {
  verdict: Verdict;
  score: number;
  summary: string;
  nextStep: string;
  strengths: FeedbackItem[];
  criticalIssues: FeedbackItem[];
  improvements: FeedbackItem[];
  requirementCoverage: ReqCoverageItem[];
  judgeDebate: JudgeDebate;
}

/** Response from one judge role before consensus merge. */
export interface JudgePartialResult {
  score: number;
  strengths: FeedbackItem[];
  criticalIssues: FeedbackItem[];
  improvements: FeedbackItem[];
  requirementCoverage: ReqCoverageItem[];
  rationale: string;
}
