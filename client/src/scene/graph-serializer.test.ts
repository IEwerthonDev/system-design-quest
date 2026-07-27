import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { createComponentManager, resetComponentIdCounter } from './component-manager';
import { createEdgeRegistry } from './edge-manager';
import { instanceToNode, serializeGraph } from './graph-serializer';
import { createComponentInstance } from './component-instance';

describe('graph serializer', () => {
  let scene: THREE.Scene;
  let manager: ReturnType<typeof createComponentManager>;
  let edgeRegistry: ReturnType<typeof createEdgeRegistry>;

  beforeEach(() => {
    resetComponentIdCounter();
    scene = new THREE.Scene();
    const canvas = document.createElement('canvas');
    manager = createComponentManager({
      scene,
      camera: new THREE.PerspectiveCamera(),
      canvas,
      attachPointerHandlers: false,
    });
    edgeRegistry = createEdgeRegistry();
  });

  afterEach(() => {
    manager.dispose();
  });

  it('instanceToNode maps component fields and position', () => {
    const instance = createComponentInstance('load_balancer', { x: 1, y: 0, z: 2 }, 'comp-1');
    instance.note = 'Front door';

    expect(instanceToNode(instance)).toEqual({
      id: 'comp-1',
      type: 'load_balancer',
      label: 'Load Balancer',
      note: 'Front door',
      position: { x: 1, y: 0, z: 2 },
    });
  });

  it('serializeGraph returns ArchitectureGraph JSON with nodes and edges', () => {
    const from = manager.addComponent('client_web', { x: 0, y: 0, z: 0 });
    const to = manager.addComponent('app_server', { x: 3, y: 0, z: -1 });
    manager.setLabel(from.id, 'Browser');
    manager.setNote(to.id, 'API layer');

    edgeRegistry.setEdges([
      { id: 'edge-1', from: from.id, to: to.id, direction: 'forward' },
    ]);

    const graph = serializeGraph(manager, edgeRegistry);

    expect(graph.nodes).toHaveLength(2);
    expect(graph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: from.id, type: 'client_web', label: 'Browser' }),
        expect.objectContaining({
          id: to.id,
          type: 'app_server',
          note: 'API layer',
          position: { x: 3, y: 0, z: -1 },
        }),
      ]),
    );
    expect(graph.edges).toEqual([
      { id: 'edge-1', from: from.id, to: to.id, direction: 'forward' },
    ]);

    const serialized = JSON.parse(JSON.stringify(graph));
    expect(serialized.nodes).toHaveLength(2);
    expect(serialized.edges).toHaveLength(1);
  });

  it('serializeGraph returns empty graph when canvas has no components', () => {
    expect(serializeGraph(manager, edgeRegistry)).toEqual({ nodes: [], edges: [] });
  });
});
