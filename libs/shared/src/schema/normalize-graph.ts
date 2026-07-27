import type { ComponentType } from './component-types';
import type {
  ArchitectureGraph,
  ComponentConfig,
  ComponentNode,
  SimulationSettings,
} from './architecture-graph';

export const DEFAULT_SIMULATION: SimulationSettings = {
  running: false,
  speed: 1,
  traffic: 1,
  readRatio: 80,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function defaultConfigForType(type: ComponentType): ComponentConfig | undefined {
  if (type === 'cache_redis') {
    return { kind: 'cache', hitRate: 90 };
  }
  if (type === 'cdn') {
    return { kind: 'cdn', hitRate: 99 };
  }
  if (type === 'sql_db') {
    return {
      kind: 'sql_db',
      shardCount: 1,
      partitioningStrategy: 'hash',
      keySkew: 0,
    };
  }
  return undefined;
}

function normalizeConfig(node: ComponentNode): ComponentConfig | undefined {
  const fallback = defaultConfigForType(node.type);
  if (!node.config) {
    return fallback;
  }

  if (node.config.kind === 'cache' || node.config.kind === 'cdn') {
    return {
      kind: node.config.kind,
      hitRate: clamp(node.config.hitRate, 0, 100),
    };
  }

  if (node.config.kind === 'sql_db') {
    return {
      kind: 'sql_db',
      shardCount: clamp(Math.round(node.config.shardCount), 1, 256),
      partitioningStrategy: node.config.partitioningStrategy,
      partitionKey: node.config.partitionKey,
      keySkew: clamp(node.config.keySkew, 0, 100),
    };
  }

  return fallback;
}

export function normalizeNode(node: ComponentNode): ComponentNode {
  const notes = node.implementationNotes ?? node.note;
  const config = normalizeConfig(node);
  const normalized: ComponentNode = {
    id: node.id,
    type: node.type,
    label: node.label,
    replicas: clamp(Math.round(node.replicas ?? 1), 1, 10_000),
    position: {
      x: node.position.x,
      y: node.position.y,
      ...(node.position.z !== undefined ? { z: node.position.z } : {}),
    },
  };

  if (notes !== undefined && notes.length > 0) {
    normalized.implementationNotes = notes;
  }
  if (config) {
    normalized.config = config;
  }

  return normalized;
}

export function normalizeSimulation(
  simulation?: Partial<SimulationSettings> | null,
): SimulationSettings {
  return {
    running: Boolean(simulation?.running),
    speed: clamp(simulation?.speed ?? DEFAULT_SIMULATION.speed, 1, 10),
    traffic: clamp(simulation?.traffic ?? DEFAULT_SIMULATION.traffic, 1, 10),
    readRatio: clamp(simulation?.readRatio ?? DEFAULT_SIMULATION.readRatio, 0, 100),
  };
}

/** Fill defaults for legacy graphs missing replicas / simulation / notes. */
export function normalizeGraph(graph: ArchitectureGraph): ArchitectureGraph {
  return {
    nodes: graph.nodes.map(normalizeNode),
    edges: graph.edges.map((edge) => ({ ...edge })),
    simulation: normalizeSimulation(graph.simulation),
  };
}
