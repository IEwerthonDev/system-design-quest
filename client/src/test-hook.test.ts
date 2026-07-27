import { describe, expect, it, beforeEach } from 'vitest';
import { getGameState, initGameState, setGraph, setMode, setPhase } from './test-hook';

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

  it('tracks phase and mode', () => {
    setPhase('requirements');
    setMode('speedrun');
    expect(getGameState().phase).toBe('requirements');
    expect(getGameState().mode).toBe('speedrun');
  });
});
