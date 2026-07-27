import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import {
  CATEGORY_COLORS,
  createComponentInstance,
  getInstancePosition,
  setInstanceXZPosition,
} from './component-instance';
import {
  createComponentManager,
  pointerToNdc,
  raycastToXZPlane,
  resetComponentIdCounter,
} from './component-manager';
import * as gameSounds from '../audio/game-sounds';

describe('component instance', () => {
  it('creates a category-colored primitive with floating label', () => {
    const instance = createComponentInstance(
      'load_balancer',
      { x: 0, y: 0, z: 0 },
      'comp-1',
      { skipGlb: true },
    );

    expect(instance.type).toBe('load_balancer');
    expect(instance.category).toBe('traffic');
    expect(instance.label).toBe('Load Balancer');
    expect(instance.meshSource).toBe('primitive');
    expect((instance.mesh.material as THREE.MeshStandardMaterial).color.getHex()).toBe(
      CATEGORY_COLORS.traffic,
    );
    expect(instance.group.children).toHaveLength(2);
    expect(instance.labelSprite).toBeInstanceOf(THREE.Sprite);
    expect(instance.labelSprite.userData.labelText ?? instance.label).toBe('Load Balancer');
  });

  it('uses a sphere primitive for edge components and cylinder for data', () => {
    const cdn = createComponentInstance('cdn', { x: 0, y: 0, z: 0 }, 'comp-edge', {
      skipGlb: true,
    });
    const db = createComponentInstance('sql_db', { x: 0, y: 0, z: 0 }, 'comp-data', {
      skipGlb: true,
    });

    expect(cdn.mesh.geometry).toBeInstanceOf(THREE.SphereGeometry);
    expect(db.mesh.geometry).toBeInstanceOf(THREE.CylinderGeometry);
  });

  it('setInstanceXZPosition updates group XZ coordinates', () => {
    const instance = createComponentInstance(
      'app_server',
      { x: 1, y: 0, z: 2 },
      'comp-2',
      { skipGlb: true },
    );
    setInstanceXZPosition(instance, 4, 6);

    expect(getInstancePosition(instance)).toMatchObject({ x: 4, y: 0, z: 6 });
  });

  it('upgrades to GLB mesh when load succeeds and keeps type/id', async () => {
    const glbMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xffffff }),
    );
    const glbRoot = new THREE.Group();
    glbRoot.add(glbMesh);

    const instance = createComponentInstance(
      'load_balancer',
      { x: 2, y: 0, z: 3 },
      'comp-glb',
      {
        loadGltf: async () => glbRoot,
      },
    );

    await vi.waitFor(() => expect(instance.meshSource).toBe('glb'));

    expect(instance.id).toBe('comp-glb');
    expect(instance.type).toBe('load_balancer');
    expect(instance.mesh).toBeInstanceOf(THREE.Mesh);
    expect(instance.mesh.userData.componentId).toBe('comp-glb');
    expect(instance.mesh.geometry).toBeInstanceOf(THREE.BoxGeometry);
    expect(getInstancePosition(instance)).toMatchObject({ x: 2, y: 0, z: 3 });
  });

  it('keeps primitive when GLB load fails', async () => {
    const instance = createComponentInstance(
      'cdn',
      { x: 0, y: 0, z: 0 },
      'comp-fail',
      {
        loadGltf: async () => null,
      },
    );

    await vi.waitFor(() => {
      // allow microtasks to settle
      expect(instance.meshSource).toBe('primitive');
    });
    expect(instance.mesh.geometry).toBeInstanceOf(THREE.SphereGeometry);
  });
});

describe('component manager helpers', () => {
  it('pointerToNdc converts client coordinates to normalized device coordinates', () => {
    const ndc = pointerToNdc(400, 300, { left: 0, top: 0, width: 800, height: 600 });
    expect(ndc.x).toBeCloseTo(0);
    expect(ndc.y).toBeCloseTo(0);
  });

  it('raycastToXZPlane returns a point on the ground plane', () => {
    const raycaster = new THREE.Raycaster();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
    camera.position.set(20, 20, 20);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    const hit = raycastToXZPlane(raycaster, camera, { x: 0, y: 0 });

    expect(hit).not.toBeNull();
    expect(hit!.y).toBeCloseTo(0, 5);
  });
});

describe('component manager', () => {
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let canvas: HTMLCanvasElement;
  let controls: { enabled: boolean };
  let intersectObjects: ReturnType<typeof vi.fn>;
  let intersectPlane: ReturnType<typeof vi.fn>;
  let raycaster: THREE.Raycaster;
  let manager: ReturnType<typeof createComponentManager>;

  beforeEach(() => {
    resetComponentIdCounter();
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
    camera.position.set(20, 20, 20);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    canvas = document.createElement('canvas');
    Object.defineProperty(canvas, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: 600, configurable: true });
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    canvas.setPointerCapture = vi.fn();

    controls = { enabled: true };

    intersectObjects = vi.fn();
    intersectPlane = vi.fn((_plane: THREE.Plane, target: THREE.Vector3) => {
      target.set(5, 0, 7);
      return target;
    });

    raycaster = {
      setFromCamera: vi.fn(),
      intersectObjects,
      ray: { intersectPlane: intersectPlane },
    } as unknown as THREE.Raycaster;

    manager = createComponentManager({ scene, camera, canvas, controls, raycaster });
  });

  afterEach(() => {
    manager.dispose();
  });

  it('addComponent(type, position) adds a 3D instance to the scene', () => {
    const soundSpy = vi.spyOn(gameSounds, 'playGameSound').mockImplementation(() => undefined);
    const instance = manager.addComponent('cache_redis', { x: 2, y: 0, z: 3 });

    expect(instance.type).toBe('cache_redis');
    expect(instance.category).toBe('data');
    expect(scene.children).toContain(instance.group);
    expect(manager.getAllInstances()).toHaveLength(1);
    expect(getInstancePosition(instance)).toMatchObject({ x: 2, y: 0, z: 3 });
    expect(soundSpy).toHaveBeenCalledWith('place');
    soundSpy.mockRestore();
  });

  it('drags the picked instance on the XZ plane via raycast', () => {
    const instance = manager.addComponent('app_server', { x: 0, y: 0, z: 0 });
    intersectObjects.mockReturnValueOnce([{ object: instance.mesh }]);

    const handled = manager.handlePointerDown({
      clientX: 400,
      clientY: 300,
      pointerId: 1,
    } as PointerEvent);

    expect(handled).toBe(true);
    expect(controls.enabled).toBe(false);

    manager.handlePointerMove({ clientX: 500, clientY: 320 } as PointerEvent);

    expect(getInstancePosition(instance)).toMatchObject({ x: 5, y: 0, z: 7 });

    manager.handlePointerUp();
    expect(controls.enabled).toBe(true);
  });
});
