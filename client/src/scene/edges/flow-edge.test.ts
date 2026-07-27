import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import {
  FLOW_EDGE_ANIMATION_SPEED,
  createFlowCurve,
  createFlowEdge,
  getFlowEdgeUniforms,
  updateFlowAnimation,
} from './flow-edge';

vi.mock('./flow-edge.frag?raw', () => ({
  default: 'mocked-fragment-shader',
}));

describe('flow edge shader', () => {
  it('creates a TubeGeometry mesh with uTime and uBidirectional uniforms', () => {
    const edge = createFlowEdge(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(4, 0, 2),
      'forward',
    );

    expect(edge.mesh.geometry).toBeInstanceOf(THREE.TubeGeometry);
    expect(edge.mesh.userData.isFlowEdge).toBe(true);

    const uniforms = getFlowEdgeUniforms(edge.mesh);
    expect(uniforms?.uTime.value).toBe(0);
    expect(uniforms?.uBidirectional.value).toBe(0);
  });

  it('uses QuadraticBezierCurve3 instead of a straight LineCurve3', () => {
    const from = new THREE.Vector3(0, 0, 0);
    const to = new THREE.Vector3(4, 0, 0);
    const curve = createFlowCurve(from, to);

    expect(curve).toBeInstanceOf(THREE.QuadraticBezierCurve3);
    expect(curve).not.toBeInstanceOf(THREE.LineCurve3);

    const edge = createFlowEdge(from, to, 'forward');
    const tube = edge.mesh.geometry as THREE.TubeGeometry;
    expect(tube.parameters.path).toBeInstanceOf(THREE.QuadraticBezierCurve3);
  });

  it('sets uBidirectional for bidirectional edges', () => {
    const edge = createFlowEdge(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(2, 0, 0),
      'bidirectional',
    );

    expect(getFlowEdgeUniforms(edge.mesh)?.uBidirectional.value).toBe(1);
  });

  it('setDirection toggles uBidirectional between forward and bidirectional', () => {
    const edge = createFlowEdge(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(2, 0, 0),
      'forward',
    );

    edge.setDirection('bidirectional');
    expect(edge.direction).toBe('bidirectional');
    expect(getFlowEdgeUniforms(edge.mesh)?.uBidirectional.value).toBe(1);

    edge.setDirection('forward');
    expect(edge.direction).toBe('forward');
    expect(getFlowEdgeUniforms(edge.mesh)?.uBidirectional.value).toBe(0);
  });

  it('rebuildGeometry replaces tube endpoints while keeping uniforms', () => {
    const edge = createFlowEdge(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(2, 0, 0),
      'forward',
    );
    const previousGeometry = edge.mesh.geometry;
    updateFlowAnimation([edge], 0.5);
    const timeBefore = getFlowEdgeUniforms(edge.mesh)!.uTime.value;

    edge.rebuildGeometry(new THREE.Vector3(1, 0, 1), new THREE.Vector3(5, 0, 3));

    expect(edge.mesh.geometry).not.toBe(previousGeometry);
    expect(edge.mesh.geometry).toBeInstanceOf(THREE.TubeGeometry);
    expect(
      (edge.mesh.geometry as THREE.TubeGeometry).parameters.path,
    ).toBeInstanceOf(THREE.QuadraticBezierCurve3);
    expect(getFlowEdgeUniforms(edge.mesh)?.uTime.value).toBe(timeBefore);
    expect(getFlowEdgeUniforms(edge.mesh)?.uBidirectional.value).toBe(0);
  });

  it('updateFlowAnimation advances uTime proportional to dt', () => {
    const edge = createFlowEdge(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(2, 0, 0),
      'forward',
    );

    updateFlowAnimation([edge], 0.5);

    expect(getFlowEdgeUniforms(edge.mesh)?.uTime.value).toBeCloseTo(
      0.5 * FLOW_EDGE_ANIMATION_SPEED,
    );
  });

  it('fragment shader includes bidirectional reverse pulse logic', () => {
    const fragPath = join(dirname(fileURLToPath(import.meta.url)), 'flow-edge.frag');
    const source = readFileSync(fragPath, 'utf8');

    expect(source).toContain('uBidirectional');
    expect(source).toContain('flowPulse(1.0 - vUv.x)');
  });
});
