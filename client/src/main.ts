import { createCanvasRenderer, startRenderLoop } from './scene/canvas-renderer';
import { bootstrapApp } from './bootstrap';
import { startResponsiveLayout } from './ui/responsive';

const app = document.getElementById('app');
const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;

if (canvas) {
  const renderer = createCanvasRenderer(canvas);
  startRenderLoop(renderer);
}

startResponsiveLayout();

if (app) {
  bootstrapApp(app, canvas);
}
