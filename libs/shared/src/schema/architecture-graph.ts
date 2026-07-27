import type { ComponentType } from './component-types';

export interface ComponentNode {
  id: string;
  type: ComponentType;
  label: string;
  note?: string;
  position: { x: number; y: number; z: number };
}

export interface ConnectionEdge {
  id: string;
  from: string;
  to: string;
  direction: 'forward' | 'bidirectional';
  label?: string;
}

export interface ArchitectureGraph {
  nodes: ComponentNode[];
  edges: ConnectionEdge[];
}
