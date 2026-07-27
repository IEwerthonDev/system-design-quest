import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { ComponentType } from '@sdq/shared';
import { getGlbPath } from './component-manifest';

export type GltfLoadFn = (url: string) => Promise<THREE.Object3D | null>;

const modelCache = new Map<string, Promise<THREE.Object3D | null>>();

function defaultLoadGltf(url: string): Promise<THREE.Object3D | null> {
  const loader = new GLTFLoader();
  return new Promise((resolve) => {
    loader.load(
      url,
      (gltf) => {
        resolve(gltf.scene.clone(true));
      },
      undefined,
      () => {
        resolve(null);
      },
    );
  });
}

/**
 * Loads a component GLB by type. Returns null on missing/failed load.
 * Results are cached per type (including null failures for the session).
 */
export function loadComponentModel(
  type: ComponentType,
  options?: { loadGltf?: GltfLoadFn; bypassCache?: boolean },
): Promise<THREE.Object3D | null> {
  if (!options?.bypassCache) {
    const cached = modelCache.get(type);
    if (cached) {
      return cached.then((model) => (model ? model.clone(true) : null));
    }
  }

  const loadGltf = options?.loadGltf ?? defaultLoadGltf;
  const url = getGlbPath(type);

  const promise = loadGltf(url)
    .then((model) => model)
    .catch(() => null);

  if (!options?.bypassCache) {
    modelCache.set(
      type,
      promise.then((model) => model),
    );
  }

  return promise.then((model) => (model ? model.clone(true) : null));
}

export function clearComponentModelCache(): void {
  modelCache.clear();
}

export function tintObjectWithColor(root: THREE.Object3D, hex: number): void {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      if (material && 'color' in material && material.color instanceof THREE.Color) {
        material.color.setHex(hex);
      }
    }
  });
}

/** Extract the first Mesh under a loaded GLB scene for pick/selection. */
export function findPrimaryMesh(root: THREE.Object3D): THREE.Mesh | null {
  if (root instanceof THREE.Mesh) {
    return root;
  }
  let found: THREE.Mesh | null = null;
  root.traverse((child) => {
    if (!found && child instanceof THREE.Mesh) {
      found = child;
    }
  });
  return found;
}
