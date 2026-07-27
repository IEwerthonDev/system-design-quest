import { describe, expect, it } from 'vitest';
import type { ArchitectureGraph } from '../schema/architecture-graph';
import { validateGraph } from './validate-graph';

const validGraph: ArchitectureGraph = {
  nodes: [
    {
      id: 'lb-1',
      type: 'load_balancer',
      label: 'Load Balancer',
      position: { x: 0, y: 0, z: 0 },
    },
    {
      id: 'app-1',
      type: 'app_server',
      label: 'App Server',
      position: { x: 2, y: 0, z: 0 },
    },
  ],
  edges: [
    {
      id: 'e1',
      from: 'lb-1',
      to: 'app-1',
      direction: 'forward',
    },
  ],
};

describe('validateGraph', () => {
  it('accepts a valid graph with nodes and edges', () => {
    const result = validateGraph(validGraph);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects an empty graph', () => {
    const result = validateGraph({ nodes: [], edges: [] });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      {
        code: 'EMPTY_GRAPH',
        message: 'Architecture graph must contain at least one component',
      },
    ]);
  });

  it('rejects duplicate node ids', () => {
    const result = validateGraph({
      nodes: [
        {
          id: 'dup',
          type: 'cdn',
          label: 'CDN A',
          position: { x: 0, y: 0, z: 0 },
        },
        {
          id: 'dup',
          type: 'dns',
          label: 'DNS B',
          position: { x: 1, y: 0, z: 0 },
        },
      ],
      edges: [],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'DUPLICATE_NODE_ID')).toBe(true);
  });

  it('rejects edges that reference missing nodes', () => {
    const result = validateGraph({
      nodes: [
        {
          id: 'only-node',
          type: 'sql_db',
          label: 'Database',
          position: { x: 0, y: 0, z: 0 },
        },
      ],
      edges: [
        {
          id: 'orphan',
          from: 'missing',
          to: 'only-node',
          direction: 'forward',
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'ORPHAN_EDGE')).toBe(true);
  });
});
