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
        config: { kind: 'cache', hitRate },
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
});
