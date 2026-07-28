export type {
  AccessPattern,
  ApiGatewayConfig,
  ArchitectureGraph,
  AuthConfig,
  CacheConfig,
  CacheEviction,
  CdnConfig,
  ComponentConfig,
  ComponentNode,
  ComputeConfig,
  ConnectionEdge,
  ConsistencyMode,
  DbTopologyRole,
  DeliveryGuarantee,
  KafkaConfig,
  LbAlgorithm,
  LbConfig,
  MqConfig,
  MqDurability,
  NosqlConsistency,
  NosqlDbConfig,
  NosqlModel,
  NotificationChannel,
  NotificationConfig,
  ObjectStorageConfig,
  PartitioningStrategy,
  PressureLevel,
  RateLimitAlgorithm,
  RateLimitScope,
  RateLimiterConfig,
  SearchConfig,
  SessionStore,
  SimulationSettings,
  SqlDbConfig,
  StorageClass,
  StorageReplication,
  Vec2,
  WorkerConfig,
  WsConfig,
} from './schema/architecture-graph';
export {
  DEFAULT_SIMULATION,
  DETAIL_BONUS_CAP,
  defaultConfigForType,
  normalizeGraph,
  normalizeNode,
  normalizeSimulation,
} from './schema/normalize-graph';
export { edgeReadWeight, evaluateSimulation } from './simulation/evaluate-simulation';
export type { SimulationEvaluation } from './simulation/evaluate-simulation';
export type { ComponentCategory, ComponentType, ComponentTypeMeta } from './schema/component-types';
export type {
  Difficulty,
  EstimatedMinutes,
  JudgeRubric,
  Locale,
  Problem,
  ProblemCopy,
  ProblemDefinition,
  ProblemMetrics,
  StructuralAntiPattern,
  StructuralConfigRule,
  StructuralDepth,
  SuggestedRequirements,
} from './schema/problem';
export { CORE_REALISM_IDS, isCoreRealismProblem } from './problems/structural-depth';
export type { CoreRealismId } from './problems/structural-depth';
export { attachBilingualCopy, localizeProblem } from './i18n/localize-problem';
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
export type { LeaderboardEntry, LeaderboardSubmitInput } from './schema/leaderboard';
export {
  isQualifyingForLeaderboard,
  isValidNickname,
  LEADERBOARD_DEFAULT_LIMIT,
  normalizeNickname,
  NICKNAME_MAX_LENGTH,
  NICKNAME_MIN_LENGTH,
} from './schema/leaderboard';
export type {
  AuthMeResponse,
  AuthMergeInput,
  AuthNicknameClaimInput,
  AuthUser,
} from './schema/auth';
export type {
  DesignSessionRecord,
  DesignSessionStatus,
  DesignSessionUpsertInput,
} from './schema/design-session';
export {
  SESSION_CAP_PER_NICKNAME,
  verdictToSessionStatus,
} from './schema/design-session';
export { applyVerdictRules, isBlocker } from './judge/apply-verdict';
export { evaluateStructuralRubric, computeDetailBonus } from './judge/evaluate-structural-rubric';
export type {
  EvaluateStructuralRubricInput,
  StructuralReport,
} from './judge/evaluate-structural-rubric';
export { getGoldenGraph } from './judge/golden-graphs';
export type { GoldenGraphTier } from './judge/golden-graphs';
export {
  countByDifficulty,
  filterProblems,
  getProblem,
  getRecommendedProblems,
  listProblems,
  listProblemsByDifficulty,
  URL_SHORTENER,
  URL_SHORTENER_ID,
} from './problems/index';
export type { ProblemFilter } from './problems/index';
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
