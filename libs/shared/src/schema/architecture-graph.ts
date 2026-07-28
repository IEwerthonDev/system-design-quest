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
  /** Cache TTL at the edge (seconds). Default 3600 via normalize. */
  ttlSeconds: number;
}

/** How the store is used in the design (CQRS / read replicas). */
export type AccessPattern = 'read' | 'write' | 'read_write';

/** Primary vs replica vs undifferentiated store. */
export type DbTopologyRole = 'primary' | 'replica' | 'standalone';

export interface SqlDbConfig {
  kind: 'sql_db';
  shardCount: number;
  partitioningStrategy: PartitioningStrategy;
  partitionKey?: string;
  keySkew: number;
  /** Defaults to read_write via normalizeGraph */
  accessPattern: AccessPattern;
  /** Defaults to primary via normalizeGraph */
  topologyRole: DbTopologyRole;
}

export interface NosqlDbConfig {
  kind: 'nosql_db';
  accessPattern: AccessPattern;
  topologyRole: DbTopologyRole;
}

export type MqDurability = 'memory' | 'disk';

export interface MqConfig {
  kind: 'mq';
  durability: MqDurability;
  partitionCount: number;
}

export interface WsConfig {
  kind: 'ws';
  fanOutLimit: number;
}

export type LbAlgorithm = 'round_robin' | 'least_conn' | 'ip_hash';

export interface LbConfig {
  kind: 'lb';
  algorithm: LbAlgorithm;
}

export type ComponentConfig =
  | CacheConfig
  | CdnConfig
  | SqlDbConfig
  | NosqlDbConfig
  | MqConfig
  | WsConfig
  | LbConfig;

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
