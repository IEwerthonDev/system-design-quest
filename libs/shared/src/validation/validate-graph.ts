import type { ArchitectureGraph } from '../schema/architecture-graph';

export interface ValidationError {
  code: 'EMPTY_GRAPH' | 'DUPLICATE_NODE_ID' | 'ORPHAN_EDGE';
  message: string;
  field?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export function validateGraph(graph: ArchitectureGraph): ValidationResult {
  const errors: ValidationError[] = [];

  if (!graph.nodes.length) {
    errors.push({
      code: 'EMPTY_GRAPH',
      message: 'Architecture graph must contain at least one component',
    });
  }

  const nodeIds = new Set<string>();
  for (const node of graph.nodes) {
    if (nodeIds.has(node.id)) {
      errors.push({
        code: 'DUPLICATE_NODE_ID',
        message: `Duplicate node id: ${node.id}`,
        field: node.id,
      });
    }
    nodeIds.add(node.id);
  }

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.from)) {
      errors.push({
        code: 'ORPHAN_EDGE',
        message: `Edge ${edge.id} references missing source node: ${edge.from}`,
        field: edge.id,
      });
    }
    if (!nodeIds.has(edge.to)) {
      errors.push({
        code: 'ORPHAN_EDGE',
        message: `Edge ${edge.id} references missing target node: ${edge.to}`,
        field: edge.id,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}
