import { describe, expect, it, vi } from 'vitest';

const gridHelper = { type: 'GridHelper' };
const ambientLight = { type: 'AmbientLight' };
const directionalLight = { type: 'DirectionalLight', position: { set: vi.fn() } };
const sceneAdd = vi.fn();
const scene = { background: null, add: sceneAdd };
const camera = {
  position: { set: vi.fn() },
  lookAt: vi.fn(),
  aspect: 1,
  updateProjectionMatrix: vi.fn(),
};
const renderer = {
  setPixelRatio: vi.fn(),
  setSize: vi.fn(),
  render: vi.fn(),
  dispose: vi.fn(),
};
const controls = {
  enableRotate: true,
  enablePan: true,
  enableZoom: true,
  minPolarAngle: 0,
  maxPolarAngle: 0,
  target: { set: vi.fn() },
  update: vi.fn(),
  dispose: vi.fn(),
};

vi.mock('three', () => ({
  Scene: vi.fn(() => scene),
  Color: vi.fn((hex: number) => ({ hex })),
  PerspectiveCamera: vi.fn(() => camera),
  WebGLRenderer: vi.fn(() => renderer),
  AmbientLight: vi.fn(() => ambientLight),
  DirectionalLight: vi.fn(() => directionalLight),
  GridHelper: vi.fn(() => gridHelper),
}));

vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: vi.fn(() => controls),
}));

import { createCanvasRenderer } from './canvas-renderer';

describe('createCanvasRenderer', () => {
  it('builds an isometric scene with XZ grid and constrained orbit controls', () => {
    const canvas = document.createElement('canvas');
    Object.defineProperty(canvas, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: 600, configurable: true });

    const result = createCanvasRenderer(canvas);

    expect(camera.position.set).toHaveBeenCalledWith(20, 20, 20);
    expect(camera.lookAt).toHaveBeenCalledWith(0, 0, 0);
    expect(sceneAdd).toHaveBeenCalledWith(ambientLight, directionalLight, gridHelper);
    expect(controls.minPolarAngle).toBeCloseTo(Math.PI / 6);
    expect(controls.maxPolarAngle).toBeCloseTo(Math.PI / 2.2);
    expect(result.scene).toBe(scene);
    expect(result.controls).toBe(controls);
  });
});
