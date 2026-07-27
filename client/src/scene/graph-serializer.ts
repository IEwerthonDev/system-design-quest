import type { ArchitectureGraph, ComponentNode } from '@sdq/shared';
import { getInstancePosition, type ComponentInstanceObject } from './component-instance';
import type { ComponentManager } from './component-manager';
import type { EdgeRegistry } from './edge-manager';

export function instanceToNode(instance: ComponentInstanceObject): ComponentNode {
  const node: ComponentNode = {
    id: instance.id,
    type: instance.type,
    label: instance.label,
    position: getInstancePosition(instance),
  };

  if (instance.note) {
    node.note = instance.note;
  }

  return node;
}

export function serializeGraph(
  componentManager: ComponentManager,
  edgeRegistry: EdgeRegistry,
): ArchitectureGraph {
  return {
    nodes: componentManager.getAllInstances().map(instanceToNode),
    edges: edgeRegistry.getEdges(),
  };
}
