import type { ArchitectureFinding, ArchitectureGraph, FindingCode } from './architecture-graph';
import type { Locale } from './problem';

export type MentorAction = 'evaluate' | 'hint' | 'bottlenecks' | 'improve' | 'missing';

export const MENTOR_ACTIONS: readonly MentorAction[] = [
  'evaluate',
  'hint',
  'bottlenecks',
  'improve',
  'missing',
] as const;

export interface MentorInput {
  action: MentorAction;
  graph: ArchitectureGraph;
  findings?: ArchitectureFinding[];
  locale?: Locale;
}

export interface MentorResult {
  action: MentorAction;
  title: string;
  body: string;
  relatedFindings?: FindingCode[];
}
