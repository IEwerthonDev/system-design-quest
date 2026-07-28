import type { ComponentType } from './component-types';

export interface Vec2 {
  x: number;
  y: number;
}

export type PartitioningStrategy = 'hash' | 'range' | 'geographic' | 'list';

export type PressureLevel = 'ok' | 'warn' | 'hot';

export type CacheEviction = 'lru' | 'lfu' | 'ttl';

export interface CacheConfig {
  kind: 'cache';
  hitRate: number;
  /** Eviction policy — interview signal for cache design */
  eviction: CacheEviction;
  /** Working-set / memory budget in GB */
  maxMemoryGb: number;
}

export interface CdnConfig {
  kind: 'cdn';
  hitRate: number;
  /** Cache TTL at the edge (seconds). Default 3600 via normalize. */
  ttlSeconds: number;
  /** Approximate edge PoP / region count */
  edgeRegions: number;
}

/** How the store is used in the design (CQRS / read replicas). */
export type AccessPattern = 'read' | 'write' | 'read_write';

/** Primary vs replica vs undifferentiated store. */
export type DbTopologyRole = 'primary' | 'replica' | 'standalone';

export type ConsistencyMode = 'strong' | 'eventual';

export interface SqlDbConfig {
  kind: 'sql_db';
  shardCount: number;
  partitioningStrategy: PartitioningStrategy;
  partitionKey?: string;
  keySkew: number;
  /** Defaults to read_write via normalizeGraph */
  accessPattern: AccessPattern;
  /** Defaults to primary via normalizeGraph */
  topologyRole: DbTopologyRole;
  /** Replica count for HA / read scale (1 = no extra replicas) */
  replicationFactor: number;
  consistency: ConsistencyMode;
}

export type NosqlModel = 'document' | 'kv' | 'wide_column';
export type NosqlConsistency = 'one' | 'quorum' | 'all';

export interface NosqlDbConfig {
  kind: 'nosql_db';
  accessPattern: AccessPattern;
  topologyRole: DbTopologyRole;
  model: NosqlModel;
  shardCount: number;
  consistency: NosqlConsistency;
}

export type MqDurability = 'memory' | 'disk';
export type DeliveryGuarantee = 'at_most_once' | 'at_least_once' | 'exactly_once';

export interface MqConfig {
  kind: 'mq';
  durability: MqDurability;
  partitionCount: number;
  delivery: DeliveryGuarantee;
}

export interface KafkaConfig {
  kind: 'kafka';
  durability: MqDurability;
  partitionCount: number;
  retentionHours: number;
  replicationFactor: number;
}

export interface WsConfig {
  kind: 'ws';
  fanOutLimit: number;
  stickySessions: boolean;
}

export type LbAlgorithm = 'round_robin' | 'least_conn' | 'ip_hash';

export interface LbConfig {
  kind: 'lb';
  algorithm: LbAlgorithm;
  healthCheck: boolean;
}

export type RateLimitAlgorithm = 'token_bucket' | 'sliding_window' | 'fixed_window';
export type RateLimitScope = 'ip' | 'user' | 'global';

export interface RateLimiterConfig {
  kind: 'rate_limiter';
  algorithm: RateLimitAlgorithm;
  limitPerSec: number;
  scope: RateLimitScope;
}

export interface ApiGatewayConfig {
  kind: 'api_gateway';
  authRequired: boolean;
  timeoutMs: number;
  retryMax: number;
}

export type StorageClass = 'hot' | 'cold';
export type StorageReplication = 'single_region' | 'multi_region';

export interface ObjectStorageConfig {
  kind: 'object_storage';
  storageClass: StorageClass;
  replication: StorageReplication;
}

export interface SearchConfig {
  kind: 'search';
  shardCount: number;
  replicaCount: number;
  refreshIntervalSec: number;
}

export type SessionStore = 'jwt' | 'redis' | 'sticky';

export interface AuthConfig {
  kind: 'auth';
  tokenTtlSec: number;
  mfa: boolean;
  sessionStore: SessionStore;
}

export interface ComputeConfig {
  kind: 'compute';
  stateless: boolean;
  maxRpsPerReplica: number;
}

export interface WorkerConfig {
  kind: 'worker';
  concurrency: number;
  dlq: boolean;
}

export type NotificationChannel = 'push' | 'email' | 'sms';

export interface NotificationConfig {
  kind: 'notification';
  channels: NotificationChannel[];
  dedupeWindowSec: number;
}

export type ComponentConfig =
  | CacheConfig
  | CdnConfig
  | SqlDbConfig
  | NosqlDbConfig
  | MqConfig
  | KafkaConfig
  | WsConfig
  | LbConfig
  | RateLimiterConfig
  | ApiGatewayConfig
  | ObjectStorageConfig
  | SearchConfig
  | AuthConfig
  | ComputeConfig
  | WorkerConfig
  | NotificationConfig;

export interface ComponentNode {
  id: string;
  type: ComponentType;
  label: string;
  /** @deprecated Prefer implementationNotes */
  note?: string;
  implementationNotes?: string;
  /** Defaults to 1 via normalizeGraph */
  replicas?: number;
  config?: ComponentConfig;
  /** z optional for legacy 3D graphs; blueprint uses x/y only */
  position: { x: number; y: number; z?: number };
}

export interface ConnectionEdge {
  id: string;
  from: string;
  to: string;
  direction: 'forward' | 'bidirectional';
  label?: string;
}

export interface SimulationSettings {
  running: boolean;
  speed: number;
  traffic: number;
  readRatio: number;
  /** Absolute ingress RPS (sandbox / advanced). When unset with read/write RPS, traffic drives load. */
  rps?: number;
  concurrentUsers?: number;
  readRps?: number;
  writeRps?: number;
  avgObjectKb?: number;
  avgResponseKb?: number;
  networkLatencyMs?: number;
  bandwidthMbps?: number;
  /** Target availability percent, e.g. 99.9 */
  targetAvailability?: number;
  /** Expected growth multiplier, e.g. 10 */
  growthFactor?: number;
  dailyDataGb?: number;
}

export type FindingCode =
  | 'SPOF'
  | 'MISSING_CACHE'
  | 'MISSING_MQ'
  | 'NO_LB'
  | 'SINGLE_PRIMARY'
  | 'CACHE_OFF_PATH'
  | 'CONSISTENCY_RISK'
  | 'BOTTLENECK'
  | 'OVERPROVISION'
  | 'HOT_PARTITION'
  | 'QUEUE_BACKLOG';

export type FindingSeverity = 'blocker' | 'major' | 'minor';

export interface ArchitectureFinding {
  code: FindingCode;
  severity: FindingSeverity;
  nodeIds: string[];
  reasonPt: string;
  reasonEn: string;
}

export interface ArchitectureGraph {
  nodes: ComponentNode[];
  edges: ConnectionEdge[];
  simulation?: SimulationSettings;
}
