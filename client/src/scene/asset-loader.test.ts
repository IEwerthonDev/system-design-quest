import { describe, expect, it, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import {
  clearComponentModelCache,
  findPrimaryMesh,
  loadComponentModel,
  tintObjectWithColor,
} from './asset-loader';

describe('asset-loader', () => {
  beforeEach(() => {
    clearComponentModelCache();
  });

  it('returns cloned GLB scene when load succeeds', async () => {
    const scene = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
    scene.add(mesh);

    const loadGltf = vi.fn(async () => scene);
    const model = await loadComponentModel('load_balancer', { loadGltf, bypassCache: true });

    expect(loadGltf).toHaveBeenCalledWith('/assets/components/traffic.glb');
    expect(model).not.toBeNull();
    expect(model).not.toBe(scene);
    expect(findPrimaryMesh(model!)).toBeInstanceOf(THREE.Mesh);
  });

  it('returns null when GLB load fails', async () => {
    const loadGltf = vi.fn(async () => null);
    const model = await loadComponentModel('cdn', { loadGltf, bypassCache: true });
    expect(model).toBeNull();
  });

  it('returns null when loadGltf throws', async () => {
    const loadGltf = vi.fn(async () => {
      throw new Error('network');
    });
    const model = await loadComponentModel('sql_db', { loadGltf, bypassCache: true });
    expect(model).toBeNull();
  });

  it('tintObjectWithColor sets mesh material color', () => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshStandardMaterial({ color: 0xffffff }),
    );
    tintObjectWithColor(mesh, 0xff0000);
    expect((mesh.material as THREE.MeshStandardMaterial).color.getHex()).toBe(0xff0000);
  });
});
