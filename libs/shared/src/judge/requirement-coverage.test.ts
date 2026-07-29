import { describe, expect, it } from 'vitest';
import type { ArchitectureGraph, ComponentNode } from '../schema/architecture-graph';
import type { ComponentType } from '../schema/component-types';
import type { ReqCoverageItem } from '../schema/judge';
import { analyzeRequirementCoverage, classifyRequirement } from './requirement-coverage';
import { URL_SHORTENER } from '../problems/url-shortener';

const SHORTENER_REQS = URL_SHORTENER.suggestedRequirements;

function node(
  id: string,
  type: ComponentType,
  extra: Partial<ComponentNode> = {},
): ComponentNode {
  return {
    id,
    type,
    label: id,
    position: { x: 0, y: 0 },
    ...extra,
  };
}

function graph(nodes: ComponentNode[], edges: [string, string][]): ArchitectureGraph {
  return {
    nodes,
    edges: edges.map(([from, to], index) => ({
      id: `e${index}`,
      from,
      to,
      direction: 'forward' as const,
    })),
  };
}

/** Production-shaped shortener graph: clients → edge → LB → app → cache → sql. */
function shortenerGraph(
  options: {
    hitRate?: number;
    appReplicas?: number;
    lbReplicas?: number;
    replicationFactor?: number;
    partitionKey?: string;
    withCache?: boolean;
  } = {},
): ArchitectureGraph {
  const {
    hitRate = 95,
    appReplicas = 5,
    lbReplicas = 2,
    replicationFactor = 2,
    partitionKey = 'slug',
    withCache = true,
  } = options;

  const nodes: ComponentNode[] = [
    node('web', 'client_web'),
    node('gw', 'api_gateway'),
    node('lb', 'load_balancer', { replicas: lbReplicas }),
    node('app', 'app_server', { replicas: appReplicas }),
    node('db', 'sql_db', {
      config: {
        kind: 'sql_db',
        shardCount: 1,
        partitioningStrategy: 'hash',
        partitionKey,
        keySkew: 0,
        accessPattern: 'read_write',
        topologyRole: 'primary',
        replicationFactor,
        consistency: 'strong',
      },
    }),
  ];
  const edges: [string, string][] = [
    ['web', 'gw'],
    ['gw', 'lb'],
    ['lb', 'app'],
  ];

  if (withCache) {
    nodes.push(
      node('cache', 'cache_redis', {
        replicas: 2,
        config: { kind: 'cache', hitRate, eviction: 'lru', maxMemoryGb: 32 },
      }),
    );
    edges.push(['app', 'cache'], ['cache', 'db']);
  } else {
    edges.push(['app', 'db']);
  }

  return graph(nodes, edges);
}

function statusOf(items: ReqCoverageItem[], requirement: string): ReqCoverageItem['status'] {
  const found = items.find((item) => item.requirement === requirement);
  if (!found) {
    throw new Error(`requirement not found: ${requirement}`);
  }
  return found.status;
}

function coverage(
  graphInput: ArchitectureGraph,
  requirements = SHORTENER_REQS,
  locale: 'pt-BR' | 'en' = 'pt-BR',
): ReqCoverageItem[] {
  return analyzeRequirementCoverage({ requirements, graph: graphInput, locale });
}

describe('classifyRequirement', () => {
  it('maps the URL shortener suggested requirements to capabilities', () => {
    expect(classifyRequirement(SHORTENER_REQS.functional[0]!)).toEqual(
      expect.arrayContaining(['write_path', 'uniqueness']),
    );
    expect(classifyRequirement(SHORTENER_REQS.functional[1]!)).toContain('read_path');
    expect(classifyRequirement(SHORTENER_REQS.functional[2]!)).toContain('uniqueness');
    expect(classifyRequirement(SHORTENER_REQS.nonFunctional[0]!)).toContain('latency');
    expect(classifyRequirement(SHORTENER_REQS.nonFunctional[1]!)).toContain('throughput');
    expect(classifyRequirement(SHORTENER_REQS.nonFunctional[2]!)).toContain('availability');
  });

  it('is case and accent insensitive', () => {
    expect(classifyRequirement('SISTEMA IMPEDE COLISÃO DE CÓDIGOS')).toContain('uniqueness');
    expect(classifyRequirement('sistema impede colisao de codigos')).toContain('uniqueness');
  });

  it('returns no capability for unrelated text', () => {
    expect(classifyRequirement('Interface deve agradar o time de marketing')).toEqual([]);
  });
});

describe('analyzeRequirementCoverage — functional paths (RC-01)', () => {
  it('covers write and read requirements on a full shortener graph', () => {
    const items = coverage(shortenerGraph());

    expect(items).toHaveLength(6);
    expect(items.every((item) => item.status !== 'missing')).toBe(true);
    expect(statusOf(items, SHORTENER_REQS.functional[0]!)).toBe('covered');
    expect(statusOf(items, SHORTENER_REQS.functional[1]!)).toBe('covered');
    expect(statusOf(items, SHORTENER_REQS.functional[2]!)).toBe('covered');
  });

  it('downgrades the redirect requirement to partial when no cache sits before the DB', () => {
    const items = coverage(shortenerGraph({ withCache: false }));

    expect(statusOf(items, SHORTENER_REQS.functional[1]!)).toBe('partial');
    expect(statusOf(items, SHORTENER_REQS.functional[0]!)).toBe('covered');
  });

  it('marks write and read missing when no store is reachable from a client', () => {
    const items = coverage(
      graph([node('web', 'client_web'), node('app', 'app_server')], [['web', 'app']]),
    );

    expect(statusOf(items, SHORTENER_REQS.functional[0]!)).toBe('missing');
    expect(statusOf(items, SHORTENER_REQS.functional[1]!)).toBe('missing');
  });

  it('covers neither write nor read when the store is present but disconnected', () => {
    const items = coverage(
      graph(
        [node('web', 'client_web'), node('app', 'app_server'), node('db', 'sql_db')],
        [['web', 'app']],
      ),
    );

    expect(statusOf(items, SHORTENER_REQS.functional[0]!)).toBe('missing');
    expect(statusOf(items, SHORTENER_REQS.functional[1]!)).toBe('missing');
  });

  it('flags an unclassifiable requirement as partial and says it was not verifiable', () => {
    const items = coverage(shortenerGraph(), {
      functional: ['Interface deve agradar o time de marketing'],
      nonFunctional: [],
    });

    expect(items[0]!.status).toBe('partial');
    expect(items[0]!.explanation).toContain('não foi possível verificar');
  });

  it('explains in the requested locale', () => {
    const [pt] = coverage(shortenerGraph(), SHORTENER_REQS, 'pt-BR');
    const [en] = coverage(shortenerGraph(), SHORTENER_REQS, 'en');

    expect(pt!.explanation).toContain('grafo enviado');
    expect(en!.explanation).toContain('submitted graph');
  });
});

describe('analyzeRequirementCoverage — non-functional configs (RC-02)', () => {
  it('covers latency with a high hit rate and downgrades with a low hit rate', () => {
    const latencyReq = SHORTENER_REQS.nonFunctional[0]!;

    expect(statusOf(coverage(shortenerGraph({ hitRate: 95 })), latencyReq)).toBe('covered');
    expect(statusOf(coverage(shortenerGraph({ hitRate: 50 })), latencyReq)).toBe('partial');
  });

  it('downgrades latency to partial when the cache sits off the read path', () => {
    const items = coverage(
      graph(
        [
          node('web', 'client_web'),
          node('app', 'app_server', { replicas: 3 }),
          node('cache', 'cache_redis', {
            config: { kind: 'cache', hitRate: 99, eviction: 'lru', maxMemoryGb: 16 },
          }),
          node('db', 'sql_db'),
        ],
        [
          ['web', 'app'],
          ['app', 'cache'],
          ['app', 'db'],
        ],
      ),
    );

    expect(statusOf(items, SHORTENER_REQS.nonFunctional[0]!)).toBe('partial');
    expect(statusOf(items, SHORTENER_REQS.functional[1]!)).toBe('partial');
  });

  it('marks latency missing when no cache or CDN exists at all', () => {
    expect(
      statusOf(coverage(shortenerGraph({ withCache: false })), SHORTENER_REQS.nonFunctional[0]!),
    ).toBe('missing');
  });

  it('covers throughput only with balancing, app replicas and cache', () => {
    const throughputReq = SHORTENER_REQS.nonFunctional[1]!;

    expect(statusOf(coverage(shortenerGraph()), throughputReq)).toBe('covered');
    expect(statusOf(coverage(shortenerGraph({ appReplicas: 1 })), throughputReq)).toBe('partial');
  });

  it('covers availability only when balancer, app and store are all redundant', () => {
    const availabilityReq = SHORTENER_REQS.nonFunctional[2]!;

    expect(statusOf(coverage(shortenerGraph()), availabilityReq)).toBe('covered');
    expect(
      statusOf(coverage(shortenerGraph({ lbReplicas: 1, replicationFactor: 1 })), availabilityReq),
    ).toBe('partial');
  });

  it('covers uniqueness via partition key or code-strategy note, partial with a bare store', () => {
    const uniquenessReq = SHORTENER_REQS.functional[2]!;

    expect(statusOf(coverage(shortenerGraph({ partitionKey: 'slug' })), uniquenessReq)).toBe(
      'covered',
    );

    const noSignal = coverage(
      graph(
        [
          node('web', 'client_web'),
          node('app', 'app_server', { replicas: 2 }),
          node('db', 'sql_db', { label: 'Banco' }),
        ],
        [
          ['web', 'app'],
          ['app', 'db'],
        ],
      ),
    );
    expect(statusOf(noSignal, uniquenessReq)).toBe('partial');

    const defaultPartitioningOnly = coverage(
      graph(
        [
          node('web', 'client_web'),
          node('app', 'app_server'),
          node('db', 'sql_db', {
            label: 'Store',
            config: {
              kind: 'sql_db',
              shardCount: 4,
              partitioningStrategy: 'hash',
              keySkew: 0,
              accessPattern: 'read_write',
              topologyRole: 'primary',
              replicationFactor: 1,
              consistency: 'strong',
            },
          }),
        ],
        [
          ['web', 'app'],
          ['app', 'db'],
        ],
      ),
    );
    expect(statusOf(defaultPartitioningOnly, uniquenessReq)).toBe('partial');

    const noteSignal = coverage(
      graph(
        [
          node('web', 'client_web'),
          node('app', 'app_server'),
          node('db', 'sql_db', { label: 'Banco', implementationNotes: 'slug Base62 com unique index' }),
        ],
        [
          ['web', 'app'],
          ['app', 'db'],
        ],
      ),
    );
    expect(statusOf(noteSignal, uniquenessReq)).toBe('covered');
  });
});

describe('analyzeRequirementCoverage — edge cases (RC-05)', () => {
  it('marks everything missing on an empty graph', () => {
    const items = coverage({ nodes: [], edges: [] });

    expect(items).toHaveLength(6);
    expect(items.map((item) => item.status)).toEqual(Array(6).fill('missing'));
  });

  it('returns an empty list when nothing was declared', () => {
    expect(coverage(shortenerGraph(), { functional: [], nonFunctional: [] })).toEqual([]);
  });

  it('returns one entry per declaration when a requirement text repeats', () => {
    const items = coverage(shortenerGraph(), {
      functional: ['Usuário pode encurtar uma URL longa em um link curto único'],
      nonFunctional: ['Usuário pode encurtar uma URL longa em um link curto único'],
    });

    expect(items).toHaveLength(2);
    expect(items.map((item) => item.type)).toEqual(['functional', 'nonFunctional']);
  });

  it('falls back to component presence when the graph has no client node', () => {
    const items = coverage(
      graph(
        [
          node('app', 'app_server', { replicas: 2 }),
          node('cache', 'cache_redis', {
            config: { kind: 'cache', hitRate: 95, eviction: 'lru', maxMemoryGb: 8 },
          }),
          node('db', 'sql_db', { implementationNotes: 'base62 slug' }),
        ],
        [
          ['app', 'cache'],
          ['cache', 'db'],
        ],
      ),
    );

    expect(statusOf(items, SHORTENER_REQS.functional[0]!)).toBe('covered');
    expect(statusOf(items, SHORTENER_REQS.nonFunctional[0]!)).toBe('covered');
  });

  it('covers the write path when the store is linked by a bidirectional edge', () => {
    const items = analyzeRequirementCoverage({
      requirements: { functional: ['Usuário pode encurtar uma URL longa'], nonFunctional: [] },
      locale: 'pt-BR',
      graph: {
        nodes: [node('web', 'client_web'), node('app', 'app_server'), node('db', 'sql_db')],
        edges: [
          { id: 'e0', from: 'web', to: 'app', direction: 'forward' },
          { id: 'e1', from: 'db', to: 'app', direction: 'bidirectional' },
        ],
      },
    });

    expect(statusOf(items, 'Usuário pode encurtar uma URL longa')).toBe('covered');
  });
});
