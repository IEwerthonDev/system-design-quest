import { beforeEach, describe, expect, it } from 'vitest';
import { createSession, resetSessionStore } from '../session/session-store';
import { initGameState } from '../test-hook';
import {
  connectForTest,
  mountBlueprintCanvas,
  placeComponentForTest,
  setNodeConfigForTest,
  setReplicasForTest,
} from './blueprint-canvas';
import { PALETTE_DROP_EVENT, type PaletteDropDetail } from '../ui/palette';

describe('blueprint canvas', () => {
  beforeEach(() => {
    resetSessionStore();
    initGameState();
    createSession('url-shortener', 'study');
    document.body.innerHTML = '';
  });

  it('places nodes from palette drop and syncs graph', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const canvas = mountBlueprintCanvas(host);

    host.dispatchEvent(
      new CustomEvent<PaletteDropDetail>(PALETTE_DROP_EVENT, {
        detail: { type: 'app_server', clientX: 200, clientY: 150 },
      }),
    );

    expect(canvas.getGraph().nodes).toHaveLength(1);
    expect(canvas.getGraph().nodes[0]?.type).toBe('app_server');
    expect(canvas.getGraph().nodes[0]?.replicas).toBe(1);
    expect(window.__GAME_STATE__.graph.nodes).toHaveLength(1);
    canvas.destroy();
  });

  it('updates replicas with floor at 1', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const canvas = mountBlueprintCanvas(host);
    const id = placeComponentForTest(canvas, 'cache_redis', { x: 10, y: 10 });
    setReplicasForTest(canvas, id, 4);
    expect(canvas.getGraph().nodes[0]?.replicas).toBe(4);
    setReplicasForTest(canvas, id, 1);
    expect(canvas.getGraph().nodes[0]?.replicas).toBe(1);
    canvas.destroy();
  });

  it('connects nodes and stores edge labels', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const canvas = mountBlueprintCanvas(host);
    const a = placeComponentForTest(canvas, 'load_balancer', { x: 0, y: 0 });
    const b = placeComponentForTest(canvas, 'app_server', { x: 200, y: 0 });
    connectForTest(canvas, a, b, 'REQ');
    expect(canvas.getGraph().edges).toHaveLength(1);
    expect(canvas.getGraph().edges[0]?.label).toBe('REQ');
    canvas.destroy();
  });

  it('persists typed config and implementation notes', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const canvas = mountBlueprintCanvas(host);
    const id = placeComponentForTest(canvas, 'cache_redis', { x: 0, y: 0 });
    setNodeConfigForTest(canvas, id, { kind: 'cache', hitRate: 95 }, 'cache-aside');
    const node = canvas.getGraph().nodes[0];
    expect(node?.config).toEqual({ kind: 'cache', hitRate: 95 });
    expect(node?.implementationNotes).toBe('cache-aside');
    canvas.destroy();
  });

  it('toggles simulation running and exposes pressures', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const canvas = mountBlueprintCanvas(host);
    const client = placeComponentForTest(canvas, 'client_web', { x: 0, y: 0 });
    const app = placeComponentForTest(canvas, 'app_server', { x: 100, y: 0 });
    const cache = placeComponentForTest(canvas, 'cache_redis', { x: 200, y: 0 });
    const db = placeComponentForTest(canvas, 'sql_db', { x: 300, y: 0 });
    connectForTest(canvas, client, app);
    connectForTest(canvas, app, cache, 'CACHE');
    connectForTest(canvas, cache, db, 'DB');
    connectForTest(canvas, app, db, 'DB');
    setNodeConfigForTest(canvas, cache, { kind: 'cache', hitRate: 10 });
    canvas.updateSimulation({ running: true, traffic: 10, readRatio: 90, speed: 2 });
    expect(canvas.getGraph().simulation?.running).toBe(true);
    expect(window.__GAME_STATE__.graph.simulation?.running).toBe(true);
    const pressures = (window.__GAME_STATE__ as { pressures?: Record<string, string> }).pressures;
    expect(pressures?.[db]).toBeDefined();
    canvas.updateSimulation({ running: false });
    expect(canvas.getGraph().simulation?.running).toBe(false);
    canvas.destroy();
  });
});
