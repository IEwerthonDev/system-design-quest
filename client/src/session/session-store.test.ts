import { describe, expect, it, beforeEach } from 'vitest';
import type { ArchitectureGraph } from '@sdq/shared';
import { PHASE_ORDER } from './phase-machine';
import {
  advancePhase,
  createSession,
  getGraph,
  getSession,
  resetSessionStore,
  setGraph,
} from './session-store';

const sampleGraph: ArchitectureGraph = {
  nodes: [
    {
      id: 'app-1',
      type: 'app_server',
      label: 'App',
      position: { x: 1, y: 0, z: 2 },
    },
  ],
  edges: [],
};

describe('session store', () => {
  beforeEach(() => {
    resetSessionStore();
  });

  it('createSession(problemId, mode) starts at briefing with empty graph', () => {
    const session = createSession('url-shortener', 'study');

    expect(session.problemId).toBe('url-shortener');
    expect(session.mode).toBe('study');
    expect(session.phase).toBe('briefing');
    expect(session.graph).toEqual({ nodes: [], edges: [] });
    expect(session.requirements).toEqual({ functional: [], nonFunctional: [] });
    expect(session.id.length).toBeGreaterThan(0);
    expect(session.startedAt).toBeGreaterThan(0);
  });

  it('advancePhase walks briefing → requirements → canvas → result', () => {
    createSession('url-shortener', 'study');

    expect(advancePhase().phase).toBe('requirements');
    expect(advancePhase().phase).toBe('canvas');
    expect(advancePhase().phase).toBe('result');
  });

  it('advancePhase throws when already at result', () => {
    createSession('url-shortener', 'study');
    for (let i = 0; i < PHASE_ORDER.length - 1; i += 1) {
      advancePhase();
    }
    expect(getSession()?.phase).toBe('result');
    expect(() => advancePhase()).toThrow(/cannot advance/i);
  });

  it('setGraph and getGraph round-trip a serializable ArchitectureGraph', () => {
    createSession('url-shortener', 'study');
    setGraph(sampleGraph);

    const graph = getGraph();
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0]?.type).toBe('app_server');

    const serialized = JSON.parse(JSON.stringify(graph));
    expect(serialized.nodes[0].position).toEqual({ x: 1, y: 0, z: 2 });
  });

  it('setGraph updates the active session graph without replacing session identity', () => {
    const session = createSession('url-shortener', 'speedrun');
    setGraph(sampleGraph);

    expect(getSession()?.id).toBe(session.id);
    expect(getSession()?.graph.nodes).toHaveLength(1);
  });

  it('exposes session state via window.__GAME_STATE__', () => {
    createSession('url-shortener', 'speedrun');
    setGraph(sampleGraph);
    advancePhase();

    expect(window.__GAME_STATE__).toMatchObject({
      problemId: 'url-shortener',
      mode: 'speedrun',
      phase: 'requirements',
      graph: { nodes: [{ id: 'app-1', type: 'app_server' }], edges: [] },
    });

    const serialized = JSON.stringify(window.__GAME_STATE__);
    expect(serialized).toContain('url-shortener');
    expect(serialized).toContain('app_server');
  });
});
