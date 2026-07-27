import * as THREE from 'three';
import type { EdgeDirection } from '../edge-manager';
import fragmentShader from './flow-edge.frag?raw';

export const FLOW_EDGE_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const FLOW_EDGE_ANIMATION_SPEED = 0.35;
export const FLOW_EDGE_TUBE_RADIUS = 0.06;
export const FLOW_EDGE_TUBE_SEGMENTS = 32;
export const FLOW_EDGE_RADIAL_SEGMENTS = 8;
export const FLOW_EDGE_LIFT_Y = 0.55;

export interface FlowEdgeObject {
  mesh: THREE.Mesh;
  direction: EdgeDirection;
  update(dt: number): void;
  dispose(): void;
}

export interface FlowEdgeUniforms {
  uTime: THREE.IUniform<number>;
  uBidirectional: THREE.IUniform<number>;
}

function createCurve(from: THREE.Vector3, to: THREE.Vector3): THREE.Curve<THREE.Vector3> {
  const start = from.clone().setY(from.y + FLOW_EDGE_LIFT_Y);
  const end = to.clone().setY(to.y + FLOW_EDGE_LIFT_Y);
  return new THREE.LineCurve3(start, end);
}

export function createFlowEdge(
  from: THREE.Vector3,
  to: THREE.Vector3,
  direction: EdgeDirection,
): FlowEdgeObject {
  const curve = createCurve(from, to);
  const geometry = new THREE.TubeGeometry(
    curve,
    FLOW_EDGE_TUBE_SEGMENTS,
    FLOW_EDGE_TUBE_RADIUS,
    FLOW_EDGE_RADIAL_SEGMENTS,
    false,
  );

  const uniforms: FlowEdgeUniforms = {
    uTime: { value: 0 },
    uBidirectional: { value: direction === 'bidirectional' ? 1 : 0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: FLOW_EDGE_VERTEX_SHADER,
    fragmentShader,
    transparent: true,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.isFlowEdge = true;
  mesh.renderOrder = 5;

  return {
    mesh,
    direction,
    update(dt: number) {
      uniforms.uTime.value += dt * FLOW_EDGE_ANIMATION_SPEED;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

export function updateFlowAnimation(edges: Iterable<FlowEdgeObject>, dt: number): void {
  for (const edge of edges) {
    edge.update(dt);
  }
}

export function getFlowEdgeUniforms(mesh: THREE.Mesh): FlowEdgeUniforms | null {
  const material = mesh.material;
  if (!(material instanceof THREE.ShaderMaterial)) {
    return null;
  }

  return material.uniforms as FlowEdgeUniforms;
}
