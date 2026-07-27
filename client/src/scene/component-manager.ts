import * as THREE from 'three';
import type { ComponentType } from '@sdq/shared';
import {
  createComponentInstance,
  setInstanceXZPosition,
  type ComponentInstanceObject,
} from './component-instance';

export interface PointerNdc {
  x: number;
  y: number;
}

export interface WorldXZ {
  x: number;
  z: number;
}

export interface ComponentManagerOptions {
  scene: THREE.Scene;
  camera: THREE.Camera;
  canvas: HTMLCanvasElement;
  controls?: { enabled: boolean };
  raycaster?: THREE.Raycaster;
}

export interface ComponentManager {
  addComponent(
    type: ComponentType,
    position: { x: number; y: number; z: number },
  ): ComponentInstanceObject;
  getInstance(id: string): ComponentInstanceObject | undefined;
  getAllInstances(): ComponentInstanceObject[];
  handlePointerDown(event: PointerEvent): boolean;
  handlePointerMove(event: PointerEvent): void;
  handlePointerUp(): void;
  dispose(): void;
}

let componentIdCounter = 0;

function nextComponentId(): string {
  componentIdCounter += 1;
  return `comp-${componentIdCounter}`;
}

export function pointerToNdc(
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>,
): PointerNdc {
  return {
    x: ((clientX - rect.left) / rect.width) * 2 - 1,
    y: -((clientY - rect.top) / rect.height) * 2 + 1,
  };
}

export function raycastToXZPlane(
  raycaster: THREE.Raycaster,
  camera: THREE.Camera,
  ndc: PointerNdc,
  planeY = 0,
): THREE.Vector3 | null {
  raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
  const hit = new THREE.Vector3();
  return raycaster.ray.intersectPlane(plane, hit) ? hit : null;
}

function collectPickTargets(instances: ComponentInstanceObject[]): THREE.Object3D[] {
  return instances.map((instance) => instance.mesh);
}

export function createComponentManager(options: ComponentManagerOptions): ComponentManager {
  const { scene, camera, canvas, controls } = options;
  const raycaster = options.raycaster ?? new THREE.Raycaster();
  const instances = new Map<string, ComponentInstanceObject>();
  let draggingId: string | null = null;

  const getCanvasRect = (): DOMRect => canvas.getBoundingClientRect();

  const pickInstance = (ndc: PointerNdc): ComponentInstanceObject | null => {
    raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera);
    const hits = raycaster.intersectObjects(collectPickTargets([...instances.values()]), false);
    const hitMesh = hits[0]?.object;
    if (!hitMesh?.userData?.componentId) {
      return null;
    }
    return instances.get(String(hitMesh.userData.componentId)) ?? null;
  };

  const onPointerDown = (event: PointerEvent): void => {
    manager.handlePointerDown(event);
  };

  const onPointerMove = (event: PointerEvent): void => {
    manager.handlePointerMove(event);
  };

  const onPointerUp = (): void => {
    manager.handlePointerUp();
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);

  const manager: ComponentManager = {
    addComponent(type, position) {
      const instance = createComponentInstance(type, position, nextComponentId());
      instances.set(instance.id, instance);
      scene.add(instance.group);
      return instance;
    },

    getInstance(id) {
      return instances.get(id);
    },

    getAllInstances() {
      return [...instances.values()];
    },

    handlePointerDown(event) {
      const ndc = pointerToNdc(event.clientX, event.clientY, getCanvasRect());
      const picked = pickInstance(ndc);
      if (!picked) {
        return false;
      }

      draggingId = picked.id;
      if (controls) {
        controls.enabled = false;
      }
      canvas.setPointerCapture(event.pointerId);
      return true;
    },

    handlePointerMove(event) {
      if (!draggingId) {
        return;
      }

      const instance = instances.get(draggingId);
      if (!instance) {
        return;
      }

      const ndc = pointerToNdc(event.clientX, event.clientY, getCanvasRect());
      const hit = raycastToXZPlane(raycaster, camera, ndc);
      if (!hit) {
        return;
      }

      setInstanceXZPosition(instance, hit.x, hit.z);
    },

    handlePointerUp() {
      draggingId = null;
      if (controls) {
        controls.enabled = true;
      }
    },

    dispose() {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      for (const instance of instances.values()) {
        scene.remove(instance.group);
      }
      instances.clear();
    },
  };

  return manager;
}

/** Test helper — reset monotonic component id sequence */
export function resetComponentIdCounter(): void {
  componentIdCounter = 0;
}
