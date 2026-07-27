import * as THREE from 'three';
import type { ComponentInstanceObject } from '../component-instance';

export type HandleKind = 'in' | 'out';

export interface HandlePick {
  componentId: string;
  kind: HandleKind;
}

export interface HandleSet {
  in: THREE.Mesh;
  out: THREE.Mesh;
  dispose(): void;
}

export interface ComponentHandles {
  attach(instance: ComponentInstanceObject): HandleSet;
  detach(componentId: string): void;
  setHandlesVisible(componentId: string, visible: boolean): void;
  setForcedVisible(componentIds: string[]): void;
  getHandleWorldPosition(componentId: string, kind: HandleKind): THREE.Vector3 | null;
  pickHandle(raycaster: THREE.Raycaster): HandlePick | null;
  dispose(): void;
}

export const HANDLE_RADIUS = 0.12;
export const HANDLE_OFFSET_X = 0.75;
export const HANDLE_Y = 0.55;

const HANDLE_COLOR_IN = 0x34d399;
const HANDLE_COLOR_OUT = 0x60a5fa;

interface HandleEntry {
  set: HandleSet;
  hoverVisible: boolean;
}

function createHandleMesh(
  componentId: string,
  kind: HandleKind,
  localX: number,
): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(HANDLE_RADIUS, 16, 12);
  const material = new THREE.MeshBasicMaterial({
    color: kind === 'in' ? HANDLE_COLOR_IN : HANDLE_COLOR_OUT,
    transparent: true,
    opacity: 0.95,
    depthTest: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(localX, HANDLE_Y, 0);
  mesh.visible = false;
  mesh.renderOrder = 8;
  mesh.userData = {
    isHandle: true,
    componentId,
    handleKind: kind,
  };
  return mesh;
}

function applyVisibility(entry: HandleEntry, forcedIds: ReadonlySet<string>): void {
  const componentId = String(entry.set.in.userData.componentId);
  const visible = entry.hoverVisible || forcedIds.has(componentId);
  entry.set.in.visible = visible;
  entry.set.out.visible = visible;
}

export function createComponentHandles(): ComponentHandles {
  const entries = new Map<string, HandleEntry>();
  let forcedIds = new Set<string>();

  const refreshAll = (): void => {
    for (const entry of entries.values()) {
      applyVisibility(entry, forcedIds);
    }
  };

  return {
    attach(instance) {
      const existing = entries.get(instance.id);
      if (existing) {
        return existing.set;
      }

      const inHandle = createHandleMesh(instance.id, 'in', -HANDLE_OFFSET_X);
      const outHandle = createHandleMesh(instance.id, 'out', HANDLE_OFFSET_X);
      instance.group.add(inHandle, outHandle);

      const set: HandleSet = {
        in: inHandle,
        out: outHandle,
        dispose() {
          instance.group.remove(inHandle, outHandle);
          inHandle.geometry.dispose();
          outHandle.geometry.dispose();
          (inHandle.material as THREE.Material).dispose();
          (outHandle.material as THREE.Material).dispose();
        },
      };

      const entry: HandleEntry = { set, hoverVisible: false };
      entries.set(instance.id, entry);
      applyVisibility(entry, forcedIds);
      return set;
    },

    detach(componentId) {
      const entry = entries.get(componentId);
      if (!entry) {
        return;
      }
      entry.set.dispose();
      entries.delete(componentId);
    },

    setHandlesVisible(componentId, visible) {
      const entry = entries.get(componentId);
      if (!entry) {
        return;
      }
      entry.hoverVisible = visible;
      applyVisibility(entry, forcedIds);
    },

    setForcedVisible(componentIds) {
      forcedIds = new Set(componentIds);
      refreshAll();
    },

    getHandleWorldPosition(componentId, kind) {
      const entry = entries.get(componentId);
      if (!entry) {
        return null;
      }
      const handle = kind === 'in' ? entry.set.in : entry.set.out;
      return handle.getWorldPosition(new THREE.Vector3());
    },

    pickHandle(raycaster) {
      const targets: THREE.Object3D[] = [];
      for (const entry of entries.values()) {
        targets.push(entry.set.in, entry.set.out);
      }
      if (targets.length === 0) {
        return null;
      }

      const hits = raycaster.intersectObjects(targets, false);
      const hit = hits[0]?.object;
      if (!hit?.userData?.isHandle) {
        return null;
      }

      return {
        componentId: String(hit.userData.componentId),
        kind: hit.userData.handleKind as HandleKind,
      };
    },

    dispose() {
      for (const componentId of [...entries.keys()]) {
        this.detach(componentId);
      }
      forcedIds = new Set();
    },
  };
}
