import { describe, expect, it } from 'vitest';
import type { ArchitectureGraph, ComponentNode } from '../schema/architecture-graph';
import {
  DEFAULT_SIMULATION,
  defaultConfigForType,
  normalizeGraph,
  normalizeNode,
} from './normalize-graph';

describe('normalizeGraph', () => {
  it('fills replicas=1 and default simulation for legacy nodes', () => {
    const legacy = {
      nodes: [
        {
          id: 'n1',
          type: 'app_server',
          label: 'App',
          note: 'old note',
          position: { x: 1, y: 2, z: 3 },
        } as ComponentNode,
      ],
      edges: [],
    } as ArchitectureGraph;

    // Simulate missing replicas at runtime
    delete (legacy.nodes[0] as { replicas?: number }).replicas;

    const normalized = normalizeGraph(legacy);
    expect(normalized.nodes[0]?.replicas).toBe(1);
    expect(normalized.nodes[0]?.implementationNotes).toBe('old note');
    expect(normalized.simulation).toEqual(DEFAULT_SIMULATION);
    expect(normalized.nodes[0]?.position).toEqual({ x: 1, y: 2, z: 3 });
  });

  it('clamps replicas and applies typed config defaults', () => {
    const node = normalizeNode({
      id: 'c1',
      type: 'cache_redis',
      label: 'Cache',
      replicas: 0,
      position: { x: 0, y: 0 },
    });
    expect(node.replicas).toBe(1);
    expect(node.config).toEqual({ kind: 'cache', hitRate: 90 });
    expect(defaultConfigForType('cdn')).toEqual({
      kind: 'cdn',
      hitRate: 99,
      ttlSeconds: 3600,
    });
    expect(defaultConfigForType('sql_db')?.kind).toBe('sql_db');
    expect(defaultConfigForType('message_queue')).toEqual({
      kind: 'mq',
      durability: 'disk',
      partitionCount: 3,
    });
    expect(defaultConfigForType('kafka')?.kind).toBe('mq');
    expect(defaultConfigForType('pub_sub')?.kind).toBe('mq');
    expect(defaultConfigForType('websocket_gateway')).toEqual({
      kind: 'ws',
      fanOutLimit: 10_000,
    });
    expect(defaultConfigForType('load_balancer')).toEqual({
      kind: 'lb',
      algorithm: 'round_robin',
    });
  });

  it('clamps simulation speed and traffic to 1–5', () => {
    const high = normalizeGraph({
      nodes: [],
      edges: [],
      simulation: { running: true, speed: 10, traffic: 9, readRatio: 50 },
    });
    expect(high.simulation?.speed).toBe(5);
    expect(high.simulation?.traffic).toBe(5);

    const low = normalizeGraph({
      nodes: [],
      edges: [],
      simulation: { running: false, speed: 0, traffic: -3, readRatio: 50 },
    });
    expect(low.simulation?.speed).toBe(1);
    expect(low.simulation?.traffic).toBe(1);
  });

  it('clamps hitRate and sql fields on existing config', () => {
    const cache = normalizeNode({
      id: 'c',
      type: 'cache_redis',
      label: 'Cache',
      replicas: 2,
      position: { x: 0, y: 0 },
      config: { kind: 'cache', hitRate: 150 },
    });
    expect(cache.config).toEqual({ kind: 'cache', hitRate: 100 });

    const sql = normalizeNode({
      id: 's',
      type: 'sql_db',
      label: 'SQL',
      replicas: 1,
      position: { x: 0, y: 0 },
      config: {
        kind: 'sql_db',
        shardCount: 0,
        partitioningStrategy: 'geographic',
        keySkew: -5,
      },
    });
    expect(sql.config).toEqual({
      kind: 'sql_db',
      shardCount: 1,
      partitioningStrategy: 'geographic',
      keySkew: 0,
      accessPattern: 'read_write',
      topologyRole: 'primary',
    });
  });

  it('defaults accessPattern and topologyRole for sql_db and nosql_db', () => {
    const sql = normalizeNode({
      id: 's',
      type: 'sql_db',
      label: 'SQL',
      position: { x: 0, y: 0 },
    });
    expect(sql.config).toEqual({
      kind: 'sql_db',
      shardCount: 1,
      partitioningStrategy: 'hash',
      keySkew: 0,
      accessPattern: 'read_write',
      topologyRole: 'primary',
    });

    const nosql = normalizeNode({
      id: 'n',
      type: 'nosql_db',
      label: 'NoSQL',
      position: { x: 0, y: 0 },
      config: {
        kind: 'nosql_db',
        accessPattern: 'read',
        topologyRole: 'replica',
      },
    });
    expect(nosql.config).toEqual({
      kind: 'nosql_db',
      accessPattern: 'read',
      topologyRole: 'replica',
    });
  });

  it('rejects invalid accessPattern / topologyRole into defaults', () => {
    const sql = normalizeNode({
      id: 's',
      type: 'sql_db',
      label: 'SQL',
      position: { x: 0, y: 0 },
      config: {
        kind: 'sql_db',
        shardCount: 2,
        partitioningStrategy: 'hash',
        keySkew: 0,
        accessPattern: 'both' as never,
        topologyRole: 'master' as never,
      },
    });
    expect(sql.config).toMatchObject({
      accessPattern: 'read_write',
      topologyRole: 'primary',
    });
  });

  it('clamps scale-critical cdn/mq/ws/lb configs (JR-22)', () => {
    const cdn = normalizeNode({
      id: 'cdn',
      type: 'cdn',
      label: 'CDN',
      replicas: 1,
      position: { x: 0, y: 0 },
      config: { kind: 'cdn', hitRate: -10, ttlSeconds: 999_999 },
    });
    expect(cdn.config).toEqual({ kind: 'cdn', hitRate: 0, ttlSeconds: 86_400 });

    const mq = normalizeNode({
      id: 'mq',
      type: 'message_queue',
      label: 'MQ',
      replicas: 1,
      position: { x: 0, y: 0 },
      config: { kind: 'mq', durability: 'memory', partitionCount: 0 },
    });
    expect(mq.config).toEqual({ kind: 'mq', durability: 'memory', partitionCount: 1 });

    const ws = normalizeNode({
      id: 'ws',
      type: 'websocket_gateway',
      label: 'WS',
      replicas: 1,
      position: { x: 0, y: 0 },
      config: { kind: 'ws', fanOutLimit: 0 },
    });
    expect(ws.config).toEqual({ kind: 'ws', fanOutLimit: 1 });

    const lb = normalizeNode({
      id: 'lb',
      type: 'load_balancer',
      label: 'LB',
      replicas: 1,
      position: { x: 0, y: 0 },
      config: { kind: 'lb', algorithm: 'least_conn' },
    });
    expect(lb.config).toEqual({ kind: 'lb', algorithm: 'least_conn' });
  });
});
