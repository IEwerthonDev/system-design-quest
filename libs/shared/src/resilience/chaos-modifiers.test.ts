import { describe, expect, it } from 'vitest';
import type { ArchitectureGraph } from '../schema/architecture-graph';
import { pickChaosTarget, resolveChaosEffects } from './chaos-modifiers';

function fixture(replicas = 1): ArchitectureGraph {
  return {
    nodes: [
      { id: 'client', type: 'client_web', label: 'Client', replicas: 1, position: { x: 0, y: 0 } },
      { id: 'app', type: 'app_server', label: 'App', replicas, position: { x: 100, y: 0 } },
      { id: 'db', type: 'sql_db', label: 'SQL', replicas: 1, position: { x: 200, y: 0 } },
    ],
    edges: [
      { id: 'e1', from: 'client', to: 'app', direction: 'forward' },
      { id: 'e2', from: 'app', to: 'db', direction: 'forward' },
    ],
    simulation: { running: true, speed: 1, traffic: 3, readRatio: 80 },
  };
}

describe('resolveChaosEffects', () => {
  it('halves capacity on cpu_spike target', () => {
    const fx = resolveChaosEffects(fixture(), { eventId: 'cpu_spike', targetNodeId: 'app' });
    expect(fx.capacityMultiplierByNode.app).toBe(0.5);
    expect(fx.ingressMultiplier).toBe(1);
  });

  it('zeros capacity on single-replica instance_crash', () => {
    const fx = resolveChaosEffects(fixture(1), { eventId: 'instance_crash', targetNodeId: 'app' });
    expect(fx.capacityMultiplierByNode.app).toBe(0);
    expect(fx.availabilityCap).toBe(0);
  });

  it('partially reduces multi-replica crash', () => {
    const fx = resolveChaosEffects(fixture(4), { eventId: 'instance_crash', targetNodeId: 'app' });
    expect(fx.capacityMultiplierByNode.app).toBe(0.75);
  });

  it('multiplies ingress on traffic_surge without target', () => {
    const fx = resolveChaosEffects(fixture(), { eventId: 'traffic_surge' });
    expect(fx.ingressMultiplier).toBe(5);
    expect(fx.targetNodeId).toBeNull();
  });

  it('forces cache hitRate override on stampede', () => {
    const fx = resolveChaosEffects(fixture(), { eventId: 'cache_stampede' });
    expect(fx.hitRateOverride).toBe(0);
  });

  it('picks hottest non-client when no preferred target', () => {
    const id = pickChaosTarget(fixture(), undefined, { client: 'ok', app: 'ok', db: 'hot' });
    expect(id).toBe('db');
  });

  it('returns empty effects for empty graph', () => {
    const fx = resolveChaosEffects(
      { nodes: [], edges: [], simulation: { running: false, speed: 1, traffic: 1, readRatio: 50 } },
      { eventId: 'cpu_spike' },
    );
    expect(fx.capacityMultiplierByNode).toEqual({});
    expect(fx.targetNodeId).toBeNull();
  });
});
