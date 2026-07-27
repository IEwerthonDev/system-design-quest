import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import type { ArchitectureGraph } from '@sdq/shared';
import {
  advancePhase,
  createSession,
  getGraph,
  getSession,
  resetSessionStore,
  setGraph,
} from '../session/session-store';
import {
  EMPTY_GRAPH_MESSAGE,
  mountSubmitPanel,
  validateLocalSubmit,
} from './submit-panel';

const sampleGraph: ArchitectureGraph = {
  nodes: [
    {
      id: 'comp-1',
      type: 'app_server',
      label: 'App',
      position: { x: 0, y: 0, z: 0 },
    },
  ],
  edges: [],
};

describe('submit panel', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    resetSessionStore();
    container = document.createElement('div');
    document.body.append(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('validateLocalSubmit rejects empty graph with PT-BR message', () => {
    expect(validateLocalSubmit({ nodes: [], edges: [] })).toEqual({
      success: false,
      error: EMPTY_GRAPH_MESSAGE,
    });
  });

  it('validateLocalSubmit accepts graph with at least one node', () => {
    expect(validateLocalSubmit(sampleGraph)).toEqual({
      success: true,
      graph: sampleGraph,
    });
  });

  it('shows local FAIL when submitting empty graph', () => {
    createSession('url-shortener', 'study');
    advancePhase();
    advancePhase();

    const panel = mountSubmitPanel(container, {
      getGraph: () => ({ nodes: [], edges: [] }),
      onSubmitSuccess: () => undefined,
    });

    const result = panel.submit();

    expect(result.success).toBe(false);
    expect(result.error).toBe(EMPTY_GRAPH_MESSAGE);
    expect(container.querySelector('[data-testid="submit-error"]')?.textContent).toBe(
      EMPTY_GRAPH_MESSAGE,
    );
    expect(getSession()?.phase).toBe('canvas');
  });

  it('advances to result phase and stores graph on valid submit', () => {
    createSession('url-shortener', 'study');
    advancePhase();
    advancePhase();

    const panel = mountSubmitPanel(container, {
      getGraph: () => sampleGraph,
      onSubmitSuccess: (graph) => {
        setGraph(graph);
        while (getSession()?.phase !== 'result') {
          advancePhase();
        }
      },
    });

    const result = panel.submit();

    expect(result.success).toBe(true);
    expect(getSession()?.phase).toBe('result');
    expect(getGraph().nodes).toHaveLength(1);
    expect(
      container
        .querySelector('[data-testid="result-placeholder"]')
        ?.classList.contains('sdq-result-placeholder--visible'),
    ).toBe(true);
    expect(window.__GAME_STATE__.phase).toBe('result');
  });
});
