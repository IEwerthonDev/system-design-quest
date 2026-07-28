import type { ComponentType } from './component-types';
import type {
  AccessPattern,
  ArchitectureGraph,
  CacheEviction,
  ComponentConfig,
  ComponentNode,
  ConsistencyMode,
  DbTopologyRole,
  DeliveryGuarantee,
  LbAlgorithm,
  MqDurability,
  NosqlConsistency,
  NosqlModel,
  NotificationChannel,
  RateLimitAlgorithm,
  RateLimitScope,
  SessionStore,
  SimulationSettings,
  StorageClass,
  StorageReplication,
} from './architecture-graph';

export const DEFAULT_SIMULATION: SimulationSettings = {
  running: false,
  speed: 1,
  traffic: 1,
  readRatio: 80,
};

/** Maps traffic=1 → this many RPS when absolute workload fields are set. */
export const BASE_RPS = 200;

export const SANDBOX_PROBLEM_ID = '__sandbox__';

export function hasAbsoluteWorkload(sim: SimulationSettings): boolean {
  return (
    (sim.rps != null && sim.rps > 0) ||
    (sim.readRps != null && sim.readRps > 0) ||
    (sim.writeRps != null && sim.writeRps > 0)
  );
}

export function resolveIngressRps(sim: SimulationSettings): number {
  const read = sim.readRps ?? 0;
  const write = sim.writeRps ?? 0;
  if (read + write > 0) {
    return read + write;
  }
  if (sim.rps != null && sim.rps > 0) {
    return sim.rps;
  }
  return BASE_RPS * sim.traffic;
}

export const DEFAULT_CDN_TTL_SECONDS = 3600;
export const DEFAULT_MQ_PARTITION_COUNT = 3;
export const DEFAULT_WS_FAN_OUT = 10_000;
export const DEFAULT_CACHE_MEMORY_GB = 4;
export const DEFAULT_KAFKA_RETENTION_HOURS = 168;
export const DETAIL_BONUS_CAP = 15;

const LB_ALGORITHMS: readonly LbAlgorithm[] = ['round_robin', 'least_conn', 'ip_hash'];
const MQ_DURABILITIES: readonly MqDurability[] = ['memory', 'disk'];
const ACCESS_PATTERNS: readonly AccessPattern[] = ['read', 'write', 'read_write'];
const DB_TOPOLOGY_ROLES: readonly DbTopologyRole[] = ['primary', 'replica', 'standalone'];
const CACHE_EVICTIONS: readonly CacheEviction[] = ['lru', 'lfu', 'ttl'];
const CONSISTENCY_MODES: readonly ConsistencyMode[] = ['strong', 'eventual'];
const NOSQL_MODELS: readonly NosqlModel[] = ['document', 'kv', 'wide_column'];
const NOSQL_CONSISTENCY: readonly NosqlConsistency[] = ['one', 'quorum', 'all'];
const DELIVERIES: readonly DeliveryGuarantee[] = [
  'at_most_once',
  'at_least_once',
  'exactly_once',
];
const RATE_ALGOS: readonly RateLimitAlgorithm[] = [
  'token_bucket',
  'sliding_window',
  'fixed_window',
];
const RATE_SCOPES: readonly RateLimitScope[] = ['ip', 'user', 'global'];
const STORAGE_CLASSES: readonly StorageClass[] = ['hot', 'cold'];
const STORAGE_REPLICATION: readonly StorageReplication[] = ['single_region', 'multi_region'];
const SESSION_STORES: readonly SessionStore[] = ['jwt', 'redis', 'sticky'];
const NOTIF_CHANNELS: readonly NotificationChannel[] = ['push', 'email', 'sms'];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function resolveAccessPattern(value: unknown): AccessPattern {
  return pick(value, ACCESS_PATTERNS, 'read_write');
}

function resolveTopologyRole(value: unknown): DbTopologyRole {
  return pick(value, DB_TOPOLOGY_ROLES, 'primary');
}

function asRecord(config: ComponentConfig): Record<string, unknown> {
  return config as unknown as Record<string, unknown>;
}

function normalizeChannels(value: unknown): NotificationChannel[] {
  if (!Array.isArray(value) || value.length === 0) {
    return ['push'];
  }
  const next = value.filter(
    (c): c is NotificationChannel =>
      typeof c === 'string' && (NOTIF_CHANNELS as readonly string[]).includes(c),
  );
  return next.length > 0 ? next : ['push'];
}

export function defaultConfigForType(type: ComponentType): ComponentConfig | undefined {
  if (type === 'cache_redis') {
    return {
      kind: 'cache',
      hitRate: 90,
      eviction: 'lru',
      maxMemoryGb: DEFAULT_CACHE_MEMORY_GB,
    };
  }
  if (type === 'cdn') {
    return {
      kind: 'cdn',
      hitRate: 99,
      ttlSeconds: DEFAULT_CDN_TTL_SECONDS,
      edgeRegions: 8,
    };
  }
  if (type === 'sql_db') {
    return {
      kind: 'sql_db',
      shardCount: 1,
      partitioningStrategy: 'hash',
      keySkew: 0,
      accessPattern: 'read_write',
      topologyRole: 'primary',
      replicationFactor: 1,
      consistency: 'strong',
    };
  }
  if (type === 'nosql_db') {
    return {
      kind: 'nosql_db',
      accessPattern: 'read_write',
      topologyRole: 'primary',
      model: 'document',
      shardCount: 1,
      consistency: 'quorum',
    };
  }
  if (type === 'kafka') {
    return {
      kind: 'kafka',
      durability: 'disk',
      partitionCount: DEFAULT_MQ_PARTITION_COUNT,
      retentionHours: DEFAULT_KAFKA_RETENTION_HOURS,
      replicationFactor: 3,
    };
  }
  if (type === 'message_queue' || type === 'pub_sub') {
    return {
      kind: 'mq',
      durability: 'disk',
      partitionCount: DEFAULT_MQ_PARTITION_COUNT,
      delivery: 'at_least_once',
    };
  }
  if (type === 'websocket_gateway') {
    return { kind: 'ws', fanOutLimit: DEFAULT_WS_FAN_OUT, stickySessions: true };
  }
  if (type === 'load_balancer') {
    return { kind: 'lb', algorithm: 'round_robin', healthCheck: true };
  }
  if (type === 'rate_limiter') {
    return {
      kind: 'rate_limiter',
      algorithm: 'token_bucket',
      limitPerSec: 100,
      scope: 'user',
    };
  }
  if (type === 'api_gateway') {
    return {
      kind: 'api_gateway',
      authRequired: true,
      timeoutMs: 3000,
      retryMax: 1,
    };
  }
  if (type === 'object_storage') {
    return {
      kind: 'object_storage',
      storageClass: 'hot',
      replication: 'multi_region',
    };
  }
  if (type === 'search_engine') {
    return {
      kind: 'search',
      shardCount: 3,
      replicaCount: 1,
      refreshIntervalSec: 1,
    };
  }
  if (type === 'auth_service') {
    return {
      kind: 'auth',
      tokenTtlSec: 3600,
      mfa: false,
      sessionStore: 'jwt',
    };
  }
  if (type === 'app_server' || type === 'microservice') {
    return {
      kind: 'compute',
      stateless: true,
      maxRpsPerReplica: 200,
    };
  }
  if (type === 'worker') {
    return { kind: 'worker', concurrency: 4, dlq: true };
  }
  if (type === 'notification') {
    return {
      kind: 'notification',
      channels: ['push', 'email'],
      dedupeWindowSec: 60,
    };
  }
  return undefined;
}

function normalizeConfig(node: ComponentNode): ComponentConfig | undefined {
  const fallback = defaultConfigForType(node.type);
  const raw = node.config;
  if (!raw) {
    return fallback;
  }

  // Migrate legacy kafka nodes that still carry mq kind
  if (node.type === 'kafka' && raw.kind === 'mq') {
    const mq = raw;
    return {
      kind: 'kafka',
      durability: pick(mq.durability, MQ_DURABILITIES, 'disk'),
      partitionCount: clamp(Math.round(mq.partitionCount), 1, 256),
      retentionHours: DEFAULT_KAFKA_RETENTION_HOURS,
      replicationFactor: 3,
    };
  }

  if (raw.kind === 'cache') {
    const r = asRecord(raw);
    return {
      kind: 'cache',
      hitRate: clamp(raw.hitRate, 0, 100),
      eviction: pick(r.eviction, CACHE_EVICTIONS, 'lru'),
      maxMemoryGb: clamp(
        Math.round(typeof r.maxMemoryGb === 'number' ? r.maxMemoryGb : DEFAULT_CACHE_MEMORY_GB),
        1,
        1024,
      ),
    };
  }

  if (raw.kind === 'cdn') {
    const r = asRecord(raw);
    const ttlRaw =
      typeof r.ttlSeconds === 'number' ? r.ttlSeconds : DEFAULT_CDN_TTL_SECONDS;
    return {
      kind: 'cdn',
      hitRate: clamp(raw.hitRate, 0, 100),
      ttlSeconds: clamp(Math.round(ttlRaw), 1, 86_400),
      edgeRegions: clamp(
        Math.round(typeof r.edgeRegions === 'number' ? r.edgeRegions : 8),
        1,
        200,
      ),
    };
  }

  if (raw.kind === 'sql_db') {
    const r = asRecord(raw);
    return {
      kind: 'sql_db',
      shardCount: clamp(Math.round(raw.shardCount), 1, 256),
      partitioningStrategy: raw.partitioningStrategy,
      partitionKey: raw.partitionKey,
      keySkew: clamp(raw.keySkew, 0, 100),
      accessPattern: resolveAccessPattern(r.accessPattern),
      topologyRole: resolveTopologyRole(r.topologyRole),
      replicationFactor: clamp(
        Math.round(typeof r.replicationFactor === 'number' ? r.replicationFactor : 1),
        1,
        9,
      ),
      consistency: pick(r.consistency, CONSISTENCY_MODES, 'strong'),
    };
  }

  if (raw.kind === 'nosql_db') {
    const r = asRecord(raw);
    return {
      kind: 'nosql_db',
      accessPattern: resolveAccessPattern(r.accessPattern),
      topologyRole: resolveTopologyRole(r.topologyRole),
      model: pick(r.model, NOSQL_MODELS, 'document'),
      shardCount: clamp(Math.round(typeof r.shardCount === 'number' ? r.shardCount : 1), 1, 256),
      consistency: pick(r.consistency, NOSQL_CONSISTENCY, 'quorum'),
    };
  }

  if (raw.kind === 'mq') {
    const r = asRecord(raw);
    return {
      kind: 'mq',
      durability: pick(raw.durability, MQ_DURABILITIES, 'disk'),
      partitionCount: clamp(Math.round(raw.partitionCount), 1, 256),
      delivery: pick(r.delivery, DELIVERIES, 'at_least_once'),
    };
  }

  if (raw.kind === 'kafka') {
    return {
      kind: 'kafka',
      durability: pick(raw.durability, MQ_DURABILITIES, 'disk'),
      partitionCount: clamp(Math.round(raw.partitionCount), 1, 256),
      retentionHours: clamp(Math.round(raw.retentionHours), 1, 8760),
      replicationFactor: clamp(Math.round(raw.replicationFactor), 1, 9),
    };
  }

  if (raw.kind === 'ws') {
    const r = asRecord(raw);
    return {
      kind: 'ws',
      fanOutLimit: clamp(Math.round(raw.fanOutLimit), 1, 1_000_000),
      stickySessions: typeof r.stickySessions === 'boolean' ? r.stickySessions : true,
    };
  }

  if (raw.kind === 'lb') {
    const r = asRecord(raw);
    return {
      kind: 'lb',
      algorithm: pick(raw.algorithm, LB_ALGORITHMS, 'round_robin'),
      healthCheck: typeof r.healthCheck === 'boolean' ? r.healthCheck : true,
    };
  }

  if (raw.kind === 'rate_limiter') {
    return {
      kind: 'rate_limiter',
      algorithm: pick(raw.algorithm, RATE_ALGOS, 'token_bucket'),
      limitPerSec: clamp(Math.round(raw.limitPerSec), 1, 1_000_000),
      scope: pick(raw.scope, RATE_SCOPES, 'user'),
    };
  }

  if (raw.kind === 'api_gateway') {
    return {
      kind: 'api_gateway',
      authRequired: Boolean(raw.authRequired),
      timeoutMs: clamp(Math.round(raw.timeoutMs), 50, 120_000),
      retryMax: clamp(Math.round(raw.retryMax), 0, 10),
    };
  }

  if (raw.kind === 'object_storage') {
    return {
      kind: 'object_storage',
      storageClass: pick(raw.storageClass, STORAGE_CLASSES, 'hot'),
      replication: pick(raw.replication, STORAGE_REPLICATION, 'multi_region'),
    };
  }

  if (raw.kind === 'search') {
    return {
      kind: 'search',
      shardCount: clamp(Math.round(raw.shardCount), 1, 256),
      replicaCount: clamp(Math.round(raw.replicaCount), 0, 9),
      refreshIntervalSec: clamp(Math.round(raw.refreshIntervalSec), 1, 3600),
    };
  }

  if (raw.kind === 'auth') {
    return {
      kind: 'auth',
      tokenTtlSec: clamp(Math.round(raw.tokenTtlSec), 60, 604_800),
      mfa: Boolean(raw.mfa),
      sessionStore: pick(raw.sessionStore, SESSION_STORES, 'jwt'),
    };
  }

  if (raw.kind === 'compute') {
    return {
      kind: 'compute',
      stateless: Boolean(raw.stateless),
      maxRpsPerReplica: clamp(Math.round(raw.maxRpsPerReplica), 1, 100_000),
    };
  }

  if (raw.kind === 'worker') {
    return {
      kind: 'worker',
      concurrency: clamp(Math.round(raw.concurrency), 1, 10_000),
      dlq: Boolean(raw.dlq),
    };
  }

  if (raw.kind === 'notification') {
    return {
      kind: 'notification',
      channels: normalizeChannels(raw.channels),
      dedupeWindowSec: clamp(Math.round(raw.dedupeWindowSec), 0, 86_400),
    };
  }

  return fallback;
}

export function normalizeNode(node: ComponentNode): ComponentNode {
  const notes = node.implementationNotes ?? node.note;
  const config = normalizeConfig(node);
  const normalized: ComponentNode = {
    id: node.id,
    type: node.type,
    label: node.label,
    replicas: clamp(Math.round(node.replicas ?? 1), 1, 10_000),
    position: {
      x: node.position.x,
      y: node.position.y,
      ...(node.position.z !== undefined ? { z: node.position.z } : {}),
    },
  };

  if (notes !== undefined && notes.length > 0) {
    normalized.implementationNotes = notes;
  }
  if (config) {
    normalized.config = config;
  }

  return normalized;
}

function optionalPositive(value: unknown, max: number): number | undefined {
  if (value == null || value === '') {
    return undefined;
  }
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return undefined;
  }
  return clamp(n, 0, max);
}

export function normalizeSimulation(
  simulation?: Partial<SimulationSettings> | null,
): SimulationSettings {
  const readRps = optionalPositive(simulation?.readRps, 10_000_000);
  const writeRps = optionalPositive(simulation?.writeRps, 10_000_000);
  let readRatio = clamp(simulation?.readRatio ?? DEFAULT_SIMULATION.readRatio, 0, 100);
  if ((readRps ?? 0) + (writeRps ?? 0) > 0) {
    const total = (readRps ?? 0) + (writeRps ?? 0);
    readRatio = clamp(Math.round((100 * (readRps ?? 0)) / total), 0, 100);
  }

  const result: SimulationSettings = {
    running: Boolean(simulation?.running),
    speed: clamp(simulation?.speed ?? DEFAULT_SIMULATION.speed, 1, 5),
    traffic: clamp(simulation?.traffic ?? DEFAULT_SIMULATION.traffic, 1, 5),
    readRatio,
  };

  const rps = optionalPositive(simulation?.rps, 10_000_000);
  if (rps != null) result.rps = rps;
  const concurrentUsers = optionalPositive(simulation?.concurrentUsers, 100_000_000);
  if (concurrentUsers != null) result.concurrentUsers = concurrentUsers;
  if (readRps != null) result.readRps = readRps;
  if (writeRps != null) result.writeRps = writeRps;
  const avgObjectKb = optionalPositive(simulation?.avgObjectKb, 1_000_000);
  if (avgObjectKb != null) result.avgObjectKb = avgObjectKb;
  const avgResponseKb = optionalPositive(simulation?.avgResponseKb, 1_000_000);
  if (avgResponseKb != null) result.avgResponseKb = avgResponseKb;
  const networkLatencyMs = optionalPositive(simulation?.networkLatencyMs, 60_000);
  if (networkLatencyMs != null) result.networkLatencyMs = networkLatencyMs;
  const bandwidthMbps = optionalPositive(simulation?.bandwidthMbps, 1_000_000);
  if (bandwidthMbps != null) result.bandwidthMbps = bandwidthMbps;
  const targetAvailability = optionalPositive(simulation?.targetAvailability, 100);
  if (targetAvailability != null) result.targetAvailability = targetAvailability;
  const growthFactor = optionalPositive(simulation?.growthFactor, 10_000);
  if (growthFactor != null) result.growthFactor = growthFactor;
  const dailyDataGb = optionalPositive(simulation?.dailyDataGb, 1_000_000);
  if (dailyDataGb != null) result.dailyDataGb = dailyDataGb;

  return result;
}

/** Fill defaults for legacy graphs missing replicas / simulation / notes. */
export function normalizeGraph(graph: ArchitectureGraph): ArchitectureGraph {
  return {
    nodes: graph.nodes.map(normalizeNode),
    edges: graph.edges.map((edge) => ({ ...edge })),
    simulation: normalizeSimulation(graph.simulation),
  };
}
