import { beforeEach, describe, expect, it } from 'vitest';
import { createSession, resetSessionStore } from '../session/session-store';
import { initGameState } from '../test-hook';
import {
  connectForTest,
  mountBlueprintCanvas,
  placeComponentForTest,
  setNodeConfigForTest,
} from './blueprint-canvas';
import { mountConfigPopover } from './config-popover';
import { PALETTE_DROP_EVENT, type PaletteDropDetail } from '../ui/palette';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function createPointerEvent(
  type: string,
  init: { clientX?: number; clientY?: number; pointerId?: number; button?: number } = {},
): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clientX', { value: init.clientX ?? 0 });
  Object.defineProperty(event, 'clientY', { value: init.clientY ?? 0 });
  Object.defineProperty(event, 'pointerId', { value: init.pointerId ?? 1 });
  Object.defineProperty(event, 'button', { value: init.button ?? 0 });
  return event;
}

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

  it('increments and floors replicas via card +/- buttons', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const canvas = mountBlueprintCanvas(host);
    const id = placeComponentForTest(canvas, 'app_server', { x: 10, y: 10 });
    const card = host.querySelector(`[data-testid="blueprint-node-${id}"]`) as HTMLElement;
    const buttons = card.querySelectorAll('.sdq-node__rep-btn');
    const minus = buttons[0] as HTMLButtonElement;
    const plus = buttons[1] as HTMLButtonElement;

    plus.click();
    plus.click();
    plus.click();
    expect(canvas.getGraph().nodes[0]?.replicas).toBe(4);
    expect(card.textContent).toMatch(/x4/);

    minus.click();
    minus.click();
    minus.click();
    minus.click();
    expect(canvas.getGraph().nodes[0]?.replicas).toBe(1);
    canvas.destroy();
  });

  it('updates node position when dragging the card body', () => {
    const host = document.createElement('div');
    Object.defineProperty(host, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    });
    document.body.append(host);
    const canvas = mountBlueprintCanvas(host);
    const id = placeComponentForTest(canvas, 'cdn', { x: 40, y: 50 });
    const card = host.querySelector(`[data-testid="blueprint-node-${id}"]`) as HTMLElement;
    card.setPointerCapture = () => undefined;

    card.dispatchEvent(createPointerEvent('pointerdown', { clientX: 120, clientY: 100 }));
    window.dispatchEvent(createPointerEvent('pointermove', { clientX: 220, clientY: 180 }));
    window.dispatchEvent(createPointerEvent('pointerup', { clientX: 220, clientY: 180 }));

    const pos = canvas.getGraph().nodes[0]?.position;
    expect(pos?.x).not.toBe(40);
    expect(pos?.y).not.toBe(50);
    canvas.destroy();
  });

  it('applies pan/zoom transform on the world container', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const canvas = mountBlueprintCanvas(host);
    const world = host.querySelector('[data-testid="blueprint-world"]') as HTMLElement;
    expect(world.style.transform).toContain('translate');
    expect(world.style.transform).toContain('scale(1)');

    const zoomIn = host.querySelector('.sdq-blueprint-zoom button') as HTMLButtonElement;
    zoomIn.click();
    expect(world.style.transform).toMatch(/scale\(1\.1\)/);

    host.dispatchEvent(createPointerEvent('pointerdown', { clientX: 100, clientY: 100 }));
    window.dispatchEvent(createPointerEvent('pointermove', { clientX: 160, clientY: 140 }));
    window.dispatchEvent(createPointerEvent('pointerup', {}));
    expect(world.style.transform).toMatch(/translate\(/);
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
    expect(host.querySelector('[data-testid="blueprint-edges"]')).toBeTruthy();
    canvas.destroy();
  });

  it('opens config popover with hit rate, notes, and judge footer', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const canvas = mountBlueprintCanvas(host);
    const id = placeComponentForTest(canvas, 'cache_redis', { x: 0, y: 0 });
    const card = host.querySelector(`[data-testid="blueprint-node-${id}"]`) as HTMLElement;
    card.setPointerCapture = () => undefined;
    card.dispatchEvent(createPointerEvent('pointerdown', { clientX: 10, clientY: 10 }));

    const popover = document.querySelector('[data-testid="config-popover"]') as HTMLElement;
    expect(popover.hidden).toBe(true);

    (
      host.querySelector(`[data-testid="node-details-${id}"]`) as HTMLButtonElement
    ).click();

    expect(popover.hidden).toBe(false);
    const detailsBtn = host.querySelector(
      `[data-testid="node-details-${id}"]`,
    ) as HTMLButtonElement;
    expect(detailsBtn.querySelector('svg')).toBeTruthy();
    expect(detailsBtn.getAttribute('aria-label')).toMatch(/configurações/i);
    expect(popover.textContent).toMatch(/Hit rate/i);
    expect(popover.textContent).toMatch(/juízes de IA|AI judges/i);
    expect(popover.querySelector('[data-testid="config-hit-rate"]')).toBeTruthy();
    expect(popover.querySelector('[data-testid="config-notes"]')).toBeTruthy();

    const slider = popover.querySelector('[data-testid="config-hit-rate"]') as HTMLInputElement;
    slider.value = '95';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    expect(canvas.getGraph().nodes[0]?.config).toEqual({
      kind: 'cache',
      hitRate: 95,
      eviction: 'lru',
      maxMemoryGb: 4,
    });

    const notes = popover.querySelector('[data-testid="config-notes"]') as HTMLTextAreaElement;
    notes.value = 'cache-aside';
    notes.dispatchEvent(new Event('change', { bubbles: true }));
    expect(canvas.getGraph().nodes[0]?.implementationNotes).toBe('cache-aside');
    canvas.destroy();
  });

  it('opens sql_db popover with shard, partitioning, and skew controls', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const canvas = mountBlueprintCanvas(host);
    const id = placeComponentForTest(canvas, 'sql_db', { x: 0, y: 0 });
    const card = host.querySelector(`[data-testid="blueprint-node-${id}"]`) as HTMLElement;
    card.setPointerCapture = () => undefined;
    card.dispatchEvent(createPointerEvent('pointerdown', { clientX: 10, clientY: 10 }));

    const popover = document.querySelector('[data-testid="config-popover"]') as HTMLElement;
    expect(popover.hidden).toBe(true);

    (
      host.querySelector(`[data-testid="node-details-${id}"]`) as HTMLButtonElement
    ).click();

    expect(popover.hidden).toBe(false);
    expect(popover.querySelector('[data-testid="config-access-pattern"]')).toBeTruthy();
    expect(popover.querySelector('[data-testid="config-topology-role"]')).toBeTruthy();
    expect(popover.querySelector('[data-testid="config-shard-count"]')).toBeTruthy();
    const advancedToggle = popover.querySelector(
      '[data-testid="config-advanced-toggle"]',
    ) as HTMLButtonElement;
    advancedToggle.click();
    expect(popover.querySelector('[data-testid="config-partitioning"]')).toBeTruthy();
    expect(popover.querySelector('[data-testid="config-key-skew"]')).toBeTruthy();

    const shards = popover.querySelector('[data-testid="config-shard-count"]') as HTMLInputElement;
    shards.value = '64';
    shards.dispatchEvent(new Event('input', { bubbles: true }));
    expect(canvas.getGraph().nodes[0]?.config).toMatchObject({ kind: 'sql_db', shardCount: 64 });
    canvas.destroy();
  });

  it('marks sql pressure hot under low hitRate and high traffic when running', () => {
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
    canvas.updateSimulation({ running: true, traffic: 5, readRatio: 90, speed: 2 });
    expect(canvas.getGraph().simulation?.running).toBe(true);
    const pressures = (window.__GAME_STATE__ as { pressures?: Record<string, string> }).pressures;
    expect(pressures?.[db]).toBe('hot');
    canvas.updateSimulation({ running: false });
    expect(canvas.getGraph().simulation?.running).toBe(false);
    canvas.destroy();
  });

  it('shows BOTTLENECK / QUEUEING labels and ms bar from pressures when running', () => {
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

    canvas.updateSimulation({ running: true, traffic: 5, readRatio: 90, speed: 1 });
    const hotCard = host.querySelector(`[data-testid="blueprint-node-${db}"]`) as HTMLElement;
    const hotLabel = hotCard.querySelector('[data-testid="load-label"]') as HTMLElement;
    const hotBar = hotCard.querySelector('[data-testid="ms-bar"]') as HTMLElement;
    expect(hotLabel?.textContent).toBe('BOTTLENECK');
    expect(hotLabel?.className).toMatch(/load-label--hot|load-label--red/);
    const hotReason = hotCard.querySelector('[data-testid="load-reason"]') as HTMLElement;
    expect(hotReason?.hidden).toBe(false);
    expect(hotReason?.textContent?.length ?? 0).toBeGreaterThan(0);
    expect(hotLabel?.title).toBe(hotReason?.textContent);
    expect(hotBar).toBeTruthy();
    expect(hotBar.hidden).toBe(false);
    expect(hotBar.className).toMatch(/ms-bar--hot|ms-bar--red/);
    expect(hotBar.textContent).toMatch(/280/);
    const gs = window.__GAME_STATE__ as {
      pressures?: Record<string, string>;
      latencyMs?: Record<string, number> | null;
      pressureReasons?: Record<string, string> | null;
    };
    expect(gs.pressures?.[db]).toBe('hot');
    expect(gs.latencyMs?.[db]).toBe(280);
    expect(gs.pressureReasons?.[db]).toContain('hit rate baixo');

    canvas.updateSimulation({ running: true, traffic: 1, readRatio: 90, speed: 1 });
    const warnLabel = hotCard.querySelector('[data-testid="load-label"]') as HTMLElement;
    const warnBar = hotCard.querySelector('[data-testid="ms-bar"]') as HTMLElement;
    const warnReason = hotCard.querySelector('[data-testid="load-reason"]') as HTMLElement;
    const warnState = window.__GAME_STATE__ as {
      pressures?: Record<string, string>;
      latencyMs?: Record<string, number>;
      pressureReasons?: Record<string, string>;
    };
    expect(warnState.pressures?.[db]).toBe('warn');
    expect(warnLabel?.textContent).toBe('QUEUEING');
    expect(warnLabel?.className).toMatch(/load-label--warn|load-label--yellow/);
    expect(warnReason?.hidden).toBe(false);
    expect(warnReason?.textContent?.length ?? 0).toBeGreaterThan(0);
    expect(warnState.pressureReasons?.[db]).toEqual(expect.any(String));
    expect(warnBar.className).toMatch(/ms-bar--warn|ms-bar--yellow/);
    expect(warnBar.textContent).toMatch(/120/);
    expect(warnState.latencyMs?.[db]).toBe(120);

    setNodeConfigForTest(canvas, cache, { kind: 'cache', hitRate: 95 });
    canvas.updateSimulation({ running: true, traffic: 1, readRatio: 90, speed: 1 });
    const okCard = host.querySelector(`[data-testid="blueprint-node-${cache}"]`) as HTMLElement;
    const okLabel = okCard.querySelector('[data-testid="load-label"]') as HTMLElement | null;
    const okBar = okCard.querySelector('[data-testid="ms-bar"]') as HTMLElement;
    expect(okLabel?.hidden).toBe(true);
    expect(okLabel?.textContent ?? '').not.toMatch(/BOTTLENECK|QUEUEING/);
    expect(okBar.hidden).toBe(false);
    expect(okBar.className).toMatch(/ms-bar--ok|ms-bar--green/);

    canvas.updateSimulation({ running: false });
    const stoppedCard = host.querySelector(`[data-testid="blueprint-node-${db}"]`) as HTMLElement;
    expect(stoppedCard.querySelector('[data-testid="load-label"]')?.textContent ?? '').toBe('');
    expect((stoppedCard.querySelector('[data-testid="load-reason"]') as HTMLElement).hidden).toBe(true);
    expect((stoppedCard.querySelector('[data-testid="ms-bar"]') as HTMLElement).hidden).toBe(true);
    expect((window.__GAME_STATE__ as { latencyMs?: Record<string, number> | null }).latencyMs).toBeNull();
    expect(
      (window.__GAME_STATE__ as { pressureReasons?: Record<string, string> | null }).pressureReasons,
    ).toBeNull();
    canvas.destroy();
  });
});

describe('connection intent wiring (CI-02 / CI-03 / CI-05)', () => {
  beforeEach(() => {
    resetSessionStore();
    initGameState();
    createSession('url-shortener', 'study');
    document.body.innerHTML = '';
  });

  function firePointerDown(el: Element): void {
    el.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
  }

  it('applies destination heuristic labels on connect (CI-03)', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const canvas = mountBlueprintCanvas(host);
    const app = placeComponentForTest(canvas, 'app_server', { x: 0, y: 0 });
    const cache = placeComponentForTest(canvas, 'cache_redis', { x: 120, y: 0 });
    const sql = placeComponentForTest(canvas, 'sql_db', { x: 240, y: 0 });
    const lb = placeComponentForTest(canvas, 'load_balancer', { x: 360, y: 0 });
    const client = placeComponentForTest(canvas, 'client_web', { x: -120, y: 0 });

    connectForTest(canvas, app, cache);
    connectForTest(canvas, app, sql);
    connectForTest(canvas, client, lb);

    const labels = Object.fromEntries(
      canvas.getGraph().edges.map((e) => [`${e.from}->${e.to}`, e.label]),
    );
    expect(labels[`${app}->${cache}`]).toBe('CACHE');
    expect(labels[`${app}->${sql}`]).toBe('DB');
    expect(labels[`${client}->${lb}`]).toBe('REQ');
    canvas.destroy();
  });

  it('pointer on edge path opens intent menu and clears node config (CI-02 / CI-05)', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const canvas = mountBlueprintCanvas(host);
    const a = placeComponentForTest(canvas, 'app_server', { x: 0, y: 0 });
    const b = placeComponentForTest(canvas, 'cache_redis', { x: 200, y: 0 });
    connectForTest(canvas, a, b);
    const edgeId = canvas.getGraph().edges[0]!.id;

    const card = host.querySelector(`[data-testid="blueprint-node-${a}"]`) as HTMLElement;
    card.setPointerCapture = () => undefined;
    card.dispatchEvent(createPointerEvent('pointerdown', { clientX: 10, clientY: 10 }));
    expect(document.querySelector('[data-testid="config-popover"]')?.hasAttribute('hidden')).toBe(
      true,
    );

    (
      host.querySelector(`[data-testid="node-details-${a}"]`) as HTMLButtonElement
    ).click();
    expect(document.querySelector('[data-testid="config-popover"]')?.hasAttribute('hidden')).toBe(
      false,
    );

    const path = host.querySelector(`g[data-edge-id="${edgeId}"] > path`);
    expect(path).toBeTruthy();
    firePointerDown(path!);

    const intent = document.querySelector('[data-testid="connection-intent"]') as HTMLElement;
    expect(intent).toBeTruthy();
    expect(intent.hidden).toBe(false);
    expect(window.__GAME_STATE__.canvasInteraction?.selectedEdgeId).toBe(edgeId);
    expect(document.querySelector('[data-testid="config-popover"]')?.hasAttribute('hidden')).toBe(
      true,
    );
    canvas.destroy();
  });

  it('choosing a menu row updates edge label, pill, and __GAME_STATE__', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const canvas = mountBlueprintCanvas(host);
    const a = placeComponentForTest(canvas, 'app_server', { x: 0, y: 0 });
    const b = placeComponentForTest(canvas, 'load_balancer', { x: 200, y: 0 });
    connectForTest(canvas, a, b);
    const edgeId = canvas.getGraph().edges[0]!.id;
    expect(canvas.getGraph().edges[0]?.label).toBe('REQ');

    firePointerDown(host.querySelector(`g[data-edge-id="${edgeId}"] > path`)!);
    const cacheOpt = document.querySelector('[data-intent-id="cache"]') as HTMLElement;
    cacheOpt.click();

    expect(canvas.getGraph().edges[0]?.label).toBe('CACHE');
    expect(window.__GAME_STATE__.graph.edges[0]?.label).toBe('CACHE');
    const pill = host.querySelector('[data-testid="edge-label"]');
    expect(pill?.textContent).toContain('CACHE');
    canvas.destroy();
  });

  it('Escape and canvas background close the intent popover (CI-02 AC5)', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const canvas = mountBlueprintCanvas(host);
    const a = placeComponentForTest(canvas, 'app_server', { x: 0, y: 0 });
    const b = placeComponentForTest(canvas, 'cache_redis', { x: 200, y: 0 });
    connectForTest(canvas, a, b);
    const edgeId = canvas.getGraph().edges[0]!.id;
    firePointerDown(host.querySelector(`g[data-edge-id="${edgeId}"] > path`)!);
    expect((document.querySelector('[data-testid="connection-intent"]') as HTMLElement).hidden).toBe(
      false,
    );

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect((document.querySelector('[data-testid="connection-intent"]') as HTMLElement).hidden).toBe(
      true,
    );

    firePointerDown(host.querySelector(`g[data-edge-id="${edgeId}"] > path`)!);
    expect((document.querySelector('[data-testid="connection-intent"]') as HTMLElement).hidden).toBe(
      false,
    );
    host.dispatchEvent(createPointerEvent('pointerdown', { clientX: 5, clientY: 5, button: 0 }));
    expect((document.querySelector('[data-testid="connection-intent"]') as HTMLElement).hidden).toBe(
      true,
    );
    canvas.destroy();
  });

  it('Delete removes selected edge; focus in input does not (CI-02 AC6)', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const canvas = mountBlueprintCanvas(host);
    const a = placeComponentForTest(canvas, 'app_server', { x: 0, y: 0 });
    const b = placeComponentForTest(canvas, 'cache_redis', { x: 200, y: 0 });
    connectForTest(canvas, a, b);
    const edgeId = canvas.getGraph().edges[0]!.id;
    firePointerDown(host.querySelector(`g[data-edge-id="${edgeId}"] > path`)!);
    expect(window.__GAME_STATE__.canvasInteraction?.selectedEdgeId).toBe(edgeId);

    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    expect(canvas.getGraph().edges).toHaveLength(1);

    document.body.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    expect(canvas.getGraph().edges).toHaveLength(0);
    expect(window.__GAME_STATE__.canvasInteraction?.selectedEdgeId ?? null).toBeNull();
    input.remove();
    canvas.destroy();
  });

  it('touch Delete connection control removes the selected edge', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const canvas = mountBlueprintCanvas(host);
    const a = placeComponentForTest(canvas, 'app_server', { x: 0, y: 0 });
    const b = placeComponentForTest(canvas, 'sql_db', { x: 200, y: 0 });
    connectForTest(canvas, a, b, 'DB');
    const edgeId = canvas.getGraph().edges[0]!.id;
    firePointerDown(host.querySelector(`g[data-edge-id="${edgeId}"] > path`)!);
    const del = document.querySelector(
      '[data-testid="connection-intent-delete"]',
    ) as HTMLButtonElement;
    expect(del).toBeTruthy();
    del.click();
    expect(canvas.getGraph().edges).toHaveLength(0);
    canvas.destroy();
  });

  it('tap palette drop places a node near canvas center', () => {
    const host = document.createElement('div');
    document.body.append(host);
    Object.defineProperty(host, 'getBoundingClientRect', {
      value: () => ({
        left: 0,
        top: 0,
        width: 400,
        height: 600,
        right: 400,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });
    const canvas = mountBlueprintCanvas(host);
    host.dispatchEvent(
      new CustomEvent<PaletteDropDetail>(PALETTE_DROP_EVENT, {
        detail: {
          type: 'load_balancer',
          clientX: 200,
          clientY: 300,
          source: 'tap',
        },
      }),
    );
    expect(canvas.getGraph().nodes).toHaveLength(1);
    expect(canvas.getGraph().nodes[0]?.type).toBe('load_balancer');
    canvas.destroy();
  });

  it('delete button removes the selected node', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const canvas = mountBlueprintCanvas(host);
    const id = placeComponentForTest(canvas, 'cdn', { x: 40, y: 40 });
    const card = host.querySelector(`[data-testid="blueprint-node-${id}"]`) as HTMLElement;
    card.setPointerCapture = () => undefined;
    card.dispatchEvent(createPointerEvent('pointerdown', { clientX: 50, clientY: 50 }));
    const del = host.querySelector(`[data-testid="node-delete-${id}"]`) as HTMLButtonElement;
    expect(del).toBeTruthy();
    del.click();
    expect(canvas.getGraph().nodes).toHaveLength(0);
    canvas.destroy();
  });

  it('undo restores prior graph via __GAME_STATE__ after mutate; redo restores', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const canvas = mountBlueprintCanvas(host);

    placeComponentForTest(canvas, 'app_server', { x: 10, y: 10 });
    expect(window.__GAME_STATE__.graph.nodes).toHaveLength(1);

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }),
    );
    expect(window.__GAME_STATE__.graph.nodes).toHaveLength(0);
    expect(canvas.getGraph().nodes).toHaveLength(0);

    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true }),
    );
    expect(window.__GAME_STATE__.graph.nodes).toHaveLength(1);

    canvas.undo();
    placeComponentForTest(canvas, 'cdn', { x: 20, y: 20 });
    expect(canvas.redo()).toBe(false);
    expect(window.__GAME_STATE__.graph.nodes).toHaveLength(1);
    expect(window.__GAME_STATE__.graph.nodes[0]?.type).toBe('cdn');

    expect(canvas.undo()).toBe(true);
    expect(window.__GAME_STATE__.graph.nodes).toHaveLength(0);
    expect(canvas.undo()).toBe(false);

    canvas.destroy();
  });

  it('exposes Undo/Redo buttons ≥44px when coarse pointer or narrow viewport', () => {
    const host = document.createElement('div');
    document.body.append(host);
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 480 });
    const canvas = mountBlueprintCanvas(host);

    const undoBtn = host.querySelector('[data-testid="canvas-undo"]') as HTMLButtonElement;
    const redoBtn = host.querySelector('[data-testid="canvas-redo"]') as HTMLButtonElement;
    const bar = host.querySelector('[data-testid="canvas-history"]') as HTMLElement;

    expect(bar.classList.contains('sdq-blueprint-history--visible')).toBe(true);
    const styles = document.getElementById('sdq-blueprint-styles')?.textContent ?? '';
    expect(styles).toMatch(/\.sdq-blueprint-history button\s*\{[^}]*min-width:\s*44px/s);
    expect(styles).toMatch(/\.sdq-blueprint-history button\s*\{[^}]*min-height:\s*44px/s);

    placeComponentForTest(canvas, 'cdn', { x: 5, y: 5 });
    undoBtn.click();
    expect(window.__GAME_STATE__.graph.nodes).toHaveLength(0);
    redoBtn.click();
    expect(window.__GAME_STATE__.graph.nodes).toHaveLength(1);

    canvas.destroy();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
  });
});

describe('config popover mount', () => {
  const anchor = {
    bottom: 100,
    left: 20,
    top: 0,
    right: 100,
    width: 80,
    height: 40,
    x: 20,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect;

  it('shows judge footer copy when opened', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const popover = mountConfigPopover(host, {
      onClose: () => undefined,
      onNotesChange: () => undefined,
      onConfigChange: () => undefined,
    });
    popover.open(
      {
        id: 'n1',
        type: 'cdn',
        label: 'CDN',
        replicas: 1,
        position: { x: 0, y: 0 },
        config: { kind: 'cdn', hitRate: 99, ttlSeconds: 3600 },
      },
      anchor,
    );
    expect(popover.root.hidden).toBe(false);
    expect(popover.root.textContent).toMatch(/juízes de IA|AI judges/i);
    popover.destroy();
  });

  it('exposes CDN TTL and calls onConfigChange (JR-18)', () => {
    const changes: unknown[] = [];
    const host = document.createElement('div');
    document.body.append(host);
    const popover = mountConfigPopover(host, {
      onClose: () => undefined,
      onNotesChange: () => undefined,
      onConfigChange: (_id, config) => {
        changes.push(config);
      },
    });
    popover.open(
      {
        id: 'cdn1',
        type: 'cdn',
        label: 'CDN',
        replicas: 1,
        position: { x: 0, y: 0 },
        config: { kind: 'cdn', hitRate: 99, ttlSeconds: 3600 },
      },
      anchor,
    );
    const ttl = popover.root.querySelector('[data-testid="config-cdn-ttl"]') as HTMLInputElement;
    expect(ttl).toBeTruthy();
    ttl.value = '120';
    ttl.dispatchEvent(new Event('input', { bubbles: true }));
    expect(changes.at(-1)).toEqual({ kind: 'cdn', hitRate: 99, ttlSeconds: 120 });
    popover.destroy();
  });

  it('exposes MQ durability/partitions and WS fan-out and LB algorithm (JR-18)', () => {
    const changes: unknown[] = [];
    const host = document.createElement('div');
    document.body.append(host);
    const popover = mountConfigPopover(host, {
      onClose: () => undefined,
      onNotesChange: () => undefined,
      onConfigChange: (_id, config) => {
        changes.push(config);
      },
    });

    popover.open(
      {
        id: 'mq1',
        type: 'message_queue',
        label: 'MQ',
        replicas: 1,
        position: { x: 0, y: 0 },
        config: { kind: 'mq', durability: 'disk', partitionCount: 3 },
      },
      anchor,
    );
    expect(popover.root.querySelector('[data-testid="config-mq-durability"]')).toBeTruthy();
    const parts = popover.root.querySelector(
      '[data-testid="config-mq-partitions"]',
    ) as HTMLInputElement;
    parts.value = '16';
    parts.dispatchEvent(new Event('input', { bubbles: true }));
    expect(changes.at(-1)).toMatchObject({ kind: 'mq', partitionCount: 16 });

    popover.open(
      {
        id: 'ws1',
        type: 'websocket_gateway',
        label: 'WS',
        replicas: 1,
        position: { x: 0, y: 0 },
        config: { kind: 'ws', fanOutLimit: 10_000 },
      },
      anchor,
    );
    const fan = popover.root.querySelector('[data-testid="config-ws-fanout"]') as HTMLInputElement;
    fan.value = '500';
    fan.dispatchEvent(new Event('input', { bubbles: true }));
    expect(changes.at(-1)).toEqual({ kind: 'ws', fanOutLimit: 500 });

    popover.open(
      {
        id: 'lb1',
        type: 'load_balancer',
        label: 'LB',
        replicas: 1,
        position: { x: 0, y: 0 },
        config: { kind: 'lb', algorithm: 'round_robin' },
      },
      anchor,
    );
    const algo = popover.root.querySelector(
      '[data-testid="config-lb-algorithm"]',
    ) as HTMLSelectElement;
    algo.value = 'least_conn';
    algo.dispatchEvent(new Event('change', { bubbles: true }));
    expect(changes.at(-1)).toEqual({ kind: 'lb', algorithm: 'least_conn' });
    popover.destroy();
  });

  it('tap-to-connect completes a link on second node select while linking', () => {
    const host = document.createElement('div');
    Object.defineProperty(host, 'getBoundingClientRect', {
      value: () => ({ left: 0, top: 0, right: 800, bottom: 600, width: 800, height: 600 }),
    });
    document.body.append(host);
    const canvas = mountBlueprintCanvas(host);
    const a = placeComponentForTest(canvas, 'client_web', { x: 40, y: 40 });
    const b = placeComponentForTest(canvas, 'cdn', { x: 240, y: 40 });
    const out = host.querySelector(
      `[data-testid="blueprint-node-${a}"] [data-handle="out"]`,
    ) as HTMLElement;
    out.dispatchEvent(createPointerEvent('pointerdown', { clientX: 100, clientY: 60 }));
    window.dispatchEvent(createPointerEvent('pointerup', { clientX: 100, clientY: 60 }));
    expect(window.__GAME_STATE__.canvasInteraction.linkingFromId).toBe(a);
    expect(host.querySelector('[data-testid="edge-preview"]')).toBeTruthy();

    const target = host.querySelector(`[data-testid="blueprint-node-${b}"]`) as HTMLElement;
    target.dispatchEvent(createPointerEvent('pointerdown', { clientX: 280, clientY: 60 }));
    expect(canvas.getGraph().edges).toHaveLength(1);
    expect(canvas.getGraph().edges[0]).toMatchObject({ from: a, to: b });
    expect(window.__GAME_STATE__.canvasInteraction.linkingFromId).toBeNull();
    canvas.destroy();
  });

  it('rejects invalid pair links and keeps linking armed', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const canvas = mountBlueprintCanvas(host);
    const a = placeComponentForTest(canvas, 'sql_db', { x: 40, y: 40 });
    const b = placeComponentForTest(canvas, 'client_web', { x: 240, y: 40 });
    const out = host.querySelector(
      `[data-testid="blueprint-node-${a}"] [data-handle="out"]`,
    ) as HTMLElement;
    out.dispatchEvent(createPointerEvent('pointerdown', { clientX: 80, clientY: 50 }));
    window.dispatchEvent(createPointerEvent('pointerup', { clientX: 80, clientY: 50 }));
    const target = host.querySelector(`[data-testid="blueprint-node-${b}"]`) as HTMLElement;
    target.dispatchEvent(createPointerEvent('pointerdown', { clientX: 280, clientY: 50 }));
    expect(canvas.getGraph().edges).toHaveLength(0);
    expect(window.__GAME_STATE__.canvasInteraction.linkingFromId).toBe(a);
    canvas.destroy();
  });

  it('renders warn stroke for client → DB edges', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const canvas = mountBlueprintCanvas(host);
    const client = placeComponentForTest(canvas, 'client_web', { x: 10, y: 10 });
    const db = placeComponentForTest(canvas, 'sql_db', { x: 200, y: 10 });
    connectForTest(canvas, client, db);
    const edgeG = host.querySelector('g[data-pair-status="warn"]');
    expect(edgeG).toBeTruthy();
    const path = edgeG?.querySelector('path');
    expect(path?.getAttribute('stroke')).toBe('#fbbf24');
    canvas.destroy();
  });
});
