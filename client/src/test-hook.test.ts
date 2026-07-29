import { describe, expect, it, beforeEach } from 'vitest';
import {
  appendResilienceResult,
  clearResilienceReport,
  getGameState,
  initGameState,
  setActiveChaos,
  setGraph,
  setLiveMetrics,
  setMode,
  setPhase,
} from './test-hook';

describe('__GAME_STATE__ test hook', () => {
  beforeEach(() => {
    initGameState();
  });

  it('exposes serializable game state on window', () => {
    const state = getGameState();
    expect(window.__GAME_STATE__).toBe(state);
    expect(state).toMatchObject({
      problemId: '',
      phase: 'canvas',
      mode: 'study',
      graph: { nodes: [], edges: [] },
      requirements: { functional: [], nonFunctional: [] },
      guidedMode: false,
      experienceLevel: null,
      guidedStep: null,
      elapsedMs: null,
      activeChaosEvent: null,
      chaosTargetNodeId: null,
      liveMetrics: null,
      resilienceReport: [],
    });
  });

  it('updates graph with a serializable ArchitectureGraph', () => {
    setGraph({
      nodes: [
        {
          id: 'lb-1',
          type: 'load_balancer',
          label: 'LB',
          position: { x: 0, y: 0, z: 0 },
        },
      ],
      edges: [],
    });

    const serialized = JSON.parse(JSON.stringify(getGameState().graph));
    expect(serialized.nodes).toHaveLength(1);
    expect(serialized.nodes[0].type).toBe('load_balancer');
  });

  it('stores ephemeral chaos and resilience report without touching graph', () => {
    setActiveChaos('cpu_spike', 'app-1');
    expect(getGameState().activeChaosEvent).toBe('cpu_spike');
    expect(getGameState().chaosTargetNodeId).toBe('app-1');
    setActiveChaos(null);
    expect(getGameState().activeChaosEvent).toBeNull();
    expect(getGameState().chaosTargetNodeId).toBeNull();

    appendResilienceResult({
      eventId: 'traffic_surge',
      eventLabelEn: 'Traffic Surge',
      eventLabelPt: 'Traffic Surge',
      minAvailability: 100,
      p99Ms: 40,
      verdict: 'SURVIVED',
    });
    expect(getGameState().resilienceReport).toHaveLength(1);
    clearResilienceReport();
    expect(getGameState().resilienceReport).toEqual([]);

    setLiveMetrics({
      totalRps: 1000,
      avgLatencyMs: 35,
      p95LatencyMs: 35,
      p99LatencyMs: 35,
      errorRate: 0,
      availability: 100,
      budgetBurn: 0,
      hottestNodeId: null,
      hottestLabel: null,
      hottestPressurePct: 0,
      activeCount: 0,
      failingCount: 0,
      slo: [],
      tipEn: 'ok',
      tipPt: 'ok',
    });
    expect(getGameState().liveMetrics?.totalRps).toBe(1000);
  });

  it('setMode and setPhase update mode/phase', () => {
    setMode('sandbox');
    setPhase('briefing');
    expect(getGameState().mode).toBe('sandbox');
    expect(getGameState().phase).toBe('briefing');
  });
});
