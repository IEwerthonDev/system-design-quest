import { describe, expect, it } from 'vitest';
import type { ArchitectureGraph } from '@sdq/shared';
import { createGraphHistory, GRAPH_HISTORY_MAX } from './history';

function graphWithNodes(count: number): ArchitectureGraph {
  return {
    nodes: Array.from({ length: count }, (_, i) => ({
      id: `n${i}`,
      type: 'app_server' as const,
      label: `App ${i}`,
      position: { x: i, y: 0, z: 0 },
    })),
    edges: [],
  };
}

describe('graph history', () => {
  it('undo restores the previous snapshot after push', () => {
    const history = createGraphHistory();
    history.push(graphWithNodes(0));
    history.push(graphWithNodes(1));

    const restored = history.undo();
    expect(restored?.nodes).toHaveLength(0);
    expect(history.canRedo()).toBe(true);
  });

  it('redo restores after undo', () => {
    const history = createGraphHistory();
    history.push(graphWithNodes(0));
    history.push(graphWithNodes(1));
    history.undo();

    const redone = history.redo();
    expect(redone?.nodes).toHaveLength(1);
    expect(history.canUndo()).toBe(true);
  });

  it('empty undo is a no-op returning null', () => {
    const history = createGraphHistory();
    history.push(graphWithNodes(0));
    expect(history.undo()).toBeNull();
    expect(history.canUndo()).toBe(false);
  });

  it('divergent edit after undo clears redo', () => {
    const history = createGraphHistory();
    history.push(graphWithNodes(0));
    history.push(graphWithNodes(1));
    history.undo();
    expect(history.canRedo()).toBe(true);

    history.push(graphWithNodes(2));
    expect(history.canRedo()).toBe(false);
    expect(history.redo()).toBeNull();
  });

  it(`caps undo depth at ${GRAPH_HISTORY_MAX}`, () => {
    const history = createGraphHistory();
    history.push(graphWithNodes(0));
    for (let i = 1; i <= GRAPH_HISTORY_MAX + 5; i += 1) {
      history.push(graphWithNodes(i));
    }

    let steps = 0;
    while (history.undo()) {
      steps += 1;
    }
    expect(steps).toBe(GRAPH_HISTORY_MAX);
  });
});
