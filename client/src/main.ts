import { createCanvasRenderer, startRenderLoop } from './scene/canvas-renderer';
import { mountCanvasInteraction } from './scene/canvas-interaction';
import { bootstrapApp } from './bootstrap';
import { startResponsiveLayout } from './ui/responsive';
import { installE2eHooks } from './e2e-hooks';

const app = document.getElementById('app');
const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;

try {
  if (canvas) {
    const renderer = createCanvasRenderer(canvas);
    const uiHost = app ?? document.body;
    const interaction = mountCanvasInteraction(renderer, canvas, uiHost);
    startRenderLoop(renderer, (dt) => interaction.update(dt));
  }
} catch {
  // Headless / missing WebGL — UI still boots for e2e and non-WebGL environments
}

startResponsiveLayout();
installE2eHooks();

if (app) {
  bootstrapApp(app, canvas);
}
