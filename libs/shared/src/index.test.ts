import { describe, expect, it } from 'vitest';
import type { ArchitectureGraph, ComponentType, Problem } from '@sdq/shared';
import { validateGraph } from '@sdq/shared';

describe('@sdq/shared public API', () => {
  it('exports ArchitectureGraph, ComponentType, and Problem types at package boundary', () => {
    const graph: ArchitectureGraph = {
      nodes: [
        {
          id: 'n1',
          type: 'cdn' satisfies ComponentType,
          label: 'CDN',
          position: { x: 0, y: 0, z: 0 },
        },
      ],
      edges: [],
    };

    const problem: Problem = {
      id: 'url-shortener',
      title: 'URL Shortener',
      difficulty: 'easy',
      description: 'Design a URL shortener',
      metrics: { rps: 1000 },
    };

    expect(validateGraph(graph).valid).toBe(true);
    expect(problem.difficulty).toBe('easy');
    expect(graph.nodes[0]?.type).toBe('cdn');
  });
});
