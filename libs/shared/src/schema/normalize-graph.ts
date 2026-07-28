import type { ComponentType } from './component-types';
import type {
  AccessPattern,
  ArchitectureGraph,
  ComponentConfig,
  ComponentNode,
  DbTopologyRole,
  LbAlgorithm,
  MqDurability,
  SimulationSettings,
} from './architecture-graph';

export const DEFAULT_SIMULATION: SimulationSettings = {
  running: false,
  speed: 1,
  traffic: 1,
  readRatio: 80,
};

export const DEFAULT_CDN_TTL_SECONDS = 3600;
export const DEFAULT_MQ_PARTITION_COUNT = 3;
export const DEFAULT_WS_FAN_OUT = 10_000;

const LB_ALGORITHMS: readonly LbAlgorithm[] = ['round_robin', 'least_conn', 'ip_hash'];
const MQ_DURABILITIES: readonly MqDurability[] = ['memory', 'disk'];
const ACCESS_PATTERNS: readonly AccessPattern[] = ['read', 'write', 'read_write'];
const DB_TOPOLOGY_ROLES: readonly DbTopologyRole[] = ['primary', 'replica', 'standalone'];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isLbAlgorithm(value: unknown): value is LbAlgorithm {
  return typeof value === 'string' && (LB_ALGORITHMS as readonly string[]).includes(value);
}

function isMqDurability(value: unknown): value is MqDurability {
  return typeof value === 'string' && (MQ_DURABILITIES as readonly string[]).includes(value);
}

function isAccessPattern(value: unknown): value is AccessPattern {
  return typeof value === 'string' && (ACCESS_PATTERNS as readonly string[]).includes(value);
}

function isDbTopologyRole(value: unknown): value is DbTopologyRole {
  return typeof value === 'string' && (DB_TOPOLOGY_ROLES as readonly string[]).includes(value);
}

function resolveAccessPattern(value: unknown): AccessPattern {
  return isAccessPattern(value) ? value : 'read_write';
}

function resolveTopologyRole(value: unknown): DbTopologyRole {
  return isDbTopologyRole(value) ? value : 'primary';
}

export function defaultConfigForType(type: ComponentType): ComponentConfig | undefined {
  if (type === 'cache_redis') {
    return { kind: 'cache', hitRate: 90 };
  }
  if (type === 'cdn') {
    return { kind: 'cdn', hitRate: 99, ttlSeconds: DEFAULT_CDN_TTL_SECONDS };
  }
  if (type === 'sql_db') {
    return {
      kind: 'sql_db',
      shardCount: 1,
      partitioningStrategy: 'hash',
      keySkew: 0,
      accessPattern: 'read_write',
      topologyRole: 'primary',
    };
  }
  if (type === 'nosql_db') {
    return {
      kind: 'nosql_db',
      accessPattern: 'read_write',
      topologyRole: 'primary',
    };
  }
  if (type === 'message_queue' || type === 'kafka' || type === 'pub_sub') {
    return {
      kind: 'mq',
      durability: 'disk',
      partitionCount: DEFAULT_MQ_PARTITION_COUNT,
    };
  }
  if (type === 'websocket_gateway') {
    return { kind: 'ws', fanOutLimit: DEFAULT_WS_FAN_OUT };
  }
  if (type === 'load_balancer') {
    return { kind: 'lb', algorithm: 'round_robin' };
  }
  return undefined;
}

function normalizeConfig(node: ComponentNode): ComponentConfig | undefined {
  const fallback = defaultConfigForType(node.type);
  if (!node.config) {
    return fallback;
  }

  if (node.config.kind === 'cache') {
    return {
      kind: 'cache',
      hitRate: clamp(node.config.hitRate, 0, 100),
    };
  }

  if (node.config.kind === 'cdn') {
    const ttlRaw =
      typeof (node.config as { ttlSeconds?: number }).ttlSeconds === 'number'
        ? (node.config as { ttlSeconds: number }).ttlSeconds
        : DEFAULT_CDN_TTL_SECONDS;
    return {
      kind: 'cdn',
      hitRate: clamp(node.config.hitRate, 0, 100),
      ttlSeconds: clamp(Math.round(ttlRaw), 1, 86_400),
    };
  }

  if (node.config.kind === 'sql_db') {
    return {
      kind: 'sql_db',
      shardCount: clamp(Math.round(node.config.shardCount), 1, 256),
      partitioningStrategy: node.config.partitioningStrategy,
      partitionKey: node.config.partitionKey,
      keySkew: clamp(node.config.keySkew, 0, 100),
      accessPattern: resolveAccessPattern(
        (node.config as { accessPattern?: unknown }).accessPattern,
      ),
      topologyRole: resolveTopologyRole(
        (node.config as { topologyRole?: unknown }).topologyRole,
      ),
    };
  }

  if (node.config.kind === 'nosql_db') {
    return {
      kind: 'nosql_db',
      accessPattern: resolveAccessPattern(
        (node.config as { accessPattern?: unknown }).accessPattern,
      ),
      topologyRole: resolveTopologyRole(
        (node.config as { topologyRole?: unknown }).topologyRole,
      ),
    };
  }

  if (node.config.kind === 'mq') {
    return {
      kind: 'mq',
      durability: isMqDurability(node.config.durability) ? node.config.durability : 'disk',
      partitionCount: clamp(Math.round(node.config.partitionCount), 1, 256),
    };
  }

  if (node.config.kind === 'ws') {
    return {
      kind: 'ws',
      fanOutLimit: clamp(Math.round(node.config.fanOutLimit), 1, 1_000_000),
    };
  }

  if (node.config.kind === 'lb') {
    return {
      kind: 'lb',
      algorithm: isLbAlgorithm(node.config.algorithm) ? node.config.algorithm : 'round_robin',
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

export function normalizeSimulation(
  simulation?: Partial<SimulationSettings> | null,
): SimulationSettings {
  return {
    running: Boolean(simulation?.running),
    speed: clamp(simulation?.speed ?? DEFAULT_SIMULATION.speed, 1, 5),
    traffic: clamp(simulation?.traffic ?? DEFAULT_SIMULATION.traffic, 1, 5),
    readRatio: clamp(simulation?.readRatio ?? DEFAULT_SIMULATION.readRatio, 0, 100),
  };
}

/** Fill defaults for legacy graphs missing replicas / simulation / notes. */
export function normalizeGraph(graph: ArchitectureGraph): ArchitectureGraph {
  return {
    nodes: graph.nodes.map(normalizeNode),
    edges: graph.edges.map((edge) => ({ ...edge })),
    simulation: normalizeSimulation(graph.simulation),
  };
}
