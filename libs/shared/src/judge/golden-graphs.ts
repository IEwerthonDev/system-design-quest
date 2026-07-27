import type { ArchitectureGraph } from '../schema/architecture-graph';

export type GoldenGraphTier = 'good' | 'medium' | 'bad';

const GOLDEN_GRAPHS: Record<GoldenGraphTier, ArchitectureGraph> = {
  good: {
    nodes: [
      {
        id: 'golden-good-client',
        type: 'client_web',
        label: 'Web Client',
        position: { x: 0, y: 0, z: 0 },
      },
      {
        id: 'golden-good-lb',
        type: 'load_balancer',
        label: 'Load Balancer',
        position: { x: 2, y: 0, z: 0 },
      },
      {
        id: 'golden-good-app',
        type: 'app_server',
        label: 'App Server',
        position: { x: 4, y: 0, z: 0 },
      },
      {
        id: 'golden-good-cache',
        type: 'cache_redis',
        label: 'Redis Cache',
        position: { x: 6, y: 0, z: 0 },
      },
      {
        id: 'golden-good-db',
        type: 'sql_db',
        label: 'SQL Database',
        position: { x: 8, y: 0, z: 0 },
      },
    ],
    edges: [
      {
        id: 'golden-good-e1',
        from: 'golden-good-client',
        to: 'golden-good-lb',
        direction: 'forward',
        label: 'HTTPS',
      },
      {
        id: 'golden-good-e2',
        from: 'golden-good-lb',
        to: 'golden-good-app',
        direction: 'forward',
      },
      {
        id: 'golden-good-e3',
        from: 'golden-good-app',
        to: 'golden-good-cache',
        direction: 'forward',
        label: 'read path',
      },
      {
        id: 'golden-good-e4',
        from: 'golden-good-app',
        to: 'golden-good-db',
        direction: 'forward',
        label: 'write path',
      },
    ],
  },
  medium: {
    nodes: [
      {
        id: 'golden-medium-client',
        type: 'client_web',
        label: 'Web Client',
        position: { x: 0, y: 0, z: 0 },
      },
      {
        id: 'golden-medium-app',
        type: 'app_server',
        label: 'App Server',
        position: { x: 2, y: 0, z: 0 },
      },
      {
        id: 'golden-medium-db',
        type: 'sql_db',
        label: 'SQL Database',
        position: { x: 4, y: 0, z: 0 },
      },
    ],
    edges: [
      {
        id: 'golden-medium-e1',
        from: 'golden-medium-client',
        to: 'golden-medium-app',
        direction: 'forward',
      },
      {
        id: 'golden-medium-e2',
        from: 'golden-medium-app',
        to: 'golden-medium-db',
        direction: 'forward',
      },
    ],
  },
  bad: {
    nodes: [
      {
        id: 'golden-bad-client',
        type: 'client_web',
        label: 'Web Client',
        position: { x: 0, y: 0, z: 0 },
      },
      {
        id: 'golden-bad-db',
        type: 'sql_db',
        label: 'SQL Database',
        position: { x: 2, y: 0, z: 0 },
      },
    ],
    edges: [
      {
        id: 'golden-bad-e1',
        from: 'golden-bad-client',
        to: 'golden-bad-db',
        direction: 'forward',
      },
    ],
  },
};

/** Fixed ArchitectureGraph fixtures for URL Shortener golden judge tests. */
export function getGoldenGraph(tier: GoldenGraphTier): ArchitectureGraph {
  return GOLDEN_GRAPHS[tier];
}
