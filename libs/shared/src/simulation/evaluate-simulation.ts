import type {
  ArchitectureGraph,
  ComponentNode,
  PressureLevel,
  SimulationSettings,
} from '../schema/architecture-graph';
import type { ComponentType } from '../schema/component-types';
import {
  hasAbsoluteWorkload,
  normalizeGraph,
  resolveIngressRps,
} from '../schema/normalize-graph';

export type { PressureLevel };

export interface SimulationEvaluation {
  nodes: Record<string, PressureLevel>;
  latencyMs: Record<string, number>;
  reasons: Record<string, string>;
  hotReadPath: boolean;
  /** Effective ingress RPS used for this evaluation */
  ingressRps: number;
}

const LATENCY_MS_BY_PRESSURE: Record<PressureLevel, number> = {
  ok: 35,
  warn: 120,
  hot: 280,
};

const BASE_LOAD = 10;

/** Pedagogical capacity units (traffic-only / AD-020 back-compat). */
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

/** RPS capacity per replica when absolute workload is set (AD-031). */
const CAPACITY_RPS_PER_REPLICA: Partial<Record<ComponentType, number>> = {
  client_web: 50_000,
  client_mobile: 50_000,
  dns: 100_000,
  cdn: 40_000,
  waf: 30_000,
  load_balancer: 25_000,
  api_gateway: 20_000,
  reverse_proxy: 22_000,
  rate_limiter: 15_000,
  app_server: 2_000,
  microservice: 2_000,
  serverless: 2_500,
  worker: 800,
  auth_service: 5_000,
  cache_redis: 20_000,
  sql_db: 800,
  nosql_db: 3_000,
  object_storage: 10_000,
  message_queue: 8_000,
  kafka: 12_000,
  pub_sub: 10_000,
  search_engine: 1_500,
  monitoring: 50_000,
  logging: 50_000,
  notification: 5_000,
  websocket_gateway: 5_000,
};

function capacityPerReplica(type: ComponentType, absolute: boolean): number {
  if (absolute) {
    return CAPACITY_RPS_PER_REPLICA[type] ?? 5_000;
  }
  return CAPACITY_PER_REPLICA[type] ?? 20;
}

/** 1 = fully read-biased edge, 0 = fully write-biased, 0.5 = mixed */
export function edgeReadWeight(
  fromType: ComponentType,
  toType: ComponentType,
  label?: string,
): number {
  const intent = label?.toUpperCase();
  if (intent === 'CACHE') {
    return 0.95;
  }
  if (intent === 'DB') {
    if (fromType === 'cache_redis' || fromType === 'cdn') {
      return 0.9;
    }
    if (fromType === 'app_server' || fromType === 'microservice' || fromType === 'worker') {
      return 0.35;
    }
    return 0.4;
  }
  if (intent === 'REQ') {
    return 0.5;
  }
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

function cdnTtlReliefFactor(node: ArchitectureGraph['nodes'][number]): number {
  if (node.config?.kind !== 'cdn') {
    return 1;
  }
  const ttl = node.config.ttlSeconds;
  return clamp(Math.log10(Math.max(ttl, 1)) / Math.log10(DEFAULT_CDN_TTL_REF), 0.25, 1);
}

const DEFAULT_CDN_TTL_REF = 3600;

function mqCapacityModifier(node: ArchitectureGraph['nodes'][number]): number {
  if (node.config?.kind === 'mq') {
    const durabilityFactor = node.config.durability === 'memory' ? 0.55 : 1;
    const partitionFactor = Math.sqrt(Math.max(node.config.partitionCount, 1) / 3);
    const deliveryFactor =
      node.config.delivery === 'exactly_once'
        ? 0.85
        : node.config.delivery === 'at_most_once'
          ? 1.1
          : 1;
    return durabilityFactor * partitionFactor * deliveryFactor;
  }
  if (node.config?.kind === 'kafka') {
    const durabilityFactor = node.config.durability === 'memory' ? 0.55 : 1;
    const partitionFactor = Math.sqrt(Math.max(node.config.partitionCount, 1) / 3);
    const rfFactor = clamp(node.config.replicationFactor / 3, 0.5, 1.2);
    return durabilityFactor * partitionFactor * rfFactor;
  }
  return 1;
}

function wsCapacityModifier(node: ArchitectureGraph['nodes'][number]): number {
  if (node.config?.kind !== 'ws') {
    return 1;
  }
  const fan = clamp(node.config.fanOutLimit / 10_000, 0.15, 2);
  return fan * (node.config.stickySessions ? 1 : 0.9);
}

function lbCapacityModifier(node: ArchitectureGraph['nodes'][number]): number {
  if (node.config?.kind !== 'lb') {
    return 1;
  }
  let factor = 1;
  if (node.config.algorithm === 'least_conn') {
    factor = 1.08;
  } else if (node.config.algorithm === 'ip_hash') {
    factor = 0.92;
  }
  return factor * (node.config.healthCheck ? 1 : 0.85);
}

function nosqlCapacityModifier(node: ArchitectureGraph['nodes'][number]): number {
  if (node.config?.kind !== 'nosql_db') {
    return 1;
  }
  return Math.sqrt(Math.max(node.config.shardCount, 1));
}

function computeCapacityModifier(node: ArchitectureGraph['nodes'][number]): number {
  if (node.config?.kind !== 'compute') {
    return 1;
  }
  const rpsFactor = clamp(node.config.maxRpsPerReplica / 200, 0.25, 3);
  return rpsFactor * (node.config.stateless ? 1 : 0.7);
}

function rateLimiterCapacityModifier(node: ArchitectureGraph['nodes'][number]): number {
  if (node.config?.kind !== 'rate_limiter') {
    return 1;
  }
  return clamp(Math.log10(Math.max(node.config.limitPerSec, 1)) / 2, 0.3, 1.5);
}

function searchCapacityModifier(node: ArchitectureGraph['nodes'][number]): number {
  if (node.config?.kind !== 'search') {
    return 1;
  }
  return Math.sqrt(Math.max(node.config.shardCount, 1)) * (1 + node.config.replicaCount * 0.15);
}

function workerCapacityModifier(node: ArchitectureGraph['nodes'][number]): number {
  if (node.config?.kind !== 'worker') {
    return 1;
  }
  return clamp(node.config.concurrency / 4, 0.25, 4);
}

function objectStorageCapacityModifier(node: ArchitectureGraph['nodes'][number]): number {
  if (node.config?.kind !== 'object_storage') {
    return 1;
  }
  const classFactor = node.config.storageClass === 'hot' ? 1 : 0.6;
  const repFactor = node.config.replication === 'multi_region' ? 1 : 0.85;
  return classFactor * repFactor;
}

function cacheMemoryModifier(node: ArchitectureGraph['nodes'][number]): number {
  if (node.config?.kind !== 'cache') {
    return 1;
  }
  return clamp(Math.log10(Math.max(node.config.maxMemoryGb, 1) + 1) / Math.log10(5), 0.5, 1.5);
}

function sqlCapacityModifier(node: ArchitectureGraph['nodes'][number]): number {
  if (node.config?.kind !== 'sql_db') {
    return 1;
  }
  const base = Math.sqrt(node.config.shardCount) * (1 - (node.config.keySkew / 100) * 0.5);
  const rfBoost = 1 + (node.config.replicationFactor - 1) * 0.15;
  return base * clamp(rfBoost, 1, 1.8);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function nodeCapacity(node: ArchitectureGraph['nodes'][number], absolute: boolean): number {
  const reps = node.replicas ?? 1;
  return (
    reps *
    capacityPerReplica(node.type, absolute) *
    sqlCapacityModifier(node) *
    nosqlCapacityModifier(node) *
    mqCapacityModifier(node) *
    wsCapacityModifier(node) *
    lbCapacityModifier(node) *
    computeCapacityModifier(node) *
    rateLimiterCapacityModifier(node) *
    searchCapacityModifier(node) *
    workerCapacityModifier(node) *
    objectStorageCapacityModifier(node) *
    cacheMemoryModifier(node)
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

  if (
    (node.config?.kind === 'mq' || node.config?.kind === 'kafka') &&
    node.config.durability === 'memory'
  ) {
    return 'Fila em memória sob pressão — risco de perda sob carga';
  }

  if (node.config?.kind === 'ws' && node.config.fanOutLimit < 2000) {
    return 'Fan-out baixo no WebSocket Gateway';
  }

  if (node.config?.kind === 'rate_limiter' && node.config.limitPerSec < 10 && traffic >= 3) {
    return 'Rate limit muito baixo para o tráfego simulado';
  }

  if (node.config?.kind === 'worker' && !node.config.dlq && level === 'hot') {
    return 'Worker sem DLQ sob carga — risco de poison messages';
  }

  if (node.config?.kind === 'cdn' && node.config.ttlSeconds < 300) {
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

function evaluateTrafficOnly(normalized: ArchitectureGraph): Record<string, number> {
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

    const w = edgeReadWeight(from.type, to.type, edge.label);
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
        const reduction = readFrac * (avgCacheHit / 100) * 0.95;
        loadById[edge.to] = Math.max(0, (loadById[edge.to] ?? 0) * (1 - reduction));
      }
    }
  }

  return loadById;
}

function outgoing(normalized: ArchitectureGraph): Map<string, ArchitectureGraph['edges']> {
  const map = new Map<string, ArchitectureGraph['edges']>();
  for (const edge of normalized.edges) {
    const list = map.get(edge.from) ?? [];
    list.push(edge);
    map.set(edge.from, list);
  }
  return map;
}

/** Path-aware RPS propagation from client nodes (AD-031). */
function evaluateAbsoluteWorkload(normalized: ArchitectureGraph): Record<string, number> {
  const sim = normalized.simulation!;
  const ingress = resolveIngressRps(sim);
  const readFrac = sim.readRatio / 100;
  const writeFrac = 1 - readFrac;
  const typeById = new Map(normalized.nodes.map((n) => [n.id, n]));
  const loadById: Record<string, number> = {};
  for (const node of normalized.nodes) {
    loadById[node.id] = 0;
  }

  const clients = normalized.nodes.filter(
    (n) => n.type === 'client_web' || n.type === 'client_mobile',
  );
  const seeds = clients.length > 0 ? clients : normalized.nodes.slice(0, 1);
  const perSeed = seeds.length > 0 ? ingress / seeds.length : ingress;
  for (const seed of seeds) {
    loadById[seed.id] = (loadById[seed.id] ?? 0) + perSeed;
  }

  const out = outgoing(normalized);
  const queue = seeds.map((s) => s.id);
  const visitedHops = new Set<string>();

  while (queue.length > 0) {
    const fromId = queue.shift()!;
    const from = typeById.get(fromId);
    if (!from) {
      continue;
    }
    const edges = out.get(fromId) ?? [];
    if (edges.length === 0) {
      continue;
    }

    const parentLoad = loadById[fromId] ?? 0;
    if (parentLoad <= 0) {
      continue;
    }

    const share = parentLoad / edges.length;
    for (const edge of edges) {
      const hopKey = `${edge.id}:${fromId}`;
      if (visitedHops.has(hopKey)) {
        continue;
      }
      visitedHops.add(hopKey);

      const to = typeById.get(edge.to);
      if (!to) {
        continue;
      }

      const w = edgeReadWeight(from.type, to.type, edge.label);
      let load = share * (readFrac * w + writeFrac * (1 - w));
      // Ensure we don't zero out entirely on mixed edges
      if (load < share * 0.15) {
        load = share * 0.15;
      }

      if (from.type === 'cache_redis' || from.type === 'cdn') {
        const hr = hitRateOf(from) ?? 90;
        const ttlFactor = from.type === 'cdn' ? cdnTtlReliefFactor(from) : 1;
        const passThrough = clamp(1 - (hr / 100) * ttlFactor, 0, 1);
        load *= passThrough;
      }

      // Bandwidth / object size pressure bump on storage path
      if (
        (to.type === 'object_storage' || to.type === 'cdn') &&
        (sim.avgObjectKb ?? 0) > 512 &&
        (sim.bandwidthMbps ?? 1000) < 100
      ) {
        load *= 1.4;
      }

      loadById[edge.to] = (loadById[edge.to] ?? 0) + load;
      queue.push(edge.to);
    }
  }

  // Pedagogical: presence of cache/cdn unloads parallel app→DB reads
  const caches = normalized.nodes.filter((n) => n.type === 'cache_redis' || n.type === 'cdn');
  if (caches.length > 0) {
    const avgCacheHit =
      caches.reduce((sum, c) => sum + (hitRateOf(c) ?? 90), 0) / caches.length;
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
        const reduction = readFrac * (avgCacheHit / 100) * 0.95;
        loadById[edge.to] = Math.max(0, (loadById[edge.to] ?? 0) * (1 - reduction));
      }
    }
  }

  // Growth factor stresses capacity scenario
  const growth = sim.growthFactor && sim.growthFactor > 1 ? sim.growthFactor : 1;
  if (growth > 1) {
    for (const id of Object.keys(loadById)) {
      loadById[id] *= growth;
    }
  }

  return loadById;
}

function avgCacheHitOf(normalized: ArchitectureGraph): number | null {
  const caches = normalized.nodes.filter((n) => n.type === 'cache_redis' || n.type === 'cdn');
  if (caches.length === 0) {
    return null;
  }
  return caches.reduce((sum, c) => sum + (hitRateOf(c) ?? 90), 0) / caches.length;
}

/**
 * Deterministic educational simulation (AD-020 + AD-031).
 * Speed is intentionally ignored — visual-only on the client.
 * Absolute workload fields enable path-aware RPS mode; otherwise traffic 1–5 back-compat.
 */
export function evaluateSimulation(graph: ArchitectureGraph): SimulationEvaluation {
  const normalized = normalizeGraph(graph);
  const sim = normalized.simulation as SimulationSettings;
  const absolute = hasAbsoluteWorkload(sim);
  const ingressRps = resolveIngressRps(sim);
  const readFrac = sim.readRatio / 100;
  const traffic = sim.traffic;

  const loadById = absolute
    ? evaluateAbsoluteWorkload(normalized)
    : evaluateTrafficOnly(normalized);

  const avgCacheHit = avgCacheHitOf(normalized);
  const nodes: Record<string, PressureLevel> = {};
  const latencyMs: Record<string, number> = {};
  const reasons: Record<string, string> = {};
  let anyHotOnReadPath = false;

  for (const node of normalized.nodes) {
    const load = loadById[node.id] ?? 0;
    const capacity = Math.max(0.001, nodeCapacity(node, absolute));
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

  // Network latency adds educational latency on hot/warn when absolute
  if (absolute && (sim.networkLatencyMs ?? 0) > 80) {
    for (const id of Object.keys(latencyMs)) {
      if (nodes[id] !== 'ok') {
        latencyMs[id] += Math.min(200, Math.round((sim.networkLatencyMs ?? 0) / 2));
      }
    }
  }

  return {
    nodes,
    latencyMs,
    reasons,
    hotReadPath: anyHotOnReadPath && readFrac >= 0.7,
    ingressRps,
  };
}
