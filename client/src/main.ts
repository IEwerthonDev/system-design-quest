import './theme/global.css';
import { mountBlueprintCanvas, type BlueprintCanvas } from './blueprint/blueprint-canvas';
import { bootstrapApp } from './bootstrap';
import { startResponsiveLayout } from './ui/responsive';
import { installE2eHooks } from './e2e-hooks';

const app = document.getElementById('app');
const blueprintHost =
  (document.getElementById('blueprint-root') as HTMLElement | null) ??
  (() => {
    const el = document.createElement('div');
    el.id = 'blueprint-root';
    app?.prepend(el);
    return el;
  })();

let blueprint: BlueprintCanvas | null = null;

try {
  if (blueprintHost) {
    blueprint = mountBlueprintCanvas(blueprintHost);
    (window as Window & { __BLUEPRINT__?: BlueprintCanvas }).__BLUEPRINT__ = blueprint;
  }
} catch {
  // UI still boots for tests / headless
}

startResponsiveLayout();
installE2eHooks();

if (app) {
  bootstrapApp(app, blueprintHost);
}

export { blueprint };
