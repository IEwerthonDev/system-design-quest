import type { ConnectionEdge } from '@sdq/shared';
import type { ComponentManager } from './component-manager';
import { playGameSound } from '../audio/game-sounds';

export type EdgeDirection = ConnectionEdge['direction'];

export interface EdgeRegistry {
  getEdges(): ConnectionEdge[];
  setEdges(edges: ConnectionEdge[]): void;
  removeEdgesForNode(nodeId: string): ConnectionEdge[];
}

export interface EdgeManagerOptions {
  componentManager: ComponentManager;
}

export interface EdgeManager extends EdgeRegistry {
  connect(
    from: string,
    to: string,
    direction?: EdgeDirection,
  ): ConnectionEdge | null;
  getEdge(id: string): ConnectionEdge | undefined;
  setDirection(edgeId: string, direction: EdgeDirection): boolean;
  removeEdge(edgeId: string): boolean;
  setPendingSource(nodeId: string | null): void;
  getPendingSource(): string | null;
  connectToTarget(targetId: string, direction?: EdgeDirection): ConnectionEdge | null;
}

let edgeIdCounter = 0;

function nextEdgeId(): string {
  edgeIdCounter += 1;
  return `edge-${edgeIdCounter}`;
}

export function createEdgeRegistry(initial: ConnectionEdge[] = []): EdgeRegistry {
  let edges = initial.map((edge) => ({ ...edge }));

  return {
    getEdges() {
      return edges.map((edge) => ({ ...edge }));
    },
    setEdges(next) {
      edges = next.map((edge) => ({ ...edge }));
    },
    removeEdgesForNode(nodeId) {
      const removed = edges.filter((edge) => edge.from === nodeId || edge.to === nodeId);
      edges = edges.filter((edge) => edge.from !== nodeId && edge.to !== nodeId);
      return removed.map((edge) => ({ ...edge }));
    },
  };
}

export function createEdgeManager(options: EdgeManagerOptions): EdgeManager {
  const { componentManager } = options;
  const registry = createEdgeRegistry();
  let pendingSourceId: string | null = null;

  const hasOrderedPair = (from: string, to: string): boolean =>
    registry.getEdges().some((edge) => edge.from === from && edge.to === to);

  const nodeExists = (id: string): boolean => componentManager.getInstance(id) !== undefined;

  const connect = (
    from: string,
    to: string,
    direction: EdgeDirection = 'forward',
  ): ConnectionEdge | null => {
    if (from === to || !nodeExists(from) || !nodeExists(to) || hasOrderedPair(from, to)) {
      return null;
    }

    const edge: ConnectionEdge = {
      id: nextEdgeId(),
      from,
      to,
      direction,
    };

    registry.setEdges([...registry.getEdges(), edge]);
    playGameSound('connect');
    return { ...edge };
  };

  return {
    connect,
    getEdge(id) {
      return registry.getEdges().find((edge) => edge.id === id);
    },
    getEdges() {
      return registry.getEdges();
    },
    setEdges(edges) {
      registry.setEdges(edges);
    },
    setDirection(edgeId, direction) {
      const current = registry.getEdges();
      const index = current.findIndex((edge) => edge.id === edgeId);
      if (index < 0) {
        return false;
      }

      const next = [...current];
      next[index] = { ...next[index], direction };
      registry.setEdges(next);
      return true;
    },
    removeEdge(edgeId) {
      const next = registry.getEdges().filter((edge) => edge.id !== edgeId);
      if (next.length === registry.getEdges().length) {
        return false;
      }
      registry.setEdges(next);
      return true;
    },
    removeEdgesForNode(nodeId) {
      return registry.removeEdgesForNode(nodeId);
    },
    setPendingSource(nodeId) {
      if (nodeId !== null && !nodeExists(nodeId)) {
        pendingSourceId = null;
        return;
      }
      pendingSourceId = nodeId;
    },
    getPendingSource() {
      return pendingSourceId;
    },
    connectToTarget(targetId, direction = 'forward') {
      if (!pendingSourceId) {
        return null;
      }

      const edge = connect(pendingSourceId, targetId, direction);
      pendingSourceId = null;
      return edge;
    },
  };
}

/** Test helper — reset monotonic edge id sequence */
export function resetEdgeIdCounter(): void {
  edgeIdCounter = 0;
}
