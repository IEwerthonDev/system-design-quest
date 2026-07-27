import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { getComponentsForTier } from '@sdq/shared';
import type { ComponentType } from '@sdq/shared';
import { createComponentInstance } from './scene/component-instance';

function injectLabStyles(): void {
  if (document.getElementById('sdq-component-lab-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'sdq-component-lab-styles';
  style.textContent = `
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #0f1419;
      color: #e2e8f0;
      font-family: system-ui, sans-serif;
    }
    .sdq-lab-header {
      padding: 16px 20px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.2);
    }
    .sdq-lab-header h1 {
      margin: 0 0 6px;
      font-size: 20px;
      color: #7dd3fc;
    }
    .sdq-lab-header p {
      margin: 0;
      font-size: 13px;
      color: #94a3b8;
    }
    .sdq-lab-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
      padding: 16px;
    }
    .sdq-lab-card {
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 10px;
      background: rgba(30, 41, 59, 0.7);
      overflow: hidden;
    }
    .sdq-lab-card canvas {
      display: block;
      width: 100%;
      height: 180px;
      background: #0f1419;
    }
    .sdq-lab-card__meta {
      padding: 10px 12px 12px;
    }
    .sdq-lab-card__type {
      margin: 0 0 4px;
      font-size: 12px;
      color: #94a3b8;
      font-family: ui-monospace, monospace;
    }
    .sdq-lab-card__label {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
    }
  `;
  document.head.append(style);
}

function mountPreview(canvas: HTMLCanvasElement, type: string): () => void {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f1419);

  const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(3.5, 3.5, 3.5);
  camera.lookAt(0, 0.4, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

  const ambient = new THREE.AmbientLight(0xffffff, 0.65);
  const directional = new THREE.DirectionalLight(0xffffff, 0.85);
  directional.position.set(4, 8, 4);
  scene.add(ambient, directional);

  const instance = createComponentInstance(type as ComponentType, { x: 0, y: 0, z: 0 }, `lab-${type}`);
  scene.add(instance.group);

  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.target.set(0, 0.4, 0);
  controls.update();

  let frameId = 0;
  const render = (): void => {
    controls.update();
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(render);
  };
  render();

  return () => {
    cancelAnimationFrame(frameId);
    controls.dispose();
    renderer.dispose();
    scene.remove(instance.group);
  };
}

function bootstrapComponentLab(): void {
  injectLabStyles();

  const app = document.getElementById('app');
  if (!app) {
    return;
  }

  const header = document.createElement('header');
  header.className = 'sdq-lab-header';
  header.innerHTML = `
    <h1>Component Lab</h1>
    <p>Preview de primitivos 3D por tipo (Tier 2 — 25 componentes)</p>
  `;

  const grid = document.createElement('div');
  grid.className = 'sdq-lab-grid';
  grid.setAttribute('data-testid', 'component-lab-grid');

  const disposers: Array<() => void> = [];
  const components = getComponentsForTier(2);

  for (const meta of components) {
    const card = document.createElement('article');
    card.className = 'sdq-lab-card';
    card.setAttribute('data-testid', `lab-card-${meta.type}`);

    const canvas = document.createElement('canvas');
    canvas.width = 220;
    canvas.height = 180;

    const metaBlock = document.createElement('div');
    metaBlock.className = 'sdq-lab-card__meta';

    const typeEl = document.createElement('p');
    typeEl.className = 'sdq-lab-card__type';
    typeEl.textContent = meta.type;

    const labelEl = document.createElement('p');
    labelEl.className = 'sdq-lab-card__label';
    labelEl.textContent = meta.label;

    metaBlock.append(typeEl, labelEl);
    card.append(canvas, metaBlock);
    grid.append(card);

    disposers.push(mountPreview(canvas, meta.type));
  }

  app.append(header, grid);

  window.addEventListener('beforeunload', () => {
    for (const dispose of disposers) {
      dispose();
    }
  });
}

bootstrapComponentLab();
