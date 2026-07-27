export type {
  ArchitectureGraph,
  ComponentNode,
  ConnectionEdge,
} from './schema/architecture-graph';
export type { ComponentCategory, ComponentType, ComponentTypeMeta } from './schema/component-types';
export type { Difficulty, Problem } from './schema/problem';
export {
  getComponentMeta,
  getComponentsByCategory,
  getComponentsForTier,
  TIER_1_TYPES,
} from './catalog/component-catalog';
export type { CatalogTier } from './catalog/component-catalog';
export { validateGraph } from './validation/validate-graph';
export type { ValidationError, ValidationResult } from './validation/validate-graph';
