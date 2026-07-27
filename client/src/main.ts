import { createCanvasRenderer, startRenderLoop } from './scene/canvas-renderer';
import { mountPhaseNavigation } from './session/phase-navigation';

const app = document.getElementById('app');
const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;

if (canvas) {
  const renderer = createCanvasRenderer(canvas);
  startRenderLoop(renderer);
}

if (app) {
  mountPhaseNavigation(app, { canvas });
}
