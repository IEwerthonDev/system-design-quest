import {
  DEFAULT_SIMULATION,
  evaluateSimulation,
  normalizeGraph,
  type ArchitectureGraph,
  type ComponentConfig,
  type ComponentNode,
  type ComponentType,
  type ConnectionEdge,
  type PressureLevel,
  type SimulationSettings,
} from '@sdq/shared';
import { PALETTE_DROP_EVENT, type PaletteDropDetail } from '../ui/palette';
import { getGameState } from '../test-hook';
import { getSession, setGraph as setSessionGraph } from '../session/session-store';
import { buildNewNode, createNodeCard, type NodeCardHandle } from './node-card';
import { mountConfigPopover } from './config-popover';
import { mountConnectionIntentPopover } from './connection-intent-popover';
import {
  defaultLabelForDestination,
  rememberDbIntentRole,
  shortLabelForIntentId,
  type ConnectionIntentId,
} from './connection-intents';
import { createSvgEdgeLayer, type EdgeEndpoints } from './svg-edges';

export interface BlueprintCanvas {
  root: HTMLElement;
  getGraph(): ArchitectureGraph;
  setGraph(graph: ArchitectureGraph): void;
  updateSimulation(partial: Partial<SimulationSettings>): void;
  destroy(): void;
}

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Date.now().toString(36)}`;
}

function injectBlueprintStyles(): void {
  if (document.getElementById('sdq-blueprint-styles')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'sdq-blueprint-styles';
  style.textContent = `
    .sdq-blueprint-host {
      position: absolute;
      inset: 0;
      overflow: hidden;
      touch-action: none;
      background-color: var(--sdq-canvas-bg);
      background-image:
        linear-gradient(var(--sdq-canvas-grid) 1px, transparent 1px),
        linear-gradient(90deg, var(--sdq-canvas-grid) 1px, transparent 1px);
      background-size: 24px 24px;
      z-index: 0;
    }
    .sdq-blueprint-world {
      position: absolute;
      left: 0;
      top: 0;
      width: 4000px;
      height: 3000px;
      transform-origin: 0 0;
    }
    .sdq-blueprint-zoom {
      position: fixed;
      left: 236px;
      bottom: 16px;
      z-index: 20;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .sdq-blueprint-zoom button {
      width: 32px; height: 32px; border-radius: var(--sdq-radius-sm);
      border: 1px solid var(--sdq-border-strong);
      background: var(--sdq-bg-elevated); color: var(--sdq-text); cursor: pointer; font-weight: 700;
      touch-action: manipulation;
    }
    .sdq-blueprint-link-hint {
      position: fixed;
      left: 50%;
      top: 72px;
      transform: translateX(-50%);
      z-index: 21;
      max-width: min(92vw, 420px);
      padding: 10px 14px;
      border-radius: var(--sdq-radius);
      background: var(--sdq-bg-elevated);
      border: 1px solid var(--sdq-accent-border);
      color: var(--sdq-text);
      font: 600 13px var(--sdq-font);
      text-align: center;
      box-shadow: 0 8px 24px rgba(0,0,0,0.35);
      pointer-events: none;
    }
    .sdq-blueprint-link-hint[hidden] {
      display: none !important;
    }
  `;
  document.head.append(style);
}

function cardAnchor(card: HTMLElement): { out: { x: number; y: number }; in: { x: number; y: number } } {
  const w = card.offsetWidth || 140;
  const h = card.offsetHeight || 70;
  const x = Number.parseFloat(card.style.left) || 0;
  const y = Number.parseFloat(card.style.top) || 0;
  return {
    out: { x: x + w, y: y + h / 2 },
    in: { x, y: y + h / 2 },
  };
}

export function mountBlueprintCanvas(host: HTMLElement): BlueprintCanvas {
  injectBlueprintStyles();

  const root = host;
  root.classList.add('sdq-blueprint-host');
  root.setAttribute('data-testid', 'blueprint-canvas');

  const world = document.createElement('div');
  world.className = 'sdq-blueprint-world';
  world.setAttribute('data-testid', 'blueprint-world');
  root.append(world);

  const edgeLayer = createSvgEdgeLayer(world, {
    onEdgeActivate: (edgeId) => {
      activateEdge(edgeId);
    },
  });
  const cards = new Map<string, NodeCardHandle>();

  let graph: ArchitectureGraph = normalizeGraph({
    nodes: [],
    edges: [],
    simulation: { ...DEFAULT_SIMULATION },
  });
  let selectedNodeId: string | null = null;
  let selectedEdgeId: string | null = null;
  let scale = 1;
  let panX = 80;
  let panY = 80;
  let linkingFrom: string | null = null;
  let dragNodeId: string | null = null;
  let dragOffset = { x: 0, y: 0 };
  let panning = false;
  let panStart = { x: 0, y: 0, panX: 0, panY: 0 };
  let linkGesture: {
    pointerId: number;
    x: number;
    y: number;
    moved: boolean;
  } | null = null;

  const popover = mountConfigPopover(document.body, {
    onClose: () => {
      popover.close();
      selectedNodeId = null;
      for (const card of cards.values()) {
        card.setSelected(false);
      }
      publishInteraction();
    },
    onNotesChange: (id, notes) => {
      updateNode(id, (n) => ({ ...n, implementationNotes: notes }));
    },
    onConfigChange: (id, config) => {
      updateNode(id, (n) => ({ ...n, config }));
    },
  });

  const intentPopover = mountConnectionIntentPopover(document.body, {
    onClose: () => {
      intentPopover.close();
    },
    onSelect: (edgeId, intentId) => {
      applyIntent(edgeId, intentId);
    },
  });

  const activateEdge = (edgeId: string): void => {
    selectedEdgeId = edgeId;
    selectedNodeId = null;
    for (const card of cards.values()) {
      card.setSelected(false);
    }
    popover.close();
    const edge = graph.edges.find((e) => e.id === edgeId);
    intentPopover.open(edgeId, edge?.label);
    renderEdges();
    publishInteraction();
  };

  const applyIntent = (edgeId: string, intentId: ConnectionIntentId): void => {
    const short = shortLabelForIntentId(intentId);
    if (intentId === 'db-default' || intentId === 'db-origin-fallback') {
      rememberDbIntentRole(edgeId, intentId);
    }
    graph = {
      ...graph,
      edges: graph.edges.map((e) => (e.id === edgeId ? { ...e, label: short } : e)),
    };
    persist();
    intentPopover.open(edgeId, short);
  };

  const zoomBar = document.createElement('div');
  zoomBar.className = 'sdq-blueprint-zoom';
  const zoomIn = document.createElement('button');
  zoomIn.type = 'button';
  zoomIn.textContent = '+';
  zoomIn.setAttribute('aria-label', 'Zoom in');
  const zoomOut = document.createElement('button');
  zoomOut.type = 'button';
  zoomOut.textContent = '−';
  zoomOut.setAttribute('aria-label', 'Zoom out');
  zoomBar.append(zoomIn, zoomOut);
  root.append(zoomBar);

  const linkHint = document.createElement('div');
  linkHint.className = 'sdq-blueprint-link-hint';
  linkHint.setAttribute('data-testid', 'blueprint-link-hint');
  linkHint.hidden = true;
  linkHint.textContent = 'Toque em outro componente para conectar · Esc cancela';
  root.append(linkHint);

  const setLinking = (fromId: string | null): void => {
    linkingFrom = fromId;
    linkHint.hidden = !fromId;
    if (!fromId) {
      linkGesture = null;
    }
    publishInteraction();
  };

  const applyTransform = (): void => {
    world.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  };
  applyTransform();

  zoomIn.addEventListener('click', () => {
    scale = Math.min(2, scale + 0.1);
    applyTransform();
  });
  zoomOut.addEventListener('click', () => {
    scale = Math.max(0.4, scale - 0.1);
    applyTransform();
  });

  const publishInteraction = (): void => {
    const state = getGameState();
    state.canvasInteraction = {
      mode: linkingFrom ? 'linking' : dragNodeId ? 'dragging' : selectedEdgeId ? 'edgeSelected' : 'idle',
      hoverComponentId: null,
      linkingFromId: linkingFrom,
      selectedEdgeId,
      previewActive: Boolean(linkingFrom),
      reconnectEnd: null,
    };
    (state as GameStateWithPressure).pressures = lastPressures;
    (state as GameStateWithPressure).latencyMs = lastLatencyMs;
    (state as GameStateWithPressure).pressureReasons = lastPressureReasons;
  };

  let lastPressures: Record<string, PressureLevel> | null = null;
  let lastLatencyMs: Record<string, number> | null = null;
  let lastPressureReasons: Record<string, string> | null = null;

  const persist = (): void => {
    graph = normalizeGraph(graph);
    if (getSession()) {
      setSessionGraph(graph);
    }
    const state = getGameState();
    state.graph = graph;
    publishInteraction();
    renderEdges();
    applyPressures();
  };

  const updateNode = (id: string, fn: (n: ComponentNode) => ComponentNode): void => {
    graph = {
      ...graph,
      nodes: graph.nodes.map((n) => (n.id === id ? fn(n) : n)),
    };
    const node = graph.nodes.find((n) => n.id === id);
    const card = cards.get(id);
    if (node && card) {
      card.sync(node);
    }
    persist();
  };

  const applyPressures = (): void => {
    const sim = graph.simulation ?? DEFAULT_SIMULATION;
    if (!sim.running) {
      lastPressures = null;
      lastLatencyMs = null;
      lastPressureReasons = null;
      for (const card of cards.values()) {
        card.setPressure(null);
      }
      const state = getGameState();
      (state as GameStateWithPressure).pressures = null;
      (state as GameStateWithPressure).latencyMs = null;
      (state as GameStateWithPressure).pressureReasons = null;
      return;
    }
    const result = evaluateSimulation(graph);
    lastPressures = result.nodes;
    lastLatencyMs = result.latencyMs;
    lastPressureReasons = result.reasons;
    for (const [id, card] of cards) {
      const level = result.nodes[id] ?? 'ok';
      card.setPressure(level, result.latencyMs[id] ?? null, result.reasons[id] ?? null);
    }
    const state = getGameState();
    (state as GameStateWithPressure).pressures = lastPressures;
    (state as GameStateWithPressure).latencyMs = lastLatencyMs;
    (state as GameStateWithPressure).pressureReasons = lastPressureReasons;
    (state as GameStateWithPressure).hotReadPath = result.hotReadPath;
  };

  const renderEdges = (): void => {
    const endpoints: Record<string, EdgeEndpoints> = {};
    for (const edge of graph.edges) {
      const fromCard = cards.get(edge.from)?.root;
      const toCard = cards.get(edge.to)?.root;
      if (!fromCard || !toCard) {
        continue;
      }
      const a = cardAnchor(fromCard);
      const b = cardAnchor(toCard);
      endpoints[edge.id] = { from: a.out, to: b.in };
    }
    const sim = graph.simulation ?? DEFAULT_SIMULATION;
    edgeLayer.setSelected(selectedEdgeId);
    edgeLayer.sync(graph.edges, endpoints, sim.running, sim.speed);
  };

  const remountCards = (): void => {
    for (const card of cards.values()) {
      card.destroy();
    }
    cards.clear();
    for (const node of graph.nodes) {
      addCard(node);
    }
    renderEdges();
    applyPressures();
  };

  const addCard = (node: ComponentNode): void => {
    const card = createNodeCard(node, {
      onSelect: (id) => {
        selectedNodeId = id;
        selectedEdgeId = null;
        intentPopover.close();
        for (const [cid, c] of cards) {
          c.setSelected(cid === id);
        }
        const n = graph.nodes.find((x) => x.id === id);
        if (n) {
          popover.open(n, card.root.getBoundingClientRect());
        }
        renderEdges();
        publishInteraction();
      },
      onReplicasChange: (id, replicas) => {
        updateNode(id, (n) => ({ ...n, replicas }));
      },
      onDragStart: (id, ev) => {
        dragNodeId = id;
        const n = graph.nodes.find((x) => x.id === id);
        if (!n) {
          return;
        }
        const rect = root.getBoundingClientRect();
        const worldX = (ev.clientX - rect.left - panX) / scale;
        const worldY = (ev.clientY - rect.top - panY) / scale;
        dragOffset = { x: worldX - n.position.x, y: worldY - n.position.y };
        try {
          card.root.setPointerCapture(ev.pointerId);
        } catch {
          // Some test environments lack pointer capture
        }
      },
      onOutHandleDown: (id, ev) => {
        ev.stopPropagation();
        setLinking(id);
        linkGesture = {
          pointerId: ev.pointerId,
          x: ev.clientX,
          y: ev.clientY,
          moved: false,
        };
      },
      onDelete: (id) => {
        graph = {
          ...graph,
          nodes: graph.nodes.filter((n) => n.id !== id),
          edges: graph.edges.filter((e) => e.from !== id && e.to !== id),
        };
        cards.get(id)?.destroy();
        cards.delete(id);
        if (selectedNodeId === id) {
          selectedNodeId = null;
          popover.close();
        }
        if (linkingFrom === id) {
          setLinking(null);
        }
        persist();
      },
    });
    world.append(card.root);
    cards.set(node.id, card);
  };

  const canConnect = (from: string, to: string): boolean => {
    if (from === to) {
      return false;
    }
    return !graph.edges.some((e) => e.from === from && e.to === to);
  };

  const onPointerMove = (ev: PointerEvent): void => {
    if (linkGesture && ev.pointerId === linkGesture.pointerId) {
      const dx = ev.clientX - linkGesture.x;
      const dy = ev.clientY - linkGesture.y;
      if (dx * dx + dy * dy > 100) {
        linkGesture.moved = true;
      }
    }
    if (dragNodeId) {
      const rect = root.getBoundingClientRect();
      const worldX = (ev.clientX - rect.left - panX) / scale - dragOffset.x;
      const worldY = (ev.clientY - rect.top - panY) / scale - dragOffset.y;
      updateNode(dragNodeId, (n) => ({
        ...n,
        position: { x: worldX, y: worldY },
      }));
      return;
    }
    if (panning) {
      panX = panStart.panX + (ev.clientX - panStart.x);
      panY = panStart.panY + (ev.clientY - panStart.y);
      applyTransform();
    }
  };

  const tryCompleteLink = (clientX: number, clientY: number): boolean => {
    if (!linkingFrom) {
      return false;
    }
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const targetNode = el?.closest('.sdq-node') as HTMLElement | null;
    const toId = targetNode?.dataset.nodeId;
    if (toId && canConnect(linkingFrom, toId)) {
      const toNode = graph.nodes.find((n) => n.id === toId);
      const edge: ConnectionEdge = {
        id: nextId('edge'),
        from: linkingFrom,
        to: toId,
        direction: 'forward',
        label: toNode ? defaultLabelForDestination(toNode.type) : 'REQ',
      };
      graph = { ...graph, edges: [...graph.edges, edge] };
      persist();
      setLinking(null);
      return true;
    }
    return false;
  };

  const onPointerUp = (ev: PointerEvent): void => {
    if (linkingFrom && linkGesture && ev.pointerId === linkGesture.pointerId) {
      if (linkGesture.moved) {
        tryCompleteLink(ev.clientX, ev.clientY);
        if (linkingFrom) {
          setLinking(null);
        }
      } else {
        // Tap on out-handle: keep armed for a second tap on the target node.
        linkGesture = null;
      }
      dragNodeId = null;
      panning = false;
      return;
    }

    if (linkingFrom) {
      if (!tryCompleteLink(ev.clientX, ev.clientY)) {
        setLinking(null);
      }
    }
    dragNodeId = null;
    panning = false;
  };

  const onPaletteDrop = (ev: Event): void => {
    const detail = (ev as CustomEvent<PaletteDropDetail>).detail;
    if (!detail) {
      return;
    }
    const rect = root.getBoundingClientRect();
    let x = (detail.clientX - rect.left - panX) / scale - 70;
    let y = (detail.clientY - rect.top - panY) / scale - 30;
    if (detail.source === 'tap') {
      const stagger = graph.nodes.length * 28;
      x += (stagger % 160) - 40;
      y += Math.floor(stagger / 5) % 120;
    }
    const node = buildNewNode(detail.type, { x, y }, nextId('node'));
    graph = { ...graph, nodes: [...graph.nodes, node] };
    addCard(node);
    persist();
  };

  root.addEventListener('pointerdown', (ev) => {
    if ((ev.target as HTMLElement).closest('.sdq-node') || (ev.target as HTMLElement).closest('.sdq-blueprint-zoom')) {
      return;
    }
    if ((ev.target as HTMLElement).closest('[data-edge-id]')) {
      return;
    }
    if (ev.button === 0 || ev.button === 1 || ev.pointerType === 'touch') {
      ev.preventDefault();
      panning = true;
      panStart = { x: ev.clientX, y: ev.clientY, panX, panY };
      popover.close();
      intentPopover.close();
      selectedNodeId = null;
      selectedEdgeId = null;
      if (linkingFrom) {
        setLinking(null);
      }
      for (const c of cards.values()) {
        c.setSelected(false);
      }
      renderEdges();
      publishInteraction();
    }
  });

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  root.addEventListener(PALETTE_DROP_EVENT, onPaletteDrop as EventListener);

  const onKeyDown = (ev: KeyboardEvent): void => {
    if (ev.key === 'Escape') {
      intentPopover.close();
      popover.close();
      setLinking(null);
      selectedEdgeId = null;
      selectedNodeId = null;
      for (const c of cards.values()) {
        c.setSelected(false);
      }
      renderEdges();
      publishInteraction();
      return;
    }
    if ((ev.key === 'Delete' || ev.key === 'Backspace') && (selectedNodeId || selectedEdgeId)) {
      const target = ev.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
      if (selectedEdgeId) {
        const removedId = selectedEdgeId;
        graph = {
          ...graph,
          edges: graph.edges.filter((e) => e.id !== removedId),
        };
        selectedEdgeId = null;
        intentPopover.close();
        persist();
        return;
      }
      if (selectedNodeId) {
        graph = {
          ...graph,
          nodes: graph.nodes.filter((n) => n.id !== selectedNodeId),
          edges: graph.edges.filter((e) => e.from !== selectedNodeId && e.to !== selectedNodeId),
        };
        cards.get(selectedNodeId)?.destroy();
        cards.delete(selectedNodeId);
        selectedNodeId = null;
        popover.close();
        persist();
      }
    }
  };

  document.addEventListener('keydown', onKeyDown);

  persist();

  return {
    root,
    getGraph: () => graph,
    setGraph(next) {
      graph = normalizeGraph(next);
      remountCards();
      persist();
    },
    updateSimulation(partial) {
      graph = {
        ...graph,
        simulation: {
          ...(graph.simulation ?? DEFAULT_SIMULATION),
          ...partial,
        },
      };
      persist();
    },
    destroy() {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('keydown', onKeyDown);
      root.removeEventListener(PALETTE_DROP_EVENT, onPaletteDrop as EventListener);
      popover.destroy();
      intentPopover.destroy();
      edgeLayer.destroy();
      for (const card of cards.values()) {
        card.destroy();
      }
      zoomBar.remove();
      linkHint.remove();
      world.remove();
    },
  };
}

interface GameStateWithPressure {
  pressures?: Record<string, PressureLevel> | null;
  latencyMs?: Record<string, number> | null;
  pressureReasons?: Record<string, string> | null;
  hotReadPath?: boolean;
}

/** Programmatic helpers for tests */
export function placeComponentForTest(
  canvas: BlueprintCanvas,
  type: ComponentType,
  position: { x: number; y: number },
): string {
  const node = buildNewNode(type, position, nextId('node'));
  const graph = canvas.getGraph();
  canvas.setGraph({ ...graph, nodes: [...graph.nodes, node] });
  return node.id;
}

export function connectForTest(
  canvas: BlueprintCanvas,
  from: string,
  to: string,
  label?: string,
): void {
  const graph = canvas.getGraph();
  const toNode = graph.nodes.find((n) => n.id === to);
  const resolved =
    label ?? (toNode ? defaultLabelForDestination(toNode.type) : 'REQ');
  canvas.setGraph({
    ...graph,
    edges: [
      ...graph.edges,
      { id: nextId('edge'), from, to, direction: 'forward', label: resolved },
    ],
  });
}

export function setReplicasForTest(canvas: BlueprintCanvas, id: string, replicas: number): void {
  const graph = canvas.getGraph();
  canvas.setGraph({
    ...graph,
    nodes: graph.nodes.map((n) => (n.id === id ? { ...n, replicas } : n)),
  });
}

export function setNodeConfigForTest(
  canvas: BlueprintCanvas,
  id: string,
  config: ComponentConfig,
  notes?: string,
): void {
  const graph = canvas.getGraph();
  canvas.setGraph({
    ...graph,
    nodes: graph.nodes.map((n) =>
      n.id === id
        ? { ...n, config, ...(notes !== undefined ? { implementationNotes: notes } : {}) }
        : n,
    ),
  });
}
