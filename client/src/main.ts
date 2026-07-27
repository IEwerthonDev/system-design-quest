import { createCanvasRenderer, startRenderLoop } from './scene/canvas-renderer';

const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;

if (canvas) {
  const renderer = createCanvasRenderer(canvas);
  startRenderLoop(renderer);
}
