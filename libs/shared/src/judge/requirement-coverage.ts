import type { ArchitectureGraph, ComponentNode } from '../schema/architecture-graph';
import type { ComponentType } from '../schema/component-types';
import type { ReqCoverageItem } from '../schema/judge';
import type { Locale } from '../schema/problem';
import { normalizeGraph } from '../schema/normalize-graph';

/** Capability a declared requirement asks the architecture to provide (AD-036). */
export type RequirementCapability =
  | 'write_path'
  | 'read_path'
  | 'uniqueness'
  | 'latency'
  | 'throughput'
  | 'availability'
  | 'consistency'
  | 'async_processing'
  | 'realtime'
  | 'search'
  | 'media'
  | 'auth'
  | 'rate_limit'
  | 'observability'
  | 'geo';

export interface RequirementCoverageInput {
  requirements: { functional: string[]; nonFunctional: string[] };
  graph: ArchitectureGraph;
  locale: Locale;
}

type Status = ReqCoverageItem['status'];

const STATUS_RANK: Record<Status, number> = { missing: 0, partial: 1, covered: 2 };

/** Canonical order — decides which capability explains a tie in worst-status aggregation. */
const CAPABILITY_ORDER: RequirementCapability[] = [
  'write_path',
  'read_path',
  'uniqueness',
  'consistency',
  'latency',
  'throughput',
  'availability',
  'async_processing',
  'realtime',
  'search',
  'media',
  'auth',
  'rate_limit',
  'observability',
  'geo',
];

/** Keyword fragments (accent-free, lowercase) that map free-text requirements to capabilities. */
const CAPABILITY_KEYWORDS: Record<RequirementCapability, string[]> = {
  write_path: [
    'encurtar',
    'criar',
    'cadastr',
    'postar',
    'publicar',
    'enviar',
    'salvar',
    'registrar',
    'escrit',
    'escrever',
    'gravar',
    'shorten',
    'create',
    'write',
    'submit',
    'post ',
    'save',
    'register',
    'insert',
  ],
  read_path: [
    'redirec',
    'acessar',
    'consultar',
    'visualizar',
    'ler ',
    'leitura',
    'listar',
    'feed',
    'assistir',
    'redirect',
    'read',
    'view',
    'fetch',
    'browse',
    'watch',
    'stream',
    'list ',
  ],
  uniqueness: [
    'colisao',
    'unico',
    'unica',
    'duplicad',
    'idempot',
    'collision',
    'unique',
    'duplicate',
  ],
  latency: [
    ' ms',
    'latenc',
    'percentil',
    'percentile',
    'p99',
    'p95',
    'tempo de resposta',
    'response time',
  ],
  throughput: [
    'rps',
    'qps',
    'por segundo',
    'per second',
    '/s ',
    'pico',
    'peak',
    'throughput',
    'vazao',
    'simultane',
    'concurrent',
    'escala',
    'scale',
  ],
  availability: [
    'disponibilidade',
    'availability',
    'uptime',
    '99,9',
    '99.9',
    '99,99',
    '99.99',
    'failover',
    'tolerancia a falha',
    'fault toleran',
    'resilien',
    'sem downtime',
  ],
  consistency: ['consistenc', 'consistency', 'transaca', 'transaction', 'acid', 'integridade'],
  async_processing: [
    'assincron',
    'async',
    'fila',
    'queue',
    'background',
    'batch',
    'processamento em segundo plano',
    'worker',
  ],
  realtime: ['tempo real', 'real time', 'realtime', 'websocket', 'push', 'ao vivo', 'live'],
  search: ['busca', 'buscar por', 'pesquis', 'search', 'full-text', 'full text', 'indexa'],
  media: [
    'upload',
    'video',
    'imagem',
    'foto',
    'arquivo',
    'midia',
    'media',
    'image',
    'file',
    'thumbnail',
  ],
  auth: ['login', 'autentic', 'authentic', 'auth', 'senha', 'password', 'oauth', 'permiss'],
  rate_limit: ['rate limit', 'limite de taxa', 'throttl', 'abuso', 'abuse', 'quota', 'spam'],
  observability: [
    'monitor',
    'metrica',
    'metric',
    'log',
    'observabilidade',
    'observability',
    'alerta',
    'alert',
    'trace',
  ],
  geo: ['geografic', 'geographic', 'multi-regia', 'multi regia', 'multi-region', 'global', 'regio'],
};

const CLIENT_TYPES: ReadonlySet<ComponentType> = new Set(['client_web', 'client_mobile']);
const STORE_TYPES: ReadonlySet<ComponentType> = new Set(['sql_db', 'nosql_db', 'object_storage']);
const APP_TYPES: ReadonlySet<ComponentType> = new Set([
  'app_server',
  'serverless',
  'microservice',
]);
const CACHE_TYPES: ReadonlySet<ComponentType> = new Set(['cache_redis', 'cdn']);
const LB_TYPES: ReadonlySet<ComponentType> = new Set(['load_balancer', 'reverse_proxy']);
const QUEUE_TYPES: ReadonlySet<ComponentType> = new Set(['message_queue', 'kafka', 'pub_sub']);

const CODE_STRATEGY_PATTERN =
  /base62|base 62|hash|uuid|snowflake|kgs|key generation|unique|unico|unica|colisao/i;

/** Lowercase + strip diacritics so "colisão" and "COLISAO" match the same keywords. */
export function normalizeRequirementText(text: string): string {
  return ` ${text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9,./%]+/g, ' ')
    .trim()} `;
}

/** Map a free-text requirement to the capabilities it demands (may be several, may be none). */
export function classifyRequirement(text: string): RequirementCapability[] {
  const haystack = normalizeRequirementText(text);
  const matched: RequirementCapability[] = [];
  for (const capability of CAPABILITY_ORDER) {
    if (CAPABILITY_KEYWORDS[capability].some((keyword) => haystack.includes(keyword))) {
      matched.push(capability);
    }
  }
  return matched;
}

interface GraphFacts {
  hasClient: boolean;
  hasStore: boolean;
  hasApp: boolean;
  hasCache: boolean;
  hasCdn: boolean;
  hasLb: boolean;
  hasGateway: boolean;
  storeReachable: boolean;
  storeViaApp: boolean;
  storeWithCache: boolean;
  cacheOnReadPathHitRate: number;
  bestCacheHitRate: number;
  lbRedundant: boolean;
  appRedundant: boolean;
  storeRedundant: boolean;
  uniquenessSignal: boolean;
  strongConsistency: boolean;
  hasQueue: boolean;
  hasWorker: boolean;
  hasRealtime: boolean;
  hasSearch: boolean;
  hasObjectStorage: boolean;
  hasAuth: boolean;
  gatewayAuthRequired: boolean;
  hasRateLimiter: boolean;
  hasMonitoring: boolean;
  hasLogging: boolean;
  multiRegionStorage: boolean;
}

function nodesOfSet(nodes: ComponentNode[], types: ReadonlySet<ComponentType>): ComponentNode[] {
  return nodes.filter((node) => types.has(node.type));
}

function totalReplicas(nodes: ComponentNode[]): number {
  return nodes.reduce((sum, node) => sum + (node.replicas ?? 1), 0);
}

function buildAdjacency(graph: ArchitectureGraph): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  for (const node of graph.nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of graph.edges) {
    adjacency.get(edge.from)?.push(edge.to);
    if (edge.direction === 'bidirectional') {
      adjacency.get(edge.to)?.push(edge.from);
    }
  }
  return adjacency;
}

function cacheHitRate(node: ComponentNode): number {
  const config = node.config;
  if (config && (config.kind === 'cache' || config.kind === 'cdn')) {
    return config.hitRate;
  }
  return 0;
}

function hasUniquenessSignal(stores: ComponentNode[]): boolean {
  return stores.some((store) => {
    if (store.config?.kind === 'sql_db' && store.config.partitionKey) {
      return true;
    }
    const notes = `${store.implementationNotes ?? store.note ?? ''} ${store.label}`;
    return CODE_STRATEGY_PATTERN.test(notes);
  });
}

function hasStrongConsistency(stores: ComponentNode[]): boolean {
  return stores.some((store) => {
    if (store.config?.kind === 'sql_db') {
      return store.config.consistency === 'strong';
    }
    if (store.config?.kind === 'nosql_db') {
      return store.config.consistency === 'quorum' || store.config.consistency === 'all';
    }
    return false;
  });
}

function isStoreRedundant(stores: ComponentNode[]): boolean {
  if (stores.length >= 2) {
    return true;
  }
  return stores.some((store) => {
    if (store.config?.kind === 'sql_db' && store.config.replicationFactor >= 2) {
      return true;
    }
    if (store.config?.kind === 'sql_db' || store.config?.kind === 'nosql_db') {
      return store.config.topologyRole === 'replica';
    }
    if (store.config?.kind === 'object_storage') {
      return store.config.replication === 'multi_region';
    }
    return (store.replicas ?? 1) >= 2;
  });
}

/** Walk client → … → store paths, tracking whether an app tier and a cache were crossed. */
function collectPathFacts(graph: ArchitectureGraph): {
  storeReachable: boolean;
  storeViaApp: boolean;
  storeWithCache: boolean;
  cacheOnReadPathHitRate: number;
} {
  const typeById = new Map(graph.nodes.map((node) => [node.id, node.type]));
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const adjacency = buildAdjacency(graph);
  const clients = graph.nodes.filter((node) => CLIENT_TYPES.has(node.type)).map((node) => node.id);

  let storeReachable = false;
  let storeViaApp = false;
  let storeWithCache = false;
  let cacheOnReadPathHitRate = 0;

  type State = { id: string; seenApp: boolean; cacheHitRate: number };
  const queue: State[] = clients.map((id) => ({ id, seenApp: false, cacheHitRate: 0 }));
  const visited = new Set<string>();

  while (queue.length > 0) {
    const state = queue.shift()!;
    const key = `${state.id}:${state.seenApp ? 1 : 0}:${state.cacheHitRate}`;
    if (visited.has(key)) {
      continue;
    }
    visited.add(key);

    const type = typeById.get(state.id);
    if (!type) {
      continue;
    }
    const seenApp = state.seenApp || APP_TYPES.has(type);
    const cacheRate = CACHE_TYPES.has(type)
      ? Math.max(state.cacheHitRate, cacheHitRate(nodeById.get(state.id)!))
      : state.cacheHitRate;

    if (STORE_TYPES.has(type)) {
      storeReachable = true;
      if (seenApp) {
        storeViaApp = true;
      }
      if (cacheRate > 0) {
        storeWithCache = true;
        cacheOnReadPathHitRate = Math.max(cacheOnReadPathHitRate, cacheRate);
      }
    }

    for (const next of adjacency.get(state.id) ?? []) {
      queue.push({ id: next, seenApp, cacheHitRate: cacheRate });
    }
  }

  return { storeReachable, storeViaApp, storeWithCache, cacheOnReadPathHitRate };
}

export function collectGraphFacts(graph: ArchitectureGraph): GraphFacts {
  const normalized = normalizeGraph(graph);
  const nodes = normalized.nodes;
  const stores = nodesOfSet(nodes, STORE_TYPES);
  const apps = nodesOfSet(nodes, APP_TYPES);
  const lbs = nodesOfSet(nodes, LB_TYPES);
  const caches = nodesOfSet(nodes, CACHE_TYPES);
  const paths = collectPathFacts(normalized);
  const gateways = nodes.filter((node) => node.type === 'api_gateway');
  const objectStores = nodes.filter((node) => node.type === 'object_storage');

  return {
    hasClient: nodes.some((node) => CLIENT_TYPES.has(node.type)),
    hasStore: stores.length > 0,
    hasApp: apps.length > 0,
    hasCache: caches.length > 0,
    hasCdn: nodes.some((node) => node.type === 'cdn'),
    hasLb: lbs.length > 0,
    hasGateway: gateways.length > 0,
    storeReachable: paths.storeReachable,
    storeViaApp: paths.storeViaApp,
    storeWithCache: paths.storeWithCache,
    cacheOnReadPathHitRate: paths.cacheOnReadPathHitRate,
    bestCacheHitRate: caches.reduce((best, node) => Math.max(best, cacheHitRate(node)), 0),
    lbRedundant: lbs.length >= 2 || totalReplicas(lbs) >= 2,
    appRedundant: apps.length >= 2 || totalReplicas(apps) >= 2,
    storeRedundant: isStoreRedundant(stores),
    uniquenessSignal: hasUniquenessSignal(stores),
    strongConsistency: hasStrongConsistency(stores),
    hasQueue: nodes.some((node) => QUEUE_TYPES.has(node.type)),
    hasWorker: nodes.some((node) => node.type === 'worker'),
    hasRealtime: nodes.some(
      (node) => node.type === 'websocket_gateway' || node.type === 'pub_sub',
    ),
    hasSearch: nodes.some((node) => node.type === 'search_engine'),
    hasObjectStorage: objectStores.length > 0,
    hasAuth: nodes.some((node) => node.type === 'auth_service'),
    gatewayAuthRequired: gateways.some(
      (node) => node.config?.kind === 'api_gateway' && node.config.authRequired,
    ),
    hasRateLimiter: nodes.some((node) => node.type === 'rate_limiter'),
    hasMonitoring: nodes.some((node) => node.type === 'monitoring'),
    hasLogging: nodes.some((node) => node.type === 'logging'),
    multiRegionStorage: objectStores.some(
      (node) => node.config?.kind === 'object_storage' && node.config.replication === 'multi_region',
    ),
  };
}

const MIN_CACHE_HIT_RATE = 80;

function rank(covered: boolean, partial: boolean): Status {
  if (covered) {
    return 'covered';
  }
  return partial ? 'partial' : 'missing';
}

function evaluateCapability(capability: RequirementCapability, facts: GraphFacts): Status {
  switch (capability) {
    case 'write_path':
      if (!facts.hasClient) {
        return rank(facts.hasStore && facts.hasApp, facts.hasStore);
      }
      return rank(facts.storeViaApp, facts.storeReachable);
    case 'read_path':
      if (!facts.hasClient) {
        return rank(facts.hasStore && facts.hasCache, facts.hasStore);
      }
      return rank(facts.storeWithCache, facts.storeReachable);
    case 'uniqueness':
      return rank(facts.hasStore && facts.uniquenessSignal, facts.hasStore);
    case 'consistency':
      return rank(facts.hasStore && facts.strongConsistency, facts.hasStore);
    case 'latency':
      return rank(
        facts.cacheOnReadPathHitRate >= MIN_CACHE_HIT_RATE ||
          (!facts.hasClient && facts.bestCacheHitRate >= MIN_CACHE_HIT_RATE),
        facts.hasCache,
      );
    case 'throughput': {
      const balanced = facts.hasLb || facts.hasGateway;
      const signals = [balanced, facts.appRedundant, facts.hasCache];
      return rank(
        signals.every(Boolean),
        signals.some(Boolean),
      );
    }
    case 'availability': {
      const signals = [facts.lbRedundant, facts.appRedundant, facts.storeRedundant];
      return rank(signals.every(Boolean), signals.some(Boolean));
    }
    case 'async_processing':
      return rank(facts.hasQueue && facts.hasWorker, facts.hasQueue || facts.hasWorker);
    case 'realtime':
      return rank(facts.hasRealtime, false);
    case 'search':
      return rank(facts.hasSearch, false);
    case 'media':
      return rank(facts.hasObjectStorage && facts.hasCdn, facts.hasObjectStorage);
    case 'auth':
      return rank(facts.hasAuth || facts.gatewayAuthRequired, facts.hasGateway);
    case 'rate_limit':
      return rank(facts.hasRateLimiter, facts.hasGateway);
    case 'observability':
      return rank(
        facts.hasMonitoring && facts.hasLogging,
        facts.hasMonitoring || facts.hasLogging,
      );
    case 'geo':
      return rank(facts.hasCdn && facts.multiRegionStorage, facts.hasCdn);
    default:
      return 'missing';
  }
}

const CAPABILITY_DETAIL: Record<RequirementCapability, Record<Locale, string>> = {
  write_path: {
    'pt-BR': 'Caminho de escrita cliente → app → armazenamento',
    en: 'Write path client → app tier → store',
  },
  read_path: {
    'pt-BR': 'Caminho de leitura com cache/CDN antes do banco',
    en: 'Read path with cache/CDN before the database',
  },
  uniqueness: {
    'pt-BR': 'Estratégia de chave única no armazenamento (partition key ou nota de geração de código)',
    en: 'Unique key strategy in the store (partition key or code-generation note)',
  },
  consistency: {
    'pt-BR': 'Consistência forte / quórum no armazenamento',
    en: 'Strong / quorum consistency in the store',
  },
  latency: {
    'pt-BR': `Cache ou CDN no caminho de leitura com hit rate ≥ ${MIN_CACHE_HIT_RATE}%`,
    en: `Cache or CDN on the read path with hit rate ≥ ${MIN_CACHE_HIT_RATE}%`,
  },
  throughput: {
    'pt-BR': 'Balanceamento, réplicas de app e cache para absorver pico',
    en: 'Load balancing, app replicas and cache to absorb peak load',
  },
  availability: {
    'pt-BR': 'Redundância em balanceador, app e armazenamento',
    en: 'Redundancy across load balancer, app tier and store',
  },
  async_processing: {
    'pt-BR': 'Fila/stream com worker consumindo',
    en: 'Queue/stream with a consuming worker',
  },
  realtime: {
    'pt-BR': 'Gateway WebSocket ou pub/sub para entrega em tempo real',
    en: 'WebSocket gateway or pub/sub for realtime delivery',
  },
  search: {
    'pt-BR': 'Search engine dedicado para consultas',
    en: 'Dedicated search engine for queries',
  },
  media: {
    'pt-BR': 'Object storage para mídia com CDN na borda',
    en: 'Object storage for media with a CDN at the edge',
  },
  auth: {
    'pt-BR': 'Serviço de autenticação ou gateway exigindo auth',
    en: 'Auth service or gateway enforcing authentication',
  },
  rate_limit: {
    'pt-BR': 'Rate limiter protegendo a entrada',
    en: 'Rate limiter protecting ingress',
  },
  observability: {
    'pt-BR': 'Monitoring e logging instrumentando o sistema',
    en: 'Monitoring and logging instrumenting the system',
  },
  geo: {
    'pt-BR': 'CDN e armazenamento multi-região',
    en: 'CDN plus multi-region storage',
  },
};

const STATUS_SUFFIX: Record<Status, Record<Locale, string>> = {
  covered: {
    'pt-BR': 'está presente no grafo enviado.',
    en: 'is present in the submitted graph.',
  },
  partial: {
    'pt-BR': 'aparece só em parte — reforce os componentes ou o caminho que faltam.',
    en: 'is only partly there — reinforce the missing components or path.',
  },
  missing: {
    'pt-BR': 'não foi encontrado no grafo enviado.',
    en: 'was not found in the submitted graph.',
  },
};

const UNVERIFIABLE_EXPLANATION: Record<Locale, string> = {
  'pt-BR':
    'Requisito genérico: não foi possível verificar automaticamente pelo grafo — use o feedback textual do juiz.',
  en: 'Generic requirement: not automatically verifiable from the graph — rely on the judge narrative.',
};

function explain(capability: RequirementCapability, status: Status, locale: Locale): string {
  return `${CAPABILITY_DETAIL[capability][locale]} ${STATUS_SUFFIX[status][locale]}`;
}

function coverRequirement(
  requirement: string,
  type: ReqCoverageItem['type'],
  facts: GraphFacts,
  locale: Locale,
): ReqCoverageItem {
  const capabilities = classifyRequirement(requirement);
  if (capabilities.length === 0) {
    return {
      requirement,
      type,
      status: 'partial',
      explanation: UNVERIFIABLE_EXPLANATION[locale],
    };
  }

  let worst: { capability: RequirementCapability; status: Status } | null = null;
  for (const capability of capabilities) {
    const status = evaluateCapability(capability, facts);
    if (!worst || STATUS_RANK[status] < STATUS_RANK[worst.status]) {
      worst = { capability, status };
    }
  }

  return {
    requirement,
    type,
    status: worst!.status,
    explanation: explain(worst!.capability, worst!.status, locale),
  };
}

/**
 * Deterministic requirement coverage derived from the architecture graph (AD-036).
 * One entry per declared requirement, in declaration order (functional first).
 */
export function analyzeRequirementCoverage(input: RequirementCoverageInput): ReqCoverageItem[] {
  const facts = collectGraphFacts(input.graph);
  const items: ReqCoverageItem[] = [];

  for (const requirement of input.requirements.functional) {
    items.push(coverRequirement(requirement, 'functional', facts, input.locale));
  }
  for (const requirement of input.requirements.nonFunctional) {
    items.push(coverRequirement(requirement, 'nonFunctional', facts, input.locale));
  }

  return items;
}
