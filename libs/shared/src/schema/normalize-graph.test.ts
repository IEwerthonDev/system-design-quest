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
    expect(defaultConfigForType('cdn')).toEqual({ kind: 'cdn', hitRate: 99 });
    expect(defaultConfigForType('sql_db')?.kind).toBe('sql_db');
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
    });
  });
});
