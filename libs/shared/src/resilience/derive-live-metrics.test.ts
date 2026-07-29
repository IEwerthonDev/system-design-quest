import { describe, expect, it } from 'vitest';
import type { ArchitectureGraph } from '../schema/architecture-graph';
import { evaluateSimulation } from '../simulation/evaluate-simulation';
import { deriveLiveMetrics } from './derive-live-metrics';
import { runResilienceProbe } from './run-resilience-probe';

function simpleGraph(overprovisioned: boolean): ArchitectureGraph {
  return {
    nodes: [
      { id: 'client', type: 'client_web', label: 'Client', replicas: 1, position: { x: 0, y: 0 } },
      {
        id: 'app',
        type: 'app_server',
        label: 'App Server',
        replicas: overprovisioned ? 20 : 1,
        position: { x: 100, y: 0 },
      },
      {
        id: 'db',
        type: 'sql_db',
        label: 'SQL',
        replicas: overprovisioned ? 5 : 1,
        position: { x: 200, y: 0 },
        config: {
          kind: 'sql_db',
          shardCount: overprovisioned ? 16 : 1,
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
      { id: 'e1', from: 'client', to: 'app', direction: 'forward' },
      { id: 'e2', from: 'app', to: 'db', direction: 'forward' },
    ],
    simulation: {
      running: true,
      speed: 1,
      traffic: 2,
      readRatio: 80,
      targetAvailability: 99.9,
    },
  };
}

describe('deriveLiveMetrics', () => {
  it('exposes RPS, percentiles, hottest, SLO, and tip', () => {
    const graph = simpleGraph(true);
    const evaluation = evaluateSimulation(graph);
    const metrics = deriveLiveMetrics(graph, evaluation, {
      availabilityTarget: 99.9,
      latencyP99TargetMs: 200,
    });
    expect(metrics.totalRps).toBeGreaterThan(0);
    expect(metrics.avgLatencyMs).toBeGreaterThanOrEqual(0);
    expect(metrics.p99LatencyMs).toBeGreaterThanOrEqual(metrics.p95LatencyMs);
    expect(metrics.hottestLabel).toEqual(expect.any(String));
    expect(metrics.slo).toHaveLength(2);
    expect(metrics.tipEn.length).toBeGreaterThan(10);
  });
});

describe('runResilienceProbe', () => {
  it('returns null for empty graph', () => {
    expect(
      runResilienceProbe(
        { nodes: [], edges: [], simulation: { running: false, speed: 1, traffic: 1, readRatio: 50 } },
        'traffic_surge',
      ),
    ).toBeNull();
  });

  it('marks instance crash on single app as FAILED', () => {
    const result = runResilienceProbe(simpleGraph(false), 'instance_crash', 'app', {
      availabilityTarget: 99.9,
      latencyP99TargetMs: 100,
    });
    expect(result?.verdict).toBe('FAILED');
    expect(result?.minAvailability).toBeLessThan(99.9);
  });

  it('can SURVIVE traffic surge on overprovisioned design', () => {
    const result = runResilienceProbe(simpleGraph(true), 'traffic_surge', null, {
      availabilityTarget: 90,
      latencyP99TargetMs: 500,
    });
    expect(result?.verdict).toBe('SURVIVED');
  });

  it('evaluates event alone even if caller would have other chaos', () => {
    const a = runResilienceProbe(simpleGraph(false), 'high_latency', null, {
      availabilityTarget: 99,
      latencyP99TargetMs: 100,
    });
    const b = runResilienceProbe(simpleGraph(false), 'high_latency', null, {
      availabilityTarget: 99,
      latencyP99TargetMs: 100,
    });
    expect(a).toEqual(b);
  });
});
