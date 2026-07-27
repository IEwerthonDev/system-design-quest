import { createCanvasRenderer, startRenderLoop } from './scene/canvas-renderer';
import { bootstrapApp } from './bootstrap';

const app = document.getElementById('app');
const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;

if (canvas) {
  const renderer = createCanvasRenderer(canvas);
  startRenderLoop(renderer);
}

if (app) {
  bootstrapApp(app, canvas);
}
