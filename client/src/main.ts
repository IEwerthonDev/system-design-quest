import { createCanvasRenderer, startRenderLoop } from './scene/canvas-renderer';
import { initGameState } from './test-hook';

initGameState();

const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;

if (canvas) {
  const renderer = createCanvasRenderer(canvas);
  startRenderLoop(renderer);
}
