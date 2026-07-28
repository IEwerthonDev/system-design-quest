import {
  assessConnectionPair,
  DEFAULT_SIMULATION,
  evaluateSimulation,
  normalizeGraph,
  type ArchitectureGraph,
  type ComponentConfig,
  type ComponentNode,
  type ComponentType,
  type ConnectionEdge,
  type ConnectionPairStatus,
  type PressureLevel,
  type SimulationSettings,
} from '@sdq/shared';
import { createGraphHistory } from '../canvas/history';
import { t } from '../i18n/t';
import { PALETTE_DROP_EVENT, type PaletteDropDetail } from '../ui/palette';
import { isCoarsePointer, PHONE_MAX_WIDTH } from '../ui/responsive';
import { getGameState } from '../test-hook';
import { getSession, setGraph as setSessionGraph } from '../session/session-store';
import { buildNewNode, createNodeCard, type NodeCardHandle } from './node-card';
import { mountConfigPopover } from './config-popover';
import { mountConnectionIntentPopover } from './connection-intent-popover';
import {
  clearDbIntentRole,
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
  undo(): boolean;
  redo(): boolean;
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
    .sdq-blueprint-history {
      position: fixed;
      left: 236px;
      bottom: 92px;
      z-index: 20;
      display: none;
      flex-direction: column;
      gap: 6px;
    }
    .sdq-blueprint-history--visible {
      display: flex;
    }
    .sdq-blueprint-history button {
      min-width: 44px;
      min-height: 44px;
      padding: 8px 12px;
      border-radius: var(--sdq-radius-sm);
      border: 1px solid var(--sdq-border-strong);
      background: var(--sdq-bg-elevated);
      color: var(--sdq-text);
      cursor: pointer;
      font: 600 13px var(--sdq-font);
      touch-action: manipulation;
    }
    .sdq-blueprint-history button:disabled {
      opacity: 0.45;
      cursor: default;
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
    onDelete: (edgeId) => {
      clearDbIntentRole(edgeId);
      graph = {
        ...graph,
        edges: graph.edges.filter((e) => e.id !== edgeId),
      };
      if (selectedEdgeId === edgeId) {
        selectedEdgeId = null;
      }
      intentPopover.close();
      persist({ recordHistory: true });
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
    const fromCard = cards.get(edge?.from ?? '')?.root;
    const toCard = cards.get(edge?.to ?? '')?.root;
    let anchor: { x: number; y: number } | undefined;
    if (fromCard && toCard) {
      const a = fromCard.getBoundingClientRect();
      const b = toCard.getBoundingClientRect();
      anchor = {
        x: (a.right + b.left) / 2,
        y: (a.top + a.bottom + b.top + b.bottom) / 4,
      };
    }
    intentPopover.open(edgeId, edge?.label, anchor);
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
    persist({ recordHistory: true });
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
      edgeLayer.setPreview(null);
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

  const history = createGraphHistory();
  let wasDragging = false;
  let syncHistoryButtons = (): void => undefined;

  const persist = (options: { recordHistory?: boolean } = {}): void => {
    graph = normalizeGraph(graph);
    if (options.recordHistory) {
      history.push(graph);
    }
    if (getSession()) {
      setSessionGraph(graph);
    }
    const state = getGameState();
    state.graph = graph;
    publishInteraction();
    renderEdges();
    applyPressures();
    syncHistoryButtons();
  };

  const updateNode = (
    id: string,
    fn: (n: ComponentNode) => ComponentNode,
    options: { recordHistory?: boolean } = {},
  ): void => {
    graph = {
      ...graph,
      nodes: graph.nodes.map((n) => (n.id === id ? fn(n) : n)),
    };
    const node = graph.nodes.find((n) => n.id === id);
    const card = cards.get(id);
    if (node && card) {
      card.sync(node);
    }
    persist({ recordHistory: options.recordHistory ?? true });
  };

  const applyHistorySnapshot = (next: ArchitectureGraph): void => {
    graph = normalizeGraph(next);
    remountCards();
    persist({ recordHistory: false });
  };

  const performUndo = (): boolean => {
    const prev = history.undo();
    if (!prev) {
      return false;
    }
    applyHistorySnapshot(prev);
    return true;
  };

  const performRedo = (): boolean => {
    const next = history.redo();
    if (!next) {
      return false;
    }
    applyHistorySnapshot(next);
    return true;
  };

  const historyBar = document.createElement('div');
  historyBar.className = 'sdq-blueprint-history';
  historyBar.setAttribute('data-testid', 'canvas-history');
  const undoBtn = document.createElement('button');
  undoBtn.type = 'button';
  undoBtn.setAttribute('data-testid', 'canvas-undo');
  undoBtn.textContent = t('undo.label');
  const redoBtn = document.createElement('button');
  redoBtn.type = 'button';
  redoBtn.setAttribute('data-testid', 'canvas-redo');
  redoBtn.textContent = t('redo.label');
  historyBar.append(undoBtn, redoBtn);
  root.append(historyBar);

  const showHistoryChrome = (): boolean =>
    isCoarsePointer() ||
    (typeof window !== 'undefined' && window.innerWidth <= PHONE_MAX_WIDTH);

  syncHistoryButtons = (): void => {
    const visible = showHistoryChrome();
    historyBar.classList.toggle('sdq-blueprint-history--visible', visible);
    undoBtn.disabled = !history.canUndo();
    redoBtn.disabled = !history.canRedo();
  };

  undoBtn.addEventListener('click', () => {
    performUndo();
  });
  redoBtn.addEventListener('click', () => {
    performRedo();
  });

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
    const pairStatus: Record<string, ConnectionPairStatus> = {};
    const byId = new Map(graph.nodes.map((n) => [n.id, n]));
    for (const edge of graph.edges) {
      const fromCard = cards.get(edge.from)?.root;
      const toCard = cards.get(edge.to)?.root;
      if (!fromCard || !toCard) {
        continue;
      }
      const a = cardAnchor(fromCard);
      const b = cardAnchor(toCard);
      endpoints[edge.id] = { from: a.out, to: b.in };
      const fromNode = byId.get(edge.from);
      const toNode = byId.get(edge.to);
      if (fromNode && toNode) {
        pairStatus[edge.id] = assessConnectionPair(fromNode.type, toNode.type).status;
      }
    }
    const sim = graph.simulation ?? DEFAULT_SIMULATION;
    edgeLayer.setSelected(selectedEdgeId);
    edgeLayer.sync(graph.edges, endpoints, sim.running, sim.speed, pairStatus);
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

  const openNodeDetails = (id: string): void => {
    selectedNodeId = id;
    selectedEdgeId = null;
    intentPopover.close();
    for (const [cid, c] of cards) {
      c.setSelected(cid === id);
    }
    const n = graph.nodes.find((x) => x.id === id);
    const card = cards.get(id);
    if (n && card) {
      popover.open(n, card.root.getBoundingClientRect());
    }
    renderEdges();
    publishInteraction();
  };

  const addCard = (node: ComponentNode): void => {
    const card = createNodeCard(node, {
      onSelect: (id) => {
        if (linkingFrom && linkingFrom !== id) {
          completeLinkTo(id);
          return;
        }
        selectedNodeId = id;
        selectedEdgeId = null;
        intentPopover.close();
        popover.close();
        for (const [cid, c] of cards) {
          c.setSelected(cid === id);
        }
        renderEdges();
        publishInteraction();
      },
      onOpenDetails: (id) => {
        openNodeDetails(id);
      },
      onReplicasChange: (id, replicas) => {
        updateNode(id, (n) => ({ ...n, replicas }));
      },
      onDragStart: (id, ev) => {
        if (linkingFrom) {
          return;
        }
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
        updateLinkPreview(ev.clientX, ev.clientY);
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
        persist({ recordHistory: true });
      },
    });
    world.append(card.root);
    cards.set(node.id, card);
  };

  const canConnect = (from: string, to: string): boolean => {
    if (from === to) {
      return false;
    }
    if (graph.edges.some((e) => e.from === from && e.to === to)) {
      return false;
    }
    const fromNode = graph.nodes.find((n) => n.id === from);
    const toNode = graph.nodes.find((n) => n.id === to);
    if (!fromNode || !toNode) {
      return false;
    }
    return assessConnectionPair(fromNode.type, toNode.type).status !== 'invalid';
  };

  const clientToWorld = (clientX: number, clientY: number): { x: number; y: number } => {
    const rect = root.getBoundingClientRect();
    return {
      x: (clientX - rect.left - panX) / scale,
      y: (clientY - rect.top - panY) / scale,
    };
  };

  const updateLinkPreview = (clientX: number, clientY: number): void => {
    if (!linkingFrom) {
      edgeLayer.setPreview(null);
      return;
    }
    const fromCard = cards.get(linkingFrom)?.root;
    if (!fromCard) {
      edgeLayer.setPreview(null);
      return;
    }
    const from = cardAnchor(fromCard).out;
    const el =
      typeof document.elementFromPoint === 'function'
        ? (document.elementFromPoint(clientX, clientY) as HTMLElement | null)
        : null;
    const targetNode = el?.closest('.sdq-node') as HTMLElement | null;
    const toId = targetNode?.dataset.nodeId;
    if (toId && toId !== linkingFrom) {
      const toCard = cards.get(toId)?.root;
      const fromNode = graph.nodes.find((n) => n.id === linkingFrom);
      const toNode = graph.nodes.find((n) => n.id === toId);
      if (toCard && fromNode && toNode) {
        let status = assessConnectionPair(fromNode.type, toNode.type).status;
        if (graph.edges.some((e) => e.from === linkingFrom && e.to === toId)) {
          status = 'invalid';
        }
        edgeLayer.setPreview(from, cardAnchor(toCard).in, status);
        return;
      }
    }
    edgeLayer.setPreview(from, clientToWorld(clientX, clientY), 'ok');
  };

  const completeLinkTo = (toId: string): boolean => {
    if (!linkingFrom || !canConnect(linkingFrom, toId)) {
      return false;
    }
    const toNode = graph.nodes.find((n) => n.id === toId);
    const edge: ConnectionEdge = {
      id: nextId('edge'),
      from: linkingFrom,
      to: toId,
      direction: 'forward',
      label: toNode ? defaultLabelForDestination(toNode.type) : 'REQ',
    };
    graph = { ...graph, edges: [...graph.edges, edge] };
    persist({ recordHistory: true });
    setLinking(null);
    return true;
  };

  const onPointerMove = (ev: PointerEvent): void => {
    if (linkGesture && ev.pointerId === linkGesture.pointerId) {
      const dx = ev.clientX - linkGesture.x;
      const dy = ev.clientY - linkGesture.y;
      if (dx * dx + dy * dy > 100) {
        linkGesture.moved = true;
      }
    }
    if (linkingFrom) {
      updateLinkPreview(ev.clientX, ev.clientY);
    }
    if (dragNodeId) {
      wasDragging = true;
      const rect = root.getBoundingClientRect();
      const worldX = (ev.clientX - rect.left - panX) / scale - dragOffset.x;
      const worldY = (ev.clientY - rect.top - panY) / scale - dragOffset.y;
      updateNode(
        dragNodeId,
        (n) => ({
          ...n,
          position: { x: worldX, y: worldY },
        }),
        { recordHistory: false },
      );
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
    const el =
      typeof document.elementFromPoint === 'function'
        ? (document.elementFromPoint(clientX, clientY) as HTMLElement | null)
        : null;
    const targetNode = el?.closest('.sdq-node') as HTMLElement | null;
    const toId = targetNode?.dataset.nodeId;
    if (toId) {
      return completeLinkTo(toId);
    }
    return false;
  };

  const onPointerUp = (ev: PointerEvent): void => {
    if (linkingFrom && linkGesture && ev.pointerId === linkGesture.pointerId) {
      if (linkGesture.moved) {
        tryCompleteLink(ev.clientX, ev.clientY);
        // Keep linking armed on failed drop so the player can retry or Esc.
        linkGesture = null;
        if (linkingFrom) {
          updateLinkPreview(ev.clientX, ev.clientY);
        }
      } else {
        // Tap on out-handle: keep armed for a second tap on the target node.
        linkGesture = null;
        updateLinkPreview(ev.clientX, ev.clientY);
      }
      if (wasDragging) {
        history.push(graph);
        syncHistoryButtons();
        wasDragging = false;
      }
      dragNodeId = null;
      panning = false;
      return;
    }

    if (linkingFrom) {
      // Second-tap completion is handled in onSelect via completeLinkTo.
      tryCompleteLink(ev.clientX, ev.clientY);
    }
    if (wasDragging) {
      history.push(graph);
      syncHistoryButtons();
      wasDragging = false;
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
    persist({ recordHistory: true });
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
      // Do not clear linking on background pan — Esc cancels (mobile miss-tap safe).
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
    const target = ev.target as HTMLElement;
    const typing =
      target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    if (!typing && (ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z' && !ev.shiftKey) {
      ev.preventDefault();
      performUndo();
      return;
    }
    if (
      !typing &&
      (ev.ctrlKey || ev.metaKey) &&
      (ev.key.toLowerCase() === 'y' || (ev.key.toLowerCase() === 'z' && ev.shiftKey))
    ) {
      ev.preventDefault();
      performRedo();
      return;
    }

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
      if (typing) {
        return;
      }
      if (selectedEdgeId) {
        const removedId = selectedEdgeId;
        clearDbIntentRole(removedId);
        graph = {
          ...graph,
          edges: graph.edges.filter((e) => e.id !== removedId),
        };
        selectedEdgeId = null;
        intentPopover.close();
        persist({ recordHistory: true });
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
        persist({ recordHistory: true });
      }
    }
  };

  document.addEventListener('keydown', onKeyDown);

  persist();
  history.push(graph);
  syncHistoryButtons();

  return {
    root,
    getGraph: () => graph,
    setGraph(next) {
      graph = normalizeGraph(next);
      remountCards();
      persist({ recordHistory: true });
    },
    updateSimulation(partial) {
      graph = {
        ...graph,
        simulation: {
          ...(graph.simulation ?? DEFAULT_SIMULATION),
          ...partial,
        },
      };
      persist({ recordHistory: true });
    },
    undo: () => performUndo(),
    redo: () => performRedo(),
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
      historyBar.remove();
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
