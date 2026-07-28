import type { ArchitectureGraph, ComponentNode, PressureLevel } from '../schema/architecture-graph';
import type { ComponentType } from '../schema/component-types';
import { normalizeGraph } from '../schema/normalize-graph';

export type { PressureLevel };

export interface SimulationEvaluation {
  nodes: Record<string, PressureLevel>;
  latencyMs: Record<string, number>;
  reasons: Record<string, string>;
  hotReadPath: boolean;
}

const LATENCY_MS_BY_PRESSURE: Record<PressureLevel, number> = {
  ok: 35,
  warn: 120,
  hot: 280,
};

const BASE_LOAD = 10;

const CAPACITY_PER_REPLICA: Partial<Record<ComponentType, number>> = {
  client_web: 50,
  client_mobile: 50,
  dns: 40,
  cdn: 30,
  waf: 40,
  load_balancer: 40,
  api_gateway: 40,
  reverse_proxy: 40,
  rate_limiter: 35,
  app_server: 15,
  microservice: 15,
  serverless: 18,
  worker: 10,
  auth_service: 20,
  cache_redis: 30,
  sql_db: 12,
  nosql_db: 12,
  object_storage: 25,
  message_queue: 20,
  kafka: 22,
  pub_sub: 20,
  search_engine: 14,
  monitoring: 40,
  logging: 40,
  notification: 20,
  websocket_gateway: 18,
};

function capacityPerReplica(type: ComponentType): number {
  return CAPACITY_PER_REPLICA[type] ?? 20;
}

/** 1 = fully read-biased edge, 0 = fully write-biased, 0.5 = mixed */
export function edgeReadWeight(fromType: ComponentType, toType: ComponentType): number {
  if (toType === 'cache_redis' || toType === 'cdn') {
    return 0.95;
  }
  if (toType === 'sql_db' || toType === 'nosql_db') {
    if (fromType === 'cache_redis') {
      return 0.9;
    }
    if (fromType === 'app_server' || fromType === 'microservice' || fromType === 'worker') {
      return 0.35;
    }
    return 0.5;
  }
  if (
    fromType === 'client_web' ||
    fromType === 'client_mobile' ||
    toType === 'load_balancer' ||
    toType === 'waf' ||
    toType === 'api_gateway'
  ) {
    return 0.5;
  }
  return 0.5;
}

function hitRateOf(node: ArchitectureGraph['nodes'][number]): number | null {
  if (node.config?.kind === 'cache' || node.config?.kind === 'cdn') {
    return node.config.hitRate;
  }
  return null;
}

/** Low CDN TTL weakens edge relief (JR-19). Default 3600 → factor 1. */
function cdnTtlReliefFactor(node: ArchitectureGraph['nodes'][number]): number {
  if (node.config?.kind !== 'cdn') {
    return 1;
  }
  const ttl = node.config.ttlSeconds;
  // ttl≈60 → ~0.5; ttl 3600 → 1.0; shorter TTL passes more load to origin
  return clamp(Math.log10(Math.max(ttl, 1)) / Math.log10(DEFAULT_CDN_TTL_REF), 0.25, 1);
}

const DEFAULT_CDN_TTL_REF = 3600;

function sqlCapacityModifier(node: ArchitectureGraph['nodes'][number]): number {
  if (node.config?.kind !== 'sql_db') {
    return 1;
  }
  const { shardCount, keySkew } = node.config;
  return Math.sqrt(shardCount) * (1 - (keySkew / 100) * 0.5);
}

function mqCapacityModifier(node: ArchitectureGraph['nodes'][number]): number {
  if (node.config?.kind !== 'mq') {
    return 1;
  }
  const durabilityFactor = node.config.durability === 'memory' ? 0.55 : 1;
  const partitionFactor = Math.sqrt(Math.max(node.config.partitionCount, 1) / 3);
  return durabilityFactor * partitionFactor;
}

function wsCapacityModifier(node: ArchitectureGraph['nodes'][number]): number {
  if (node.config?.kind !== 'ws') {
    return 1;
  }
  // Default fan-out 10k → 1.0; low fan-out shrinks capacity
  return clamp(node.config.fanOutLimit / 10_000, 0.15, 2);
}

function lbCapacityModifier(node: ArchitectureGraph['nodes'][number]): number {
  if (node.config?.kind !== 'lb') {
    return 1;
  }
  if (node.config.algorithm === 'least_conn') {
    return 1.08;
  }
  if (node.config.algorithm === 'ip_hash') {
    return 0.92;
  }
  return 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function nodeCapacity(node: ArchitectureGraph['nodes'][number]): number {
  const reps = node.replicas ?? 1;
  return (
    reps *
    capacityPerReplica(node.type) *
    sqlCapacityModifier(node) *
    mqCapacityModifier(node) *
    wsCapacityModifier(node) *
    lbCapacityModifier(node)
  );
}

function pressureFromRatio(ratio: number): PressureLevel {
  if (ratio >= 1) {
    return 'hot';
  }
  if (ratio >= 0.7) {
    return 'warn';
  }
  return 'ok';
}

function buildPressureReason(
  node: ComponentNode,
  level: PressureLevel,
  ratio: number,
  traffic: number,
  avgCacheHit: number | null,
): string | undefined {
  if (level === 'ok') {
    return undefined;
  }

  const reps = node.replicas ?? 1;
  const isDb = node.type === 'sql_db' || node.type === 'nosql_db';

  if (isDb && avgCacheHit !== null && avgCacheHit < 70) {
    return 'Muitas leituras chegam ao DB (hit rate baixo no cache)';
  }

  if (
    node.config?.kind === 'sql_db' &&
    (node.config.keySkew >= 40 || node.config.shardCount <= 1) &&
    level === 'hot'
  ) {
    return 'Shards/skew limitam capacidade do SQL';
  }

  if (node.config?.kind === 'mq' && node.config.durability === 'memory' && level !== 'ok') {
    return 'Fila em memória sob pressão — risco de perda sob carga';
  }

  if (node.config?.kind === 'ws' && node.config.fanOutLimit < 2000 && level !== 'ok') {
    return 'Fan-out baixo no WebSocket Gateway';
  }

  if (node.config?.kind === 'cdn' && node.config.ttlSeconds < 300 && level !== 'ok') {
    return 'TTL baixo no CDN reduz alívio na origem';
  }

  if (reps <= 2 && ratio >= 0.7 && traffic >= 3) {
    return 'Carga alta para poucas replicas';
  }

  if (level === 'hot') {
    return 'Carga acima da capacidade deste nó';
  }

  return 'Carga próxima da capacidade deste nó';
}

/**
 * Deterministic educational simulation (AD-020).
 * Speed is intentionally ignored — visual-only on the client.
 */
export function evaluateSimulation(graph: ArchitectureGraph): SimulationEvaluation {
  const normalized = normalizeGraph(graph);
  const { traffic, readRatio } = normalized.simulation!;
  const readFrac = readRatio / 100;
  const writeFrac = 1 - readFrac;

  const typeById = new Map(normalized.nodes.map((n) => [n.id, n]));
  const loadById: Record<string, number> = {};
  for (const node of normalized.nodes) {
    loadById[node.id] = 0;
  }

  for (const edge of normalized.edges) {
    const from = typeById.get(edge.from);
    const to = typeById.get(edge.to);
    if (!from || !to) {
      continue;
    }

    const w = edgeReadWeight(from.type, to.type);
    let load = BASE_LOAD * traffic * (readFrac * w + writeFrac * (1 - w));

    if (from.type === 'cache_redis' || from.type === 'cdn') {
      const hr = hitRateOf(from) ?? 90;
      const ttlFactor = from.type === 'cdn' ? cdnTtlReliefFactor(from) : 1;
      const passThrough = clamp(1 - (hr / 100) * ttlFactor, 0, 1);
      load *= passThrough;
    }

    loadById[edge.to] = (loadById[edge.to] ?? 0) + load;
  }

  const caches = normalized.nodes.filter((n) => n.type === 'cache_redis' || n.type === 'cdn');
  let avgCacheHit: number | null = null;
  if (caches.length > 0) {
    avgCacheHit = caches.reduce((sum, c) => sum + (hitRateOf(c) ?? 90), 0) / caches.length;
    for (const edge of normalized.edges) {
      const from = typeById.get(edge.from);
      const to = typeById.get(edge.to);
      if (!from || !to) {
        continue;
      }
      if (
        (from.type === 'app_server' || from.type === 'microservice') &&
        (to.type === 'sql_db' || to.type === 'nosql_db')
      ) {
        // High hit rate should visibly unload parallel app→DB read pressure (pedagogical).
        const reduction = readFrac * (avgCacheHit / 100) * 0.95;
        loadById[edge.to] = Math.max(0, (loadById[edge.to] ?? 0) * (1 - reduction));
      }
    }
  }

  const nodes: Record<string, PressureLevel> = {};
  const latencyMs: Record<string, number> = {};
  const reasons: Record<string, string> = {};
  let anyHotOnReadPath = false;

  for (const node of normalized.nodes) {
    const load = loadById[node.id] ?? 0;
    const capacity = Math.max(0.001, nodeCapacity(node));
    const ratio = load / capacity;
    const level = pressureFromRatio(ratio);
    nodes[node.id] = level;
    latencyMs[node.id] = LATENCY_MS_BY_PRESSURE[level];

    const reason = buildPressureReason(node, level, ratio, traffic, avgCacheHit);
    if (reason) {
      reasons[node.id] = reason;
    }

    if (
      level === 'hot' &&
      readFrac >= 0.7 &&
      (node.type === 'cache_redis' ||
        node.type === 'sql_db' ||
        node.type === 'app_server' ||
        node.type === 'cdn')
    ) {
      anyHotOnReadPath = true;
    }
  }

  return {
    nodes,
    latencyMs,
    reasons,
    hotReadPath: anyHotOnReadPath && readFrac >= 0.7,
  };
}
