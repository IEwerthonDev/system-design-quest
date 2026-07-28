import { describe, expect, it } from 'vitest';
import type { ArchitectureGraph } from '../schema/architecture-graph';
import { analyzeTopology } from './analyze-topology';
import { evaluateSimulation } from './evaluate-simulation';

function readHeavyUncached(): ArchitectureGraph {
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
      targetAvailability: 99.9,
    },
  };
}

describe('analyzeTopology', () => {
  it('flags MISSING_CACHE and SPOF for read-heavy uncached single SQL', () => {
    const graph = readHeavyUncached();
    const evalResult = evaluateSimulation(graph);
    const findings = analyzeTopology(graph, evalResult);
    const codes = findings.map((f) => f.code);
    expect(codes).toContain('MISSING_CACHE');
    expect(codes).toContain('SPOF');
    expect(codes).toContain('BOTTLENECK');
    expect(codes).toContain('SINGLE_PRIMARY');
  });

  it('flags MISSING_MQ for write-heavy sync app→DB without queue', () => {
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
          replicas: 4,
          position: { x: 100, y: 0 },
        },
        {
          id: 'db',
          type: 'sql_db',
          label: 'SQL',
          replicas: 2,
          position: { x: 200, y: 0 },
          config: {
            kind: 'sql_db',
            shardCount: 4,
            partitioningStrategy: 'hash',
            keySkew: 0,
            accessPattern: 'read_write',
            topologyRole: 'primary',
            replicationFactor: 3,
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
        readRatio: 30,
        writeRps: 2_000,
        readRps: 500,
      },
    };
    const codes = analyzeTopology(graph).map((f) => f.code);
    expect(codes).toContain('MISSING_MQ');
    expect(codes).toContain('NO_LB');
  });

  it('flags CACHE_OFF_PATH when cache is disconnected from DB path', () => {
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
          id: 'lb',
          type: 'load_balancer',
          label: 'LB',
          replicas: 2,
          position: { x: 50, y: 0 },
        },
        {
          id: 'cache',
          type: 'cache_redis',
          label: 'Cache',
          replicas: 2,
          position: { x: 150, y: 50 },
          config: { kind: 'cache', hitRate: 90, eviction: 'lru', maxMemoryGb: 4 },
        },
        {
          id: 'db',
          type: 'sql_db',
          label: 'SQL',
          replicas: 2,
          position: { x: 200, y: 0 },
          config: {
            kind: 'sql_db',
            shardCount: 4,
            partitioningStrategy: 'hash',
            keySkew: 0,
            accessPattern: 'read_write',
            topologyRole: 'primary',
            replicationFactor: 3,
            consistency: 'strong',
          },
        },
      ],
      edges: [
        { id: 'e1', from: 'client', to: 'lb', direction: 'forward', label: 'REQ' },
        { id: 'e2', from: 'lb', to: 'app', direction: 'forward', label: 'REQ' },
        { id: 'e3', from: 'app', to: 'db', direction: 'forward', label: 'DB' },
      ],
      simulation: {
        running: true,
        speed: 1,
        traffic: 1,
        readRatio: 90,
        rps: 1_000,
      },
    };
    const codes = analyzeTopology(graph).map((f) => f.code);
    expect(codes).toContain('CACHE_OFF_PATH');
  });

  it('emits QUEUE_BACKLOG for warn pressure nodes', () => {
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
      ],
      edges: [{ id: 'e1', from: 'client', to: 'app', direction: 'forward', label: 'REQ' }],
      simulation: {
        running: true,
        speed: 1,
        traffic: 1,
        readRatio: 50,
        rps: 1_600,
      },
    };
    const evalResult = evaluateSimulation(graph);
    const forced = {
      ...evalResult,
      nodes: { ...evalResult.nodes, app: 'warn' as const },
    };
    const codes = analyzeTopology(graph, forced).map((f) => f.code);
    expect(codes).toContain('QUEUE_BACKLOG');
  });

  it('emits HOT_PARTITION when skewed SQL is hot', () => {
    const graph: ArchitectureGraph = {
      nodes: [
        {
          id: 'db',
          type: 'sql_db',
          label: 'SQL',
          replicas: 1,
          position: { x: 0, y: 0 },
          config: {
            kind: 'sql_db',
            shardCount: 1,
            partitioningStrategy: 'hash',
            keySkew: 80,
            accessPattern: 'read_write',
            topologyRole: 'primary',
            replicationFactor: 1,
            consistency: 'strong',
          },
        },
      ],
      edges: [],
      simulation: { running: true, speed: 1, traffic: 5, readRatio: 50 },
    };
    const forced = {
      nodes: { db: 'hot' as const },
      latencyMs: { db: 280 },
      reasons: {},
      hotReadPath: false,
      ingressRps: 1000,
    };
    const codes = analyzeTopology(graph, forced).map((f) => f.code);
    expect(codes).toContain('HOT_PARTITION');
    expect(codes).toContain('BOTTLENECK');
  });
});
