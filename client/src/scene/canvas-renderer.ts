import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface CanvasRenderer {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  render: () => void;
  resize: () => void;
  dispose: () => void;
}

const GRID_SIZE = 40;
const GRID_DIVISIONS = 40;

function createGrid(): THREE.GridHelper {
  const grid = new THREE.GridHelper(GRID_SIZE, GRID_DIVISIONS, 0x3a4a5c, 0x1e2a36);
  return grid;
}

function configureIsometricCamera(camera: THREE.PerspectiveCamera): void {
  camera.position.set(20, 20, 20);
  camera.lookAt(0, 0, 0);
}

export function createCanvasRenderer(canvas: HTMLCanvasElement): CanvasRenderer {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f1419);

  const camera = new THREE.PerspectiveCamera(
    45,
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    500
  );
  configureIsometricCamera(camera);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  const directional = new THREE.DirectionalLight(0xffffff, 0.8);
  directional.position.set(10, 20, 10);
  scene.add(ambient, directional, createGrid());

  const controls = new OrbitControls(camera, canvas);
  controls.enableRotate = true;
  controls.enablePan = true;
  controls.enableZoom = true;
  controls.minPolarAngle = Math.PI / 6;
  controls.maxPolarAngle = Math.PI / 2.2;
  controls.target.set(0, 0, 0);
  controls.update();

  const resize = (): void => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };

  const render = (): void => {
    controls.update();
    renderer.render(scene, camera);
  };

  const dispose = (): void => {
    controls.dispose();
    renderer.dispose();
  };

  return { scene, camera, renderer, controls, render, resize, dispose };
}

export function startRenderLoop(
  renderer: CanvasRenderer,
  onFrame?: (dt: number) => void,
): () => void {
  let frameId = 0;
  let running = true;
  let lastTime = performance.now();

  const loop = (now: number): void => {
    if (!running) return;
    const dt = Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    onFrame?.(dt);
    renderer.render();
    frameId = requestAnimationFrame(loop);
  };

  const onResize = (): void => renderer.resize();
  window.addEventListener('resize', onResize);
  frameId = requestAnimationFrame(loop);

  return () => {
    running = false;
    cancelAnimationFrame(frameId);
    window.removeEventListener('resize', onResize);
    renderer.dispose();
  };
}
