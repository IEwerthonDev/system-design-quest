import { describe, expect, it } from 'vitest';
import type { ArchitectureGraph } from '../schema/architecture-graph';
import { evaluateSimulation } from './evaluate-simulation';

function urlShortenerFixture(hitRate: number, traffic: number): ArchitectureGraph {
  return {
    nodes: [
      {
        id: 'client',
        type: 'client_web',
        label: 'Client',
        replicas: 1,
        position: { x: 0, y: 0 },
      },
      {
        id: 'app',
        type: 'app_server',
        label: 'App',
        replicas: 1,
        position: { x: 100, y: 0 },
      },
      {
        id: 'cache',
        type: 'cache_redis',
        label: 'Cache',
        replicas: 1,
        position: { x: 200, y: 0 },
        config: { kind: 'cache', hitRate, eviction: 'lru', maxMemoryGb: 4 },
      },
      {
        id: 'db',
        type: 'sql_db',
        label: 'SQL',
        replicas: 1,
        position: { x: 300, y: 0 },
        config: {
          kind: 'sql_db',
          shardCount: 1,
          partitioningStrategy: 'hash',
          keySkew: 0,
          accessPattern: 'read_write',
          topologyRole: 'primary',
          replicationFactor: 1,
          consistency: 'strong',
        },
      },
    ],
    edges: [
      { id: 'e1', from: 'client', to: 'app', direction: 'forward', label: 'REQ' },
      { id: 'e2', from: 'app', to: 'cache', direction: 'forward', label: 'CACHE' },
      { id: 'e3', from: 'cache', to: 'db', direction: 'forward', label: 'DB' },
      { id: 'e4', from: 'app', to: 'db', direction: 'forward', label: 'DB' },
    ],
    simulation: {
      running: true,
      speed: 5,
      traffic,
      readRatio: 90,
    },
  };
}

describe('evaluateSimulation', () => {
  it('marks sql hot under high traffic when cache hitRate is low', () => {
    const low = evaluateSimulation(urlShortenerFixture(10, 5));
    expect(low.nodes.db).toBe('hot');
    expect(low.reasons.db).toContain('hit rate baixo');
  });

  it('includes a PT-BR reason for QUEUEING (warn) pressure', () => {
    const warn = evaluateSimulation(urlShortenerFixture(10, 1));
    expect(warn.nodes.db).toBe('warn');
    expect(warn.reasons.db).toEqual(expect.any(String));
    expect(warn.reasons.db!.length).toBeGreaterThan(0);
  });

  it('omits reason for ok pressure', () => {
    const idle = evaluateSimulation({
      nodes: [
        {
          id: 'lonely',
          type: 'monitoring',
          label: 'Mon',
          replicas: 1,
          position: { x: 0, y: 0 },
        },
      ],
      edges: [],
      simulation: { running: true, speed: 1, traffic: 1, readRatio: 80 },
    });
    expect(idle.nodes.lonely).toBe('ok');
    expect(idle.reasons.lonely).toBeUndefined();
  });

  it('improves sql pressure when cache hitRate is high', () => {
    const low = evaluateSimulation(urlShortenerFixture(10, 5));
    const high = evaluateSimulation(urlShortenerFixture(95, 5));
    const order = { ok: 0, warn: 1, hot: 2 } as const;
    expect(order[high.nodes.db!]).toBeLessThan(order[low.nodes.db!]);
  });

  it('ignores speed for pressure (same traffic/config → same pressures)', () => {
    const a = urlShortenerFixture(50, 5);
    const b = { ...a, simulation: { ...a.simulation!, speed: 1 } };
    expect(evaluateSimulation(a).nodes).toEqual(evaluateSimulation(b).nodes);
  });

  it('maps pressure levels to educational latencyMs', () => {
    const hot = evaluateSimulation(urlShortenerFixture(10, 5));
    expect(hot.nodes.db).toBe('hot');
    expect(hot.latencyMs.db).toBe(280);

    const warn = evaluateSimulation(urlShortenerFixture(10, 1));
    expect(warn.nodes.db).toBe('warn');
    expect(warn.latencyMs.db).toBe(120);

    const idle = evaluateSimulation({
      nodes: [
        {
          id: 'lonely',
          type: 'monitoring',
          label: 'Mon',
          replicas: 1,
          position: { x: 0, y: 0 },
        },
      ],
      edges: [],
      simulation: { running: true, speed: 1, traffic: 1, readRatio: 80 },
    });
    expect(idle.nodes.lonely).toBe('ok');
    expect(idle.latencyMs.lonely).toBe(35);
  });

  it('does not change latencyMs when only speed changes', () => {
    const a = urlShortenerFixture(50, 5);
    const b = { ...a, simulation: { ...a.simulation!, speed: 1 } };
    const ea = evaluateSimulation(a);
    const eb = evaluateSimulation(b);
    expect(ea.nodes).toEqual(eb.nodes);
    expect(ea.latencyMs).toEqual(eb.latencyMs);
  });

  it('increases sql capacity with more shards', () => {
    const base = urlShortenerFixture(20, 5);
    const sharded: ArchitectureGraph = {
      ...base,
      nodes: base.nodes.map((n) =>
        n.id === 'db'
          ? {
              ...n,
              config: {
                kind: 'sql_db' as const,
                shardCount: 64,
                partitioningStrategy: 'hash' as const,
                keySkew: 0,
                accessPattern: 'read_write' as const,
                topologyRole: 'primary' as const,
                replicationFactor: 1 as const,
                consistency: 'strong' as const,
              },
            }
          : n,
      ),
    };
    const order = { ok: 0, warn: 1, hot: 2 } as const;
    expect(order[evaluateSimulation(sharded).nodes.db!]).toBeLessThanOrEqual(
      order[evaluateSimulation(base).nodes.db!],
    );
  });

  it('increases origin pressure when CDN TTL is low vs default (JR-19)', () => {
    function cdnGraph(ttlSeconds: number): ArchitectureGraph {
      return {
        nodes: [
          {
            id: 'client',
            type: 'client_web',
            label: 'Client',
            replicas: 1,
            position: { x: 0, y: 0 },
          },
          {
            id: 'cdn',
            type: 'cdn',
            label: 'CDN',
            replicas: 1,
            position: { x: 50, y: 0 },
            config: { kind: 'cdn', hitRate: 95, ttlSeconds, edgeRegions: 8 },
          },
          {
            id: 'origin',
            type: 'app_server',
            label: 'Origin',
            replicas: 1,
            position: { x: 100, y: 0 },
          },
        ],
        edges: [
          { id: 'e1', from: 'client', to: 'cdn', direction: 'forward' },
          { id: 'e2', from: 'cdn', to: 'origin', direction: 'forward' },
        ],
        simulation: { running: true, speed: 1, traffic: 5, readRatio: 90 },
      };
    }
    const order = { ok: 0, warn: 1, hot: 2 } as const;
    const lowTtl = evaluateSimulation(cdnGraph(60));
    const defaultTtl = evaluateSimulation(cdnGraph(3600));
    expect(order[lowTtl.nodes.origin!]).toBeGreaterThan(order[defaultTtl.nodes.origin!]);
  });

  it('raises MQ pressure for memory durability vs disk (JR-19)', () => {
    function mqGraph(durability: 'memory' | 'disk'): ArchitectureGraph {
      return {
        nodes: [
          {
            id: 'app',
            type: 'app_server',
            label: 'App',
            replicas: 1,
            position: { x: 0, y: 0 },
          },
          {
            id: 'mq',
            type: 'message_queue',
            label: 'MQ',
            replicas: 1,
            position: { x: 100, y: 0 },
            config: {
              kind: 'mq',
              durability,
              partitionCount: 3,
              delivery: 'at_least_once',
            },
          },
        ],
        edges: [{ id: 'e1', from: 'app', to: 'mq', direction: 'forward' }],
        simulation: { running: true, speed: 1, traffic: 3, readRatio: 20 },
      };
    }
    const order = { ok: 0, warn: 1, hot: 2 } as const;
    const memory = evaluateSimulation(mqGraph('memory'));
    const disk = evaluateSimulation(mqGraph('disk'));
    expect(order[memory.nodes.mq!]).toBeGreaterThan(order[disk.nodes.mq!]);
  });

  it('raises WebSocket Gateway pressure when fan-out is low (JR-19)', () => {
    function wsGraph(fanOutLimit: number): ArchitectureGraph {
      return {
        nodes: [
          {
            id: 'client',
            type: 'client_web',
            label: 'Client',
            replicas: 1,
            position: { x: 0, y: 0 },
          },
          {
            id: 'ws',
            type: 'websocket_gateway',
            label: 'WS',
            replicas: 1,
            position: { x: 100, y: 0 },
            config: { kind: 'ws', fanOutLimit, stickySessions: true },
          },
        ],
        edges: [{ id: 'e1', from: 'client', to: 'ws', direction: 'forward' }],
        simulation: { running: true, speed: 1, traffic: 2, readRatio: 50 },
      };
    }
    const order = { ok: 0, warn: 1, hot: 2 } as const;
    const low = evaluateSimulation(wsGraph(500));
    const high = evaluateSimulation(wsGraph(10_000));
    expect(order[low.nodes.ws!]).toBeGreaterThan(order[high.nodes.ws!]);
  });

  it('marks uncached SQL hot under absolute 50k read-heavy RPS', () => {
    const graph: ArchitectureGraph = {
      nodes: [
        {
          id: 'client',
          type: 'client_web',
          label: 'Client',
          replicas: 1,
          position: { x: 0, y: 0 },
        },
        {
          id: 'app',
          type: 'app_server',
          label: 'App',
          replicas: 1,
          position: { x: 100, y: 0 },
        },
        {
          id: 'db',
          type: 'sql_db',
          label: 'SQL',
          replicas: 1,
          position: { x: 200, y: 0 },
          config: {
            kind: 'sql_db',
            shardCount: 1,
            partitioningStrategy: 'hash',
            keySkew: 0,
            accessPattern: 'read_write',
            topologyRole: 'primary',
            replicationFactor: 1,
            consistency: 'strong',
          },
        },
      ],
      edges: [
        { id: 'e1', from: 'client', to: 'app', direction: 'forward', label: 'REQ' },
        { id: 'e2', from: 'app', to: 'db', direction: 'forward', label: 'DB' },
      ],
      simulation: {
        running: true,
        speed: 1,
        traffic: 1,
        readRatio: 90,
        rps: 50_000,
        readRps: 45_000,
        writeRps: 5_000,
      },
    };
    const result = evaluateSimulation(graph);
    expect(result.ingressRps).toBe(50_000);
    expect(result.nodes.db).toBe('hot');
  });

  it('reduces sync DB pressure when app also publishes to MQ (async decoupling)', () => {
    const baseNodes = [
      {
        id: 'client',
        type: 'client_web' as const,
        label: 'Client',
        replicas: 1,
        position: { x: 0, y: 0 },
      },
      {
        id: 'app',
        type: 'app_server' as const,
        label: 'App',
        replicas: 4,
        position: { x: 100, y: 0 },
      },
      {
        id: 'db',
        type: 'sql_db' as const,
        label: 'SQL',
        replicas: 2,
        position: { x: 200, y: 0 },
        config: {
          kind: 'sql_db' as const,
          shardCount: 2,
          partitioningStrategy: 'hash' as const,
          keySkew: 0,
          accessPattern: 'read_write' as const,
          topologyRole: 'primary' as const,
          replicationFactor: 1,
          consistency: 'strong' as const,
        },
      },
    ];
    const sim = {
      running: true,
      speed: 1,
      traffic: 1,
      readRatio: 40,
      rps: 8_000,
      writeRps: 4_800,
      readRps: 3_200,
    };
    const syncOnly: ArchitectureGraph = {
      nodes: baseNodes,
      edges: [
        { id: 'e1', from: 'client', to: 'app', direction: 'forward', label: 'REQ' },
        { id: 'e2', from: 'app', to: 'db', direction: 'forward', label: 'DB' },
      ],
      simulation: sim,
    };
    const withMq: ArchitectureGraph = {
      nodes: [
        ...baseNodes,
        {
          id: 'mq',
          type: 'message_queue',
          label: 'MQ',
          replicas: 2,
          position: { x: 150, y: 80 },
          config: {
            kind: 'mq',
            durability: 'disk',
            partitionCount: 8,
            deliveryGuarantee: 'at_least_once',
          },
        },
      ],
      edges: [
        { id: 'e1', from: 'client', to: 'app', direction: 'forward', label: 'REQ' },
        { id: 'e2', from: 'app', to: 'db', direction: 'forward', label: 'DB' },
        { id: 'e3', from: 'app', to: 'mq', direction: 'forward', label: 'REQ' },
      ],
      simulation: sim,
    };
    const order = { ok: 0, warn: 1, hot: 2 } as const;
    const sync = evaluateSimulation(syncOnly);
    const asyncPath = evaluateSimulation(withMq);
    expect(order[asyncPath.nodes.db!]).toBeLessThanOrEqual(order[sync.nodes.db!]);
    expect(asyncPath.nodes.db === 'hot' && sync.nodes.db === 'ok').toBe(false);
  });

  it('concentrates write load on primary vs replica topologyRole', () => {
    const graph: ArchitectureGraph = {
      nodes: [
        {
          id: 'client',
          type: 'client_web',
          label: 'Client',
          replicas: 1,
          position: { x: 0, y: 0 },
        },
        {
          id: 'app',
          type: 'app_server',
          label: 'App',
          replicas: 2,
          position: { x: 100, y: 0 },
        },
        {
          id: 'primary',
          type: 'sql_db',
          label: 'Primary',
          replicas: 1,
          position: { x: 200, y: 0 },
          config: {
            kind: 'sql_db',
            shardCount: 1,
            partitioningStrategy: 'hash',
            keySkew: 0,
            accessPattern: 'write',
            topologyRole: 'primary',
            replicationFactor: 2,
            consistency: 'strong',
          },
        },
        {
          id: 'replica',
          type: 'sql_db',
          label: 'Replica',
          replicas: 1,
          position: { x: 200, y: 80 },
          config: {
            kind: 'sql_db',
            shardCount: 1,
            partitioningStrategy: 'hash',
            keySkew: 0,
            accessPattern: 'read',
            topologyRole: 'replica',
            replicationFactor: 2,
            consistency: 'strong',
          },
        },
      ],
      edges: [
        { id: 'e1', from: 'client', to: 'app', direction: 'forward', label: 'REQ' },
        { id: 'e2', from: 'app', to: 'primary', direction: 'forward', label: 'DB' },
        { id: 'e3', from: 'app', to: 'replica', direction: 'forward', label: 'DB' },
      ],
      simulation: {
        running: true,
        speed: 1,
        traffic: 1,
        readRatio: 30,
        rps: 6_000,
        writeRps: 4_200,
        readRps: 1_800,
      },
    };
    const result = evaluateSimulation(graph);
    const order = { ok: 0, warn: 1, hot: 2 } as const;
    expect(order[result.nodes.primary!]).toBeGreaterThanOrEqual(order[result.nodes.replica!]);
  });

  it('returns baseline metrics fields without chaos', () => {
    const result = evaluateSimulation(urlShortenerFixture(90, 1));
    expect(result.errorRate).toBeGreaterThanOrEqual(0);
    expect(result.availability).toBeGreaterThan(0);
    expect(result.avgLatencyMs).toBeGreaterThanOrEqual(0);
    expect(result.p99LatencyMs).toBeGreaterThanOrEqual(result.p95LatencyMs);
  });

  it('instance_crash drops availability vs baseline', () => {
    const graph = urlShortenerFixture(90, 2);
    const baseline = evaluateSimulation(graph);
    const crashed = evaluateSimulation(graph, { eventId: 'instance_crash', targetNodeId: 'app' });
    expect(crashed.availability).toBeLessThan(baseline.availability);
  });

  it('cache_stampede increases db pressure vs high hit rate baseline', () => {
    const graph = urlShortenerFixture(95, 5);
    const baseline = evaluateSimulation(graph);
    const stampede = evaluateSimulation(graph, { eventId: 'cache_stampede' });
    const order = { ok: 0, warn: 1, hot: 2 } as const;
    expect(order[stampede.nodes.db!]).toBeGreaterThanOrEqual(order[baseline.nodes.db!]);
  });
});
