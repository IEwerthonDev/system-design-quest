import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { createComponentManager, resetComponentIdCounter } from './component-manager';
import { createEdgeManager, resetEdgeIdCounter } from './edge-manager';
import * as gameSounds from '../audio/game-sounds';

describe('edge manager', () => {
  let scene: THREE.Scene;
  let manager: ReturnType<typeof createComponentManager>;
  let edges: ReturnType<typeof createEdgeManager>;

  beforeEach(() => {
    resetComponentIdCounter();
    resetEdgeIdCounter();
    scene = new THREE.Scene();
    const canvas = document.createElement('canvas');
    manager = createComponentManager({
      scene,
      camera: new THREE.PerspectiveCamera(),
      canvas,
      attachPointerHandlers: false,
    });
    edges = createEdgeManager({ componentManager: manager });
  });

  afterEach(() => {
    manager.dispose();
  });

  it('connect(from, to) creates a forward ConnectionEdge between two components', () => {
    const soundSpy = vi.spyOn(gameSounds, 'playGameSound').mockImplementation(() => undefined);
    const from = manager.addComponent('client_web', { x: 0, y: 0, z: 0 });
    const to = manager.addComponent('load_balancer', { x: 2, y: 0, z: 0 });

    const edge = edges.connect(from.id, to.id);

    expect(edge).not.toBeNull();
    expect(edge).toMatchObject({
      from: from.id,
      to: to.id,
      direction: 'forward',
    });
    expect(edge!.id).toMatch(/^edge-/);
    expect(edges.getEdges()).toHaveLength(1);
    expect(soundSpy).toHaveBeenCalledWith('connect');
    soundSpy.mockRestore();
  });

  it('connect(from, to, bidirectional) creates a bidirectional ConnectionEdge', () => {
    const from = manager.addComponent('api_gateway', { x: 0, y: 0, z: 0 });
    const to = manager.addComponent('app_server', { x: 2, y: 0, z: 0 });

    const edge = edges.connect(from.id, to.id, 'bidirectional');

    expect(edge?.direction).toBe('bidirectional');
  });

  it('setDirection updates an existing edge direction', () => {
    const from = manager.addComponent('cache_redis', { x: 0, y: 0, z: 0 });
    const to = manager.addComponent('sql_db', { x: 2, y: 0, z: 0 });
    const edge = edges.connect(from.id, to.id, 'forward')!;

    const updated = edges.setDirection(edge.id, 'bidirectional');

    expect(updated).toBe(true);
    expect(edges.getEdge(edge.id)?.direction).toBe('bidirectional');
  });

  it('rejects self-connections', () => {
    const node = manager.addComponent('worker', { x: 0, y: 0, z: 0 });

    expect(edges.connect(node.id, node.id)).toBeNull();
    expect(edges.getEdges()).toHaveLength(0);
  });

  it('rejects connections when either component does not exist', () => {
    const node = manager.addComponent('dns', { x: 0, y: 0, z: 0 });

    expect(edges.connect(node.id, 'missing')).toBeNull();
    expect(edges.connect('missing', node.id)).toBeNull();
    expect(edges.getEdges()).toHaveLength(0);
  });

  it('rejects duplicate edges between the same ordered pair', () => {
    const from = manager.addComponent('message_queue', { x: 0, y: 0, z: 0 });
    const to = manager.addComponent('worker', { x: 2, y: 0, z: 0 });

    edges.connect(from.id, to.id, 'forward');

    expect(edges.connect(from.id, to.id, 'bidirectional')).toBeNull();
    expect(edges.getEdges()).toHaveLength(1);
  });

  it('removeEdgesForNode removes all edges touching the node', () => {
    const a = manager.addComponent('client_web', { x: 0, y: 0, z: 0 });
    const b = manager.addComponent('cdn', { x: 2, y: 0, z: 0 });
    const c = manager.addComponent('monitoring', { x: 4, y: 0, z: 0 });
    const d = manager.addComponent('auth_service', { x: 6, y: 0, z: 0 });

    edges.connect(a.id, b.id);
    edges.connect(b.id, c.id);
    edges.connect(c.id, d.id);

    const removed = edges.removeEdgesForNode(b.id);

    expect(removed).toHaveLength(2);
    expect(edges.getEdges()).toEqual([
      expect.objectContaining({ from: c.id, to: d.id }),
    ]);
  });

  it('connectToTarget completes a pending source-to-target connection', () => {
    const source = manager.addComponent('client_mobile', { x: 0, y: 0, z: 0 });
    const target = manager.addComponent('api_gateway', { x: 2, y: 0, z: 0 });

    edges.setPendingSource(source.id);
    const edge = edges.connectToTarget(target.id, 'forward');

    expect(edge).toMatchObject({
      from: source.id,
      to: target.id,
      direction: 'forward' as const,
    });
    expect(edges.getPendingSource()).toBeNull();
  });
});
