import type {
  ArchitectureFinding,
  ArchitectureGraph,
  ComponentNode,
  FindingCode,
} from '../schema/architecture-graph';
import type { ComponentType } from '../schema/component-types';
import { hasAbsoluteWorkload, normalizeGraph, resolveIngressRps } from '../schema/normalize-graph';
import type { SimulationEvaluation } from './evaluate-simulation';
import { evaluateSimulation } from './evaluate-simulation';

const CRITICAL_SPOF_TYPES: ReadonlySet<ComponentType> = new Set([
  'sql_db',
  'nosql_db',
  'cache_redis',
  'load_balancer',
  'app_server',
  'api_gateway',
]);

function finding(
  code: FindingCode,
  severity: ArchitectureFinding['severity'],
  nodeIds: string[],
  reasonPt: string,
  reasonEn: string,
): ArchitectureFinding {
  return { code, severity, nodeIds, reasonPt, reasonEn };
}

function hasType(nodes: ComponentNode[], ...types: ComponentType[]): boolean {
  const set = new Set(types);
  return nodes.some((n) => set.has(n.type));
}

function nodesOf(nodes: ComponentNode[], ...types: ComponentType[]): ComponentNode[] {
  const set = new Set(types);
  return nodes.filter((n) => set.has(n.type));
}

function buildAdj(graph: ArchitectureGraph): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const n of graph.nodes) {
    adj.set(n.id, []);
  }
  for (const e of graph.edges) {
    const list = adj.get(e.from) ?? [];
    list.push(e.to);
    adj.set(e.from, list);
  }
  return adj;
}

function reachable(adj: Map<string, string[]>, startIds: string[]): Set<string> {
  const seen = new Set<string>();
  const q = [...startIds];
  while (q.length > 0) {
    const id = q.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const next of adj.get(id) ?? []) {
      if (!seen.has(next)) q.push(next);
    }
  }
  return seen;
}

function pathsHaveCacheBeforeDb(graph: ArchitectureGraph): boolean {
  const typeById = new Map(graph.nodes.map((n) => [n.id, n.type]));
  const adj = buildAdj(graph);
  const clients = graph.nodes
    .filter((n) => n.type === 'client_web' || n.type === 'client_mobile')
    .map((n) => n.id);
  if (clients.length === 0) {
    return hasType(graph.nodes, 'cache_redis', 'cdn');
  }

  // BFS tracking whether cache/cdn seen on path
  type State = { id: string; seenCache: boolean };
  const q: State[] = clients.map((id) => ({ id, seenCache: false }));
  const visited = new Set<string>();
  let reachedDbWithoutCache = false;
  let reachedDbWithCache = false;

  while (q.length > 0) {
    const { id, seenCache } = q.shift()!;
    const key = `${id}:${seenCache ? 1 : 0}`;
    if (visited.has(key)) continue;
    visited.add(key);

    const t = typeById.get(id);
    const nextCache =
      seenCache || t === 'cache_redis' || t === 'cdn';
    if (t === 'sql_db' || t === 'nosql_db') {
      if (nextCache) reachedDbWithCache = true;
      else reachedDbWithoutCache = true;
    }
    for (const next of adj.get(id) ?? []) {
      q.push({ id: next, seenCache: nextCache });
    }
  }

  if (!reachedDbWithoutCache && !reachedDbWithCache) {
    return hasType(graph.nodes, 'cache_redis', 'cdn');
  }
  return reachedDbWithCache && !reachedDbWithoutCache;
}

function cacheOnAnyClientDbPath(graph: ArchitectureGraph): boolean {
  const typeById = new Map(graph.nodes.map((n) => [n.id, n.type]));
  const adj = buildAdj(graph);
  const clients = graph.nodes
    .filter((n) => n.type === 'client_web' || n.type === 'client_mobile')
    .map((n) => n.id);
  const q = clients.map((id) => ({ id, seenCache: false }));
  const visited = new Set<string>();
  while (q.length > 0) {
    const { id, seenCache } = q.shift()!;
    const key = `${id}:${seenCache ? 1 : 0}`;
    if (visited.has(key)) continue;
    visited.add(key);
    const t = typeById.get(id);
    const nextCache = seenCache || t === 'cache_redis' || t === 'cdn';
    if ((t === 'sql_db' || t === 'nosql_db') && nextCache) {
      return true;
    }
    for (const next of adj.get(id) ?? []) {
      q.push({ id: next, seenCache: nextCache });
    }
  }
  return false;
}

/**
 * Deterministic topology / workload findings (AD-031). Educational rules, not CAP simulation.
 */
export function analyzeTopology(
  graph: ArchitectureGraph,
  evaluation?: SimulationEvaluation,
): ArchitectureFinding[] {
  const normalized = normalizeGraph(graph);
  const sim = normalized.simulation!;
  const evalResult = evaluation ?? evaluateSimulation(normalized);
  const findings: ArchitectureFinding[] = [];
  const readFrac = sim.readRatio / 100;
  const writeFrac = 1 - readFrac;
  const ingress = resolveIngressRps(sim);
  const writeRps =
    sim.writeRps ?? (hasAbsoluteWorkload(sim) ? ingress * writeFrac : sim.traffic * writeFrac * 200);
  const targetAvail = sim.targetAvailability ?? 99.0;

  // BOTTLENECK from pressure
  for (const node of normalized.nodes) {
    if (evalResult.nodes[node.id] === 'hot') {
      findings.push(
        finding(
          'BOTTLENECK',
          'blocker',
          [node.id],
          `${node.label || node.type} está acima da capacidade sob a carga simulada.`,
          `${node.label || node.type} is over capacity under the simulated load.`,
        ),
      );
    }
  }

  // QUEUE_BACKLOG — warn pressure teaches interview "queueing" before hard bottleneck
  for (const node of normalized.nodes) {
    if (evalResult.nodes[node.id] === 'warn') {
      findings.push(
        finding(
          'QUEUE_BACKLOG',
          'major',
          [node.id],
          `${node.label || node.type} está perto da capacidade (queueing) — latência sobe antes do colapso.`,
          `${node.label || node.type} is near capacity (queueing) — latency rises before collapse.`,
        ),
      );
    }
  }

  // HOT_PARTITION — SQL key skew under hot pressure
  for (const node of normalized.nodes) {
    if (evalResult.nodes[node.id] !== 'hot') continue;
    if (node.config?.kind !== 'sql_db') continue;
    if ((node.config.keySkew ?? 0) < 40) continue;
    findings.push(
      finding(
        'HOT_PARTITION',
        'major',
        [node.id],
        `${node.label || node.type} com keySkew=${node.config.keySkew}% sob carga — partição quente (celebrity key).`,
        `${node.label || node.type} with keySkew=${node.config.keySkew}% under load — hot partition (celebrity key).`,
      ),
    );
  }

  // SPOF: critical types with replicas=1 and no peer of same type
  for (const node of normalized.nodes) {
    if (!CRITICAL_SPOF_TYPES.has(node.type)) continue;
    const reps = node.replicas ?? 1;
    const peers = normalized.nodes.filter((n) => n.type === node.type && n.id !== node.id);
    if (reps <= 1 && peers.length === 0) {
      findings.push(
        finding(
          'SPOF',
          'major',
          [node.id],
          `${node.label || node.type} com 1 réplica é um single point of failure.`,
          `${node.label || node.type} with 1 replica is a single point of failure.`,
        ),
      );
    }
  }

  // MISSING_CACHE
  const hasDb = hasType(normalized.nodes, 'sql_db', 'nosql_db');
  const hasCache = hasType(normalized.nodes, 'cache_redis', 'cdn');
  if (readFrac >= 0.7 && hasDb && !hasCache) {
    const dbs = nodesOf(normalized.nodes, 'sql_db', 'nosql_db');
    findings.push(
      finding(
        'MISSING_CACHE',
        'major',
        dbs.map((d) => d.id),
        'Carga majoritariamente de leitura sem cache/CDN no caminho até o banco.',
        'Read-heavy workload with no cache/CDN on the path to the database.',
      ),
    );
  } else if (readFrac >= 0.7 && hasDb && hasCache && !pathsHaveCacheBeforeDb(normalized)) {
    const dbs = nodesOf(normalized.nodes, 'sql_db', 'nosql_db');
    findings.push(
      finding(
        'MISSING_CACHE',
        'major',
        dbs.map((d) => d.id),
        'Há caminho client→DB sem passar por cache/CDN (leituras batem no banco).',
        'A client→DB path bypasses cache/CDN (reads hit the database).',
      ),
    );
  }

  // CACHE_OFF_PATH
  if (hasCache && hasDb && !cacheOnAnyClientDbPath(normalized)) {
    const caches = nodesOf(normalized.nodes, 'cache_redis', 'cdn');
    findings.push(
      finding(
        'CACHE_OFF_PATH',
        'major',
        caches.map((c) => c.id),
        'Cache/CDN existe mas não está em nenhum caminho client→DB.',
        'Cache/CDN exists but is not on any client→DB path.',
      ),
    );
  }

  // MISSING_MQ
  const hasMq = hasType(normalized.nodes, 'message_queue', 'kafka', 'pub_sub', 'worker');
  const hasSyncAppDb = normalized.edges.some((e) => {
    const from = normalized.nodes.find((n) => n.id === e.from);
    const to = normalized.nodes.find((n) => n.id === e.to);
    return (
      !!from &&
      !!to &&
      (from.type === 'app_server' || from.type === 'microservice') &&
      (to.type === 'sql_db' || to.type === 'nosql_db')
    );
  });
  if ((writeFrac >= 0.4 || writeRps >= 500) && hasSyncAppDb && !hasMq) {
    findings.push(
      finding(
        'MISSING_MQ',
        'major',
        nodesOf(normalized.nodes, 'sql_db', 'nosql_db').map((d) => d.id),
        'Muitas escritas síncronas app→DB sem fila/worker — risco de gargalo e acoplamento.',
        'High sync writes app→DB without a queue/worker — bottleneck and coupling risk.',
      ),
    );
  }

  // NO_LB
  const apps = nodesOf(normalized.nodes, 'app_server', 'microservice');
  const totalAppReps = apps.reduce((s, a) => s + (a.replicas ?? 1), 0);
  const hasLb = hasType(normalized.nodes, 'load_balancer', 'api_gateway');
  if (totalAppReps >= 2 && !hasLb) {
    findings.push(
      finding(
        'NO_LB',
        'major',
        apps.map((a) => a.id),
        'Várias réplicas de app sem Load Balancer / API Gateway.',
        'Multiple app replicas without a Load Balancer / API Gateway.',
      ),
    );
  }

  // SINGLE_PRIMARY
  if (targetAvail >= 99.9) {
    for (const node of normalized.nodes) {
      if (node.type !== 'sql_db' && node.type !== 'nosql_db') continue;
      const role =
        node.config?.kind === 'sql_db' || node.config?.kind === 'nosql_db'
          ? node.config.topologyRole
          : 'primary';
      const rf =
        node.config?.kind === 'sql_db'
          ? node.config.replicationFactor
          : node.config?.kind === 'nosql_db'
            ? 1
            : 1;
      if ((role === 'primary' || role === 'standalone') && rf <= 1 && (node.replicas ?? 1) <= 1) {
        findings.push(
          finding(
            'SINGLE_PRIMARY',
            'major',
            [node.id],
            `Disponibilidade alvo ${targetAvail}% com primary único (RF=1) — falha = downtime.`,
            `Target availability ${targetAvail}% with a single primary (RF=1) — failure means downtime.`,
          ),
        );
      }
    }
  }

  // CONSISTENCY_RISK
  for (const node of normalized.nodes) {
    if (node.config?.kind === 'nosql_db' && node.config.consistency === 'one' && targetAvail >= 99.9) {
      findings.push(
        finding(
          'CONSISTENCY_RISK',
          'minor',
          [node.id],
          'NoSQL consistency=one com meta de alta disponibilidade — risco de ler dados stale/perdidos.',
          'NoSQL consistency=one with a high-availability target — stale/lost-read risk.',
        ),
      );
    }
    if (
      node.config?.kind === 'sql_db' &&
      node.config.consistency === 'strong' &&
      node.config.replicationFactor > 1 &&
      targetAvail >= 99.99
    ) {
      findings.push(
        finding(
          'CONSISTENCY_RISK',
          'minor',
          [node.id],
          'Strong consistency + várias réplicas sob disponibilidade muito alta — latência de sync pode sofrer.',
          'Strong consistency + multiple replicas under very high availability — sync latency may suffer.',
        ),
      );
    }
  }

  // OVERPROVISION
  const expensive = nodesOf(normalized.nodes, 'cdn', 'search_engine', 'kafka');
  if (ingress < 100 && expensive.length >= 3) {
    findings.push(
      finding(
        'OVERPROVISION',
        'minor',
        expensive.map((n) => n.id),
        'Carga baixa com CDN + Search + Kafka — possível over-engineering / custo alto.',
        'Low load with CDN + Search + Kafka — possible over-engineering / high cost.',
      ),
    );
  }

  // Deduplicate by code+nodeIds
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.code}:${f.nodeIds.slice().sort().join(',')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export type { FindingCode };
