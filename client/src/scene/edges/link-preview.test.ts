import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { FLOW_EDGE_ANIMATION_SPEED } from './flow-edge';
import { createLinkPreview, getLinkPreviewUniforms } from './link-preview';

vi.mock('./flow-edge.frag?raw', () => ({
  default: 'mocked-fragment-shader',
}));

describe('link preview', () => {
  let scene: THREE.Scene;
  let preview: ReturnType<typeof createLinkPreview>;

  beforeEach(() => {
    scene = new THREE.Scene();
    preview = createLinkPreview(scene);
  });

  afterEach(() => {
    preview.dispose();
  });

  it('showPreview / updatePreview / hidePreview control ephemeral curved mesh', () => {
    expect(preview.isActive).toBe(false);
    expect(preview.mesh.visible).toBe(false);

    preview.showPreview(new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 0, 0));
    expect(preview.isActive).toBe(true);
    expect(preview.mesh.visible).toBe(true);
    expect(preview.mesh.geometry).toBeInstanceOf(THREE.TubeGeometry);
    expect(
      (preview.mesh.geometry as THREE.TubeGeometry).parameters.path,
    ).toBeInstanceOf(THREE.QuadraticBezierCurve3);
    expect(scene.children).toContain(preview.mesh);

    const geometryBefore = preview.mesh.geometry;
    preview.updatePreview(new THREE.Vector3(4, 0, 2));
    expect(preview.mesh.geometry).not.toBe(geometryBefore);
    expect(preview.isActive).toBe(true);

    preview.hidePreview();
    expect(preview.isActive).toBe(false);
    expect(preview.mesh.visible).toBe(false);
  });

  it('update(dt) advances flow uniform while preview is active', () => {
    preview.showPreview(new THREE.Vector3(0, 0, 0), new THREE.Vector3(3, 0, 0));
    expect(getLinkPreviewUniforms(preview.mesh)?.uTime.value).toBe(0);

    preview.update(0.5);
    expect(getLinkPreviewUniforms(preview.mesh)?.uTime.value).toBeCloseTo(
      0.5 * FLOW_EDGE_ANIMATION_SPEED,
    );

    preview.hidePreview();
    const frozen = getLinkPreviewUniforms(preview.mesh)!.uTime.value;
    preview.update(1);
    expect(getLinkPreviewUniforms(preview.mesh)?.uTime.value).toBe(frozen);
  });

  it('setValidTarget toggles testable valid/invalid feedback flag', () => {
    preview.showPreview(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0));
    expect(preview.isValidTarget).toBe(true);

    preview.setValidTarget(false);
    expect(preview.isValidTarget).toBe(false);
    expect(preview.mesh.userData.validTarget).toBe(false);

    preview.setValidTarget(true);
    expect(preview.isValidTarget).toBe(true);
    expect(preview.mesh.userData.validTarget).toBe(true);
  });
});
