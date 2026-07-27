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

  it('rejects duplicate node ids with descriptive error', () => {
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
    expect(result.errors).toContainEqual({
      code: 'DUPLICATE_NODE_ID',
      message: 'Duplicate node id: dup',
      field: 'dup',
    });
  });

  it('rejects edges with missing source node', () => {
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
    expect(result.errors).toContainEqual({
      code: 'ORPHAN_EDGE',
      message: 'Edge orphan references missing source node: missing',
      field: 'orphan',
    });
  });

  it('rejects edges with missing target node', () => {
    const result = validateGraph({
      nodes: [
        {
          id: 'source',
          type: 'app_server',
          label: 'App',
          position: { x: 0, y: 0, z: 0 },
        },
      ],
      edges: [
        {
          id: 'missing-target',
          from: 'source',
          to: 'ghost',
          direction: 'forward',
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      code: 'ORPHAN_EDGE',
      message: 'Edge missing-target references missing target node: ghost',
      field: 'missing-target',
    });
  });
});
