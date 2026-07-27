export type {
  ArchitectureGraph,
  ComponentNode,
  ConnectionEdge,
} from './schema/architecture-graph';
export type { ComponentCategory, ComponentType, ComponentTypeMeta } from './schema/component-types';
export type { Difficulty, Problem, ProblemMetrics, SuggestedRequirements } from './schema/problem';
export type {
  FeedbackItem,
  GameMode,
  JudgeDebate,
  JudgeInput,
  JudgePartialResult,
  JudgeResult,
  ReqCoverageItem,
  Verdict,
} from './schema/judge';
export { applyVerdictRules, isBlocker } from './judge/apply-verdict';
export { getProblem, listProblems, URL_SHORTENER, URL_SHORTENER_ID } from './problems/index';
export {
  getComponentMeta,
  getComponentsByCategory,
  getComponentsForTier,
  TIER_1_TYPES,
  TIER_2_TYPES,
} from './catalog/component-catalog';
export type { CatalogTier } from './catalog/component-catalog';
export { validateGraph } from './validation/validate-graph';
export type { ValidationError, ValidationResult } from './validation/validate-graph';
