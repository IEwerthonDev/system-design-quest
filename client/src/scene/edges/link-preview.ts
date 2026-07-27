import * as THREE from 'three';
import {
  FLOW_EDGE_ANIMATION_SPEED,
  FLOW_EDGE_RADIAL_SEGMENTS,
  FLOW_EDGE_TUBE_RADIUS,
  FLOW_EDGE_TUBE_SEGMENTS,
  FLOW_EDGE_VERTEX_SHADER,
  createFlowCurve,
  getFlowEdgeUniforms,
  type FlowEdgeUniforms,
} from './flow-edge';
import fragmentShader from './flow-edge.frag?raw';

export interface LinkPreview {
  mesh: THREE.Mesh;
  isActive: boolean;
  isValidTarget: boolean;
  showPreview(from: THREE.Vector3, to: THREE.Vector3): void;
  updatePreview(to: THREE.Vector3): void;
  setValidTarget(valid: boolean): void;
  hidePreview(): void;
  update(dt: number): void;
  dispose(): void;
}

const PREVIEW_TUBE_RADIUS = FLOW_EDGE_TUBE_RADIUS * 0.85;

function buildGeometry(from: THREE.Vector3, to: THREE.Vector3): THREE.TubeGeometry {
  return new THREE.TubeGeometry(
    createFlowCurve(from, to),
    FLOW_EDGE_TUBE_SEGMENTS,
    PREVIEW_TUBE_RADIUS,
    FLOW_EDGE_RADIAL_SEGMENTS,
    false,
  );
}

export function createLinkPreview(scene: THREE.Scene): LinkPreview {
  const uniforms: FlowEdgeUniforms = {
    uTime: { value: 0 },
    uBidirectional: { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: FLOW_EDGE_VERTEX_SHADER,
    fragmentShader,
    transparent: true,
    depthWrite: false,
  });

  let geometry = buildGeometry(new THREE.Vector3(), new THREE.Vector3(1, 0, 0));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.visible = false;
  mesh.renderOrder = 6;
  mesh.userData.isLinkPreview = true;
  scene.add(mesh);

  let fromPoint = new THREE.Vector3();
  let toPoint = new THREE.Vector3(1, 0, 0);
  let isActive = false;
  let isValidTarget = true;

  const replaceGeometry = (from: THREE.Vector3, to: THREE.Vector3): void => {
    const next = buildGeometry(from, to);
    geometry.dispose();
    mesh.geometry = next;
    geometry = next;
  };

  const preview: LinkPreview = {
    mesh,
    get isActive() {
      return isActive;
    },
    get isValidTarget() {
      return isValidTarget;
    },
    showPreview(from, to) {
      fromPoint = from.clone();
      toPoint = to.clone();
      replaceGeometry(fromPoint, toPoint);
      uniforms.uTime.value = 0;
      isActive = true;
      mesh.visible = true;
    },
    updatePreview(to) {
      if (!isActive) {
        return;
      }
      toPoint = to.clone();
      replaceGeometry(fromPoint, toPoint);
    },
    setValidTarget(valid) {
      isValidTarget = valid;
      mesh.userData.validTarget = valid;
    },
    hidePreview() {
      isActive = false;
      mesh.visible = false;
    },
    update(dt) {
      if (!isActive) {
        return;
      }
      uniforms.uTime.value += dt * FLOW_EDGE_ANIMATION_SPEED;
    },
    dispose() {
      scene.remove(mesh);
      geometry.dispose();
      material.dispose();
      isActive = false;
    },
  };

  mesh.userData.validTarget = true;
  return preview;
}

export function getLinkPreviewUniforms(mesh: THREE.Mesh): FlowEdgeUniforms | null {
  return getFlowEdgeUniforms(mesh);
}
