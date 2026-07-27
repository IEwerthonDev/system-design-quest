import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { createComponentInstance } from '../component-instance';
import { createComponentHandles } from './component-handles';

describe('component handles', () => {
  let handles: ReturnType<typeof createComponentHandles>;

  beforeEach(() => {
    handles = createComponentHandles();
  });

  afterEach(() => {
    handles.dispose();
  });

  it('attaches distinct in/out handles with pick userData', () => {
    const instance = createComponentInstance(
      'client_web',
      { x: 0, y: 0, z: 0 },
      'comp-1',
      { skipGlb: true },
    );
    const set = handles.attach(instance);

    expect(set.in.userData).toMatchObject({
      isHandle: true,
      componentId: instance.id,
      handleKind: 'in',
    });
    expect(set.out.userData).toMatchObject({
      isHandle: true,
      componentId: instance.id,
      handleKind: 'out',
    });
    expect(set.in.position.x).toBeLessThan(0);
    expect(set.out.position.x).toBeGreaterThan(0);
    expect(instance.group.children).toEqual(expect.arrayContaining([set.in, set.out]));
  });

  it('keeps handles hidden until hover or forced visibility', () => {
    const instance = createComponentInstance(
      'cdn',
      { x: 1, y: 0, z: 0 },
      'comp-2',
      { skipGlb: true },
    );
    const set = handles.attach(instance);

    expect(set.in.visible).toBe(false);
    expect(set.out.visible).toBe(false);

    handles.setHandlesVisible(instance.id, true);
    expect(set.in.visible).toBe(true);
    expect(set.out.visible).toBe(true);

    handles.setHandlesVisible(instance.id, false);
    expect(set.in.visible).toBe(false);

    handles.setForcedVisible([instance.id]);
    expect(set.in.visible).toBe(true);
    expect(set.out.visible).toBe(true);

    handles.setForcedVisible([]);
    expect(set.in.visible).toBe(false);
  });

  it('pickHandle distinguishes in vs out', () => {
    const instance = createComponentInstance(
      'load_balancer',
      { x: 0, y: 0, z: 0 },
      'comp-3',
      { skipGlb: true },
    );
    const set = handles.attach(instance);
    handles.setHandlesVisible(instance.id, true);

    const raycaster = new THREE.Raycaster();
    const origin = set.out.getWorldPosition(new THREE.Vector3()).clone();
    origin.y += 2;
    const direction = new THREE.Vector3(0, -1, 0);
    raycaster.set(origin, direction);

    expect(handles.pickHandle(raycaster)).toEqual({
      componentId: instance.id,
      kind: 'out',
    });

    const inOrigin = set.in.getWorldPosition(new THREE.Vector3()).clone();
    inOrigin.y += 2;
    raycaster.set(inOrigin, direction);

    expect(handles.pickHandle(raycaster)).toEqual({
      componentId: instance.id,
      kind: 'in',
    });
  });

  it('getHandleWorldPosition returns distinct world points for in and out', () => {
    const instance = createComponentInstance(
      'app_server',
      { x: 3, y: 0, z: -2 },
      'comp-4',
      { skipGlb: true },
    );
    handles.attach(instance);

    const inPos = handles.getHandleWorldPosition(instance.id, 'in');
    const outPos = handles.getHandleWorldPosition(instance.id, 'out');

    expect(inPos).not.toBeNull();
    expect(outPos).not.toBeNull();
    expect(inPos!.x).toBeLessThan(outPos!.x);
    expect(inPos!.distanceTo(outPos!)).toBeGreaterThan(0.5);
  });
});
