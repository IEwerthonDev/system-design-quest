import type { ComponentType } from './component-types';

export interface Vec2 {
  x: number;
  y: number;
}

export type PartitioningStrategy = 'hash' | 'range' | 'geographic' | 'list';

export type PressureLevel = 'ok' | 'warn' | 'hot';

export interface CacheConfig {
  kind: 'cache';
  hitRate: number;
}

export interface CdnConfig {
  kind: 'cdn';
  hitRate: number;
}

export interface SqlDbConfig {
  kind: 'sql_db';
  shardCount: number;
  partitioningStrategy: PartitioningStrategy;
  partitionKey?: string;
  keySkew: number;
}

export type ComponentConfig = CacheConfig | CdnConfig | SqlDbConfig;

export interface ComponentNode {
  id: string;
  type: ComponentType;
  label: string;
  /** @deprecated Prefer implementationNotes */
  note?: string;
  implementationNotes?: string;
  /** Defaults to 1 via normalizeGraph */
  replicas?: number;
  config?: ComponentConfig;
  /** z optional for legacy 3D graphs; blueprint uses x/y only */
  position: { x: number; y: number; z?: number };
}

export interface ConnectionEdge {
  id: string;
  from: string;
  to: string;
  direction: 'forward' | 'bidirectional';
  label?: string;
}

export interface SimulationSettings {
  running: boolean;
  speed: number;
  traffic: number;
  readRatio: number;
}

export interface ArchitectureGraph {
  nodes: ComponentNode[];
  edges: ConnectionEdge[];
  simulation?: SimulationSettings;
}
