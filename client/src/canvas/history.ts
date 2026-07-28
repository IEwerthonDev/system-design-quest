import type { ArchitectureGraph } from '@sdq/shared';

export const GRAPH_HISTORY_MAX = 50;

export interface GraphHistory {
  push(graph: ArchitectureGraph): void;
  undo(): ArchitectureGraph | null;
  redo(): ArchitectureGraph | null;
  canUndo(): boolean;
  canRedo(): boolean;
  clear(): void;
}

function cloneGraph(graph: ArchitectureGraph): ArchitectureGraph {
  if (typeof structuredClone === 'function') {
    return structuredClone(graph);
  }
  return JSON.parse(JSON.stringify(graph)) as ArchitectureGraph;
}

/**
 * Snapshot history for architecture graphs.
 * `push` records a new present state (previous present becomes undoable; redo clears).
 */
export function createGraphHistory(maxDepth: number = GRAPH_HISTORY_MAX): GraphHistory {
  const past: ArchitectureGraph[] = [];
  let present: ArchitectureGraph | null = null;
  const future: ArchitectureGraph[] = [];

  return {
    push(graph) {
      if (present !== null) {
        past.push(present);
        while (past.length > maxDepth) {
          past.shift();
        }
      }
      present = cloneGraph(graph);
      future.length = 0;
    },
    undo() {
      if (past.length === 0) {
        return null;
      }
      if (present !== null) {
        future.push(present);
      }
      present = past.pop()!;
      return cloneGraph(present);
    },
    redo() {
      if (future.length === 0) {
        return null;
      }
      if (present !== null) {
        past.push(present);
      }
      present = future.pop()!;
      return cloneGraph(present);
    },
    canUndo() {
      return past.length > 0;
    },
    canRedo() {
      return future.length > 0;
    },
    clear() {
      past.length = 0;
      future.length = 0;
      present = null;
    },
  };
}
