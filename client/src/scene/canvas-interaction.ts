import * as THREE from 'three';
import type { ArchitectureGraph } from '@sdq/shared';
import type { ComponentManager } from './component-manager';
import { pointerToNdc, raycastToXZPlane } from './component-manager';
import type { EdgeManager } from './edge-manager';
import { createFlowEdge, type FlowEdgeObject } from './edges/flow-edge';
import type { LinkPreview } from './edges/link-preview';
import { serializeGraph } from './graph-serializer';
import type { ComponentHandles, HandlePick } from './handles/component-handles';
import { getInstancePosition } from './component-instance';
import {
  clampNote,
  type PropertiesPanel,
  type PropertiesPanelState,
} from '../ui/properties-panel';

export type CanvasInteractionMode =
  | 'idle'
  | 'hover'
  | 'linking'
  | 'edgeSelected'
  | 'reconnecting';

export interface CanvasInteractionState {
  mode: CanvasInteractionMode;
  hoverComponentId: string | null;
  linkingFromId: string | null;
  selectedEdgeId: string | null;
  previewActive: boolean;
  reconnectEnd: 'from' | 'to' | null;
  invalidTarget: boolean;
}

export interface CanvasInteractionControls {
  enabled: boolean;
}

export interface CreateCanvasInteractionOptions {
  scene: THREE.Scene;
  camera: THREE.Camera;
  canvas: HTMLCanvasElement;
  controls: CanvasInteractionControls;
  componentManager: ComponentManager;
  edgeManager: EdgeManager;
  handles: ComponentHandles;
  linkPreview: LinkPreview;
  propertiesPanel: PropertiesPanel;
  raycaster?: THREE.Raycaster;
  persistGraph?: (graph: ArchitectureGraph) => void;
}

export interface CanvasInteraction {
  getInteractionState(): CanvasInteractionState;
  getComponentManager(): ComponentManager;
  getEdgeManager(): EdgeManager;
  getFlowEdges(): ReadonlyMap<string, FlowEdgeObject>;
  selectEdge(edgeId: string | null): void;
  deleteEdge(edgeId: string): boolean;
  invertEdge(edgeId: string): boolean;
  deleteSelected(): boolean;
  syncStoreFromScene(): void;
  loadGraph(graph: ArchitectureGraph): void;
  update(dt: number): void;
  dispose(): void;
}

const DRAG_THRESHOLD_PX = 4;

type PointerPhase = 'none' | 'body' | 'linking';

export function createCanvasInteraction(
  options: CreateCanvasInteractionOptions,
): CanvasInteraction {
  const {
    scene,
    camera,
    canvas,
    controls,
    componentManager,
    edgeManager,
    handles,
    linkPreview,
    propertiesPanel,
    persistGraph,
  } = options;
  const raycaster = options.raycaster ?? new THREE.Raycaster();

  let mode: CanvasInteractionMode = 'idle';
  let hoverComponentId: string | null = null;
  let linkingFromId: string | null = null;
  let selectedComponentId: string | null = null;
  let selectedEdgeId: string | null = null;
  let invalidTarget = false;
  let highlightTargetId: string | null = null;
  let highlightHandleId: string | null = null;
  let reconnectEnd: 'from' | 'to' | null = null;

  let pointerPhase: PointerPhase = 'none';
  let pressX = 0;
  let pressY = 0;
  let didDrag = false;
  let pressComponentId: string | null = null;

  const flowEdges = new Map<string, FlowEdgeObject>();
  let controlsBeforeGesture = true;

  const getRect = (): DOMRect => canvas.getBoundingClientRect();

  const getState = (): CanvasInteractionState => ({
    mode,
    hoverComponentId,
    linkingFromId,
    selectedEdgeId,
    previewActive: linkPreview.isActive,
    reconnectEnd,
    invalidTarget,
  });

  const syncStoreFromScene = (): void => {
    const graph = serializeGraph(componentManager, edgeManager);
    persistGraph?.(graph);
  };

  const syncComponentPanel = (): void => {
    if (selectedEdgeId) {
      const edge = edgeManager.getEdge(selectedEdgeId);
      if (!edge) {
        selectedEdgeId = null;
      } else {
        propertiesPanel.sync({
          mode: 'edge',
          visible: true,
          componentId: null,
          label: '',
          note: '',
          edgeId: edge.id,
          edgeDirection: edge.direction === 'bidirectional' ? 'bidirectional' : 'forward',
        });
        return;
      }
    }
    if (!selectedComponentId) {
      propertiesPanel.sync({
        mode: 'hidden',
        visible: false,
        componentId: null,
        label: '',
        note: '',
      });
      return;
    }
    const instance = componentManager.getInstance(selectedComponentId);
    if (!instance) {
      selectedComponentId = null;
      propertiesPanel.sync({
        mode: 'hidden',
        visible: false,
        componentId: null,
        label: '',
        note: '',
      });
      return;
    }
    propertiesPanel.sync({
      mode: 'component',
      visible: true,
      componentId: instance.id,
      label: instance.label,
      note: instance.note ?? '',
    } satisfies PropertiesPanelState);
  };

  const clearHoverHandles = (): void => {
    if (hoverComponentId) {
      handles.setHandlesVisible(hoverComponentId, false);
    }
    hoverComponentId = null;
  };

  const setHover = (componentId: string | null): void => {
    if (hoverComponentId === componentId) {
      if (componentId && mode === 'idle') {
        mode = 'hover';
      }
      return;
    }
    if (hoverComponentId) {
      handles.setHandlesVisible(hoverComponentId, false);
    }
    hoverComponentId = componentId;
    if (hoverComponentId) {
      handles.setHandlesVisible(hoverComponentId, true);
      if (mode === 'idle') {
        mode = 'hover';
      }
    } else if (mode === 'hover') {
      mode = 'idle';
    }
  };

  const clearHighlight = (): void => {
    if (highlightTargetId) {
      componentManager.setSelected(highlightTargetId, false);
      highlightTargetId = null;
    }
    if (highlightHandleId) {
      const pos = handles.getHandleWorldPosition(highlightHandleId, 'in');
      void pos;
      const instance = componentManager.getInstance(highlightHandleId);
      if (instance) {
        for (const child of instance.group.children) {
          if (
            child instanceof THREE.Mesh &&
            child.userData.isHandle &&
            child.userData.handleKind === 'in'
          ) {
            child.scale.setScalar(1);
          }
        }
      }
      highlightHandleId = null;
    }
  };

  const setHighlight = (componentId: string | null): void => {
    if (highlightTargetId === componentId) {
      return;
    }
    clearHighlight();
    if (componentId) {
      componentManager.setSelected(componentId, true);
      highlightTargetId = componentId;
      highlightHandleId = componentId;
      const instance = componentManager.getInstance(componentId);
      if (instance) {
        for (const child of instance.group.children) {
          if (
            child instanceof THREE.Mesh &&
            child.userData.isHandle &&
            child.userData.handleKind === 'in'
          ) {
            child.scale.setScalar(1.45);
          }
        }
      }
    }
  };

  const nodeWorldPos = (componentId: string): THREE.Vector3 | null => {
    const instance = componentManager.getInstance(componentId);
    if (!instance) {
      return null;
    }
    const pos = getInstancePosition(instance);
    return new THREE.Vector3(pos.x, pos.y, pos.z);
  };

  const syncFlowEdgeGeometry = (edgeId: string): void => {
    const edge = edgeManager.getEdge(edgeId);
    const visual = flowEdges.get(edgeId);
    if (!edge || !visual) {
      return;
    }
    const fromPos = nodeWorldPos(edge.from);
    const toPos = nodeWorldPos(edge.to);
    if (!fromPos || !toPos) {
      return;
    }
    visual.rebuildGeometry(fromPos, toPos);
    visual.setDirection(edge.direction);
  };

  const addFlowEdgeVisual = (edgeId: string): void => {
    const edge = edgeManager.getEdge(edgeId);
    if (!edge || flowEdges.has(edgeId)) {
      return;
    }
    const fromPos = nodeWorldPos(edge.from);
    const toPos = nodeWorldPos(edge.to);
    if (!fromPos || !toPos) {
      return;
    }
    const visual = createFlowEdge(fromPos, toPos, edge.direction);
    visual.mesh.userData.isFlowEdge = true;
    visual.mesh.userData.edgeId = edgeId;
    scene.add(visual.mesh);
    flowEdges.set(edgeId, visual);
  };

  const removeFlowEdgeVisual = (edgeId: string): void => {
    const visual = flowEdges.get(edgeId);
    if (!visual) {
      return;
    }
    scene.remove(visual.mesh);
    visual.dispose();
    flowEdges.delete(edgeId);
  };

  const rebuildAllFlowEdges = (): void => {
    for (const id of [...flowEdges.keys()]) {
      removeFlowEdgeVisual(id);
    }
    for (const edge of edgeManager.getEdges()) {
      addFlowEdgeVisual(edge.id);
    }
  };

  const pickHandle = (): HandlePick | null => handles.pickHandle(raycaster);

  const pickComponentBody = (): string | null => {
    const meshes = componentManager.getAllInstances().map((instance) => instance.mesh);
    if (meshes.length === 0) {
      return null;
    }
    const hits = raycaster.intersectObjects(meshes, false);
    const hit = hits[0]?.object;
    if (!hit?.userData?.componentId) {
      return null;
    }
    return String(hit.userData.componentId);
  };

  const pickEdge = (): string | null => {
    const meshes = [...flowEdges.values()].map((edge) => edge.mesh);
    if (meshes.length === 0) {
      return null;
    }
    const hits = raycaster.intersectObjects(meshes, false);
    const hit = hits[0]?.object;
    if (!hit?.userData?.isFlowEdge || !hit.userData.edgeId) {
      return null;
    }
    return String(hit.userData.edgeId);
  };

  const resolveLinkTarget = (): { componentId: string; valid: boolean } | null => {
    const handle = pickHandle();
    if (handle) {
      if (handle.kind === 'in' || handle.kind === 'out') {
        const valid =
          !!linkingFromId && edgeManager.canConnect(linkingFromId, handle.componentId);
        return { componentId: handle.componentId, valid };
      }
    }
    const bodyId = pickComponentBody();
    if (bodyId) {
      const valid = !!linkingFromId && edgeManager.canConnect(linkingFromId, bodyId);
      return { componentId: bodyId, valid };
    }
    return null;
  };

  const beginLinking = (fromId: string, pointer: THREE.Vector3): void => {
    clearHoverHandles();
    clearHighlight();
    selectedComponentId = null;
    selectedEdgeId = null;
    syncComponentPanel();

    linkingFromId = fromId;
    mode = 'linking';
    invalidTarget = false;
    controlsBeforeGesture = controls.enabled;
    controls.enabled = false;

    const fromPos =
      handles.getHandleWorldPosition(fromId, 'out') ?? nodeWorldPos(fromId) ?? pointer;
    linkPreview.showPreview(fromPos, pointer);
    linkPreview.setValidTarget(true);
    handles.setForcedVisible(
      componentManager.getAllInstances().map((instance) => instance.id),
    );
  };

  const endLinking = (): void => {
    linkPreview.hidePreview();
    handles.setForcedVisible([]);
    clearHighlight();
    linkingFromId = null;
    invalidTarget = false;
    canvas.style.cursor = '';
    controls.enabled = controlsBeforeGesture;
    mode = hoverComponentId ? 'hover' : 'idle';
  };

  const updateLinkingPointer = (clientX: number, clientY: number): void => {
    const ndc = pointerToNdc(clientX, clientY, getRect());
    raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera);
    const tip =
      raycastToXZPlane(raycaster, camera, ndc) ?? new THREE.Vector3(0, 0, 0);
    tip.y = 0.55;

    const target = resolveLinkTarget();
    if (!target) {
      invalidTarget = false;
      linkPreview.setValidTarget(true);
      canvas.style.cursor = 'crosshair';
      clearHighlight();
      linkPreview.updatePreview(tip);
      return;
    }

    invalidTarget = !target.valid;
    linkPreview.setValidTarget(target.valid);
    canvas.style.cursor = target.valid ? 'pointer' : 'not-allowed';

    if (target.valid) {
      setHighlight(target.componentId);
      const inPos =
        handles.getHandleWorldPosition(target.componentId, 'in') ?? tip;
      linkPreview.updatePreview(inPos);
    } else {
      clearHighlight();
      linkPreview.updatePreview(tip);
    }
  };

  const finishLinking = (clientX: number, clientY: number): void => {
    const ndc = pointerToNdc(clientX, clientY, getRect());
    raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera);
    const target = resolveLinkTarget();
    const fromId = linkingFromId;

    if (fromId && target?.valid) {
      const edge = edgeManager.connect(fromId, target.componentId, 'forward');
      if (edge) {
        addFlowEdgeVisual(edge.id);
        syncStoreFromScene();
      }
    }

    endLinking();
  };

  const selectComponent = (id: string | null): void => {
    if (selectedComponentId) {
      componentManager.setSelected(selectedComponentId, false);
    }
    selectedComponentId = id;
    selectedEdgeId = null;
    if (selectedComponentId) {
      componentManager.setSelected(selectedComponentId, true);
      mode = 'idle';
    } else if (mode === 'edgeSelected') {
      mode = 'idle';
    }
    syncComponentPanel();
  };

  const selectEdge = (edgeId: string | null): void => {
    if (selectedComponentId) {
      componentManager.setSelected(selectedComponentId, false);
      selectedComponentId = null;
    }
    selectedEdgeId = edgeId && edgeManager.getEdge(edgeId) ? edgeId : null;
    mode = selectedEdgeId ? 'edgeSelected' : hoverComponentId ? 'hover' : 'idle';
    syncComponentPanel();
  };

  const deleteEdge = (edgeId: string): boolean => {
    if (!edgeManager.removeEdge(edgeId)) {
      return false;
    }
    removeFlowEdgeVisual(edgeId);
    if (selectedEdgeId === edgeId) {
      selectedEdgeId = null;
      mode = 'idle';
      syncComponentPanel();
    }
    syncStoreFromScene();
    return true;
  };

  const invertEdge = (edgeId: string): boolean => {
    const inverted = edgeManager.invert(edgeId);
    if (!inverted) {
      return false;
    }
    syncFlowEdgeGeometry(edgeId);
    if (selectedEdgeId === edgeId) {
      syncComponentPanel();
    }
    syncStoreFromScene();
    return true;
  };

  const deleteSelectedComponent = (id?: string): boolean => {
    const targetId = id ?? selectedComponentId;
    if (!targetId) {
      return false;
    }
    edgeManager.removeEdgesForNode(targetId);
    for (const edge of [...flowEdges.keys()]) {
      if (!edgeManager.getEdge(edge)) {
        removeFlowEdgeVisual(edge);
      }
    }
    handles.detach(targetId);
    const removed = componentManager.removeComponent(targetId);
    if (!removed) {
      return false;
    }
    if (selectedComponentId === targetId) {
      selectedComponentId = null;
      syncComponentPanel();
    }
    if (hoverComponentId === targetId) {
      hoverComponentId = null;
    }
    syncStoreFromScene();
    return true;
  };

  const deleteSelected = (): boolean => {
    if (selectedEdgeId) {
      return deleteEdge(selectedEdgeId);
    }
    return deleteSelectedComponent();
  };

  const prepareRaycaster = (clientX: number, clientY: number): void => {
    const ndc = pointerToNdc(clientX, clientY, getRect());
    raycaster.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera);
  };

  const onPointerDown = (event: PointerEvent): void => {
    pressX = event.clientX;
    pressY = event.clientY;
    didDrag = false;
    pressComponentId = null;
    pointerPhase = 'none';

    prepareRaycaster(event.clientX, event.clientY);
    const handle = pickHandle();

    if (handle?.kind === 'out') {
      const planeHit =
        raycastToXZPlane(
          raycaster,
          camera,
          pointerToNdc(event.clientX, event.clientY, getRect()),
        ) ?? new THREE.Vector3(0, 0, 0);
      planeHit.y = 0.55;
      beginLinking(handle.componentId, planeHit);
      pointerPhase = 'linking';
      canvas.setPointerCapture(event.pointerId);
      return;
    }

    const edgeId = pickEdge();
    if (edgeId) {
      selectEdge(edgeId);
      return;
    }

    const bodyId = pickComponentBody();
    if (bodyId) {
      pressComponentId = bodyId;
      pointerPhase = 'body';
      componentManager.handlePointerDown(event);
      return;
    }

    selectComponent(null);
    selectEdge(null);
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (pointerPhase === 'linking' || mode === 'linking') {
      updateLinkingPointer(event.clientX, event.clientY);
      return;
    }

    if (pointerPhase === 'body') {
      if (!didDrag) {
        const dx = event.clientX - pressX;
        const dy = event.clientY - pressY;
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
          didDrag = true;
        }
      }
      componentManager.handlePointerMove(event);
      return;
    }

    prepareRaycaster(event.clientX, event.clientY);
    const handle = pickHandle();
    if (handle) {
      setHover(handle.componentId);
      return;
    }
    setHover(pickComponentBody());
  };

  const onPointerUp = (event: PointerEvent): void => {
    if (pointerPhase === 'linking' || mode === 'linking') {
      finishLinking(event.clientX, event.clientY);
      pointerPhase = 'none';
      return;
    }

    if (pointerPhase === 'body') {
      if (pressComponentId && !didDrag) {
        selectComponent(pressComponentId);
      }
      componentManager.handlePointerUp();
      syncStoreFromScene();
      pointerPhase = 'none';
      pressComponentId = null;
      didDrag = false;
      return;
    }

    pointerPhase = 'none';
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Delete' && event.key !== 'Backspace') {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable)
    ) {
      return;
    }
    if (!selectedEdgeId && !selectedComponentId) {
      return;
    }
    event.preventDefault();
    deleteSelected();
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('keydown', onKeyDown);

  // Wire panel label/note/delete for component mode (callbacks already mounted —
  // re-bind via wrapping sync is not available; parent must pass callbacks.
  // Tests that don't edit labels still work. Boot wiring supplies real callbacks.)

  return {
    getInteractionState: getState,
    getComponentManager: () => componentManager,
    getEdgeManager: () => edgeManager,
    getFlowEdges: () => flowEdges,
    selectEdge,
    deleteEdge,
    invertEdge,
    deleteSelected,
    syncStoreFromScene,
    loadGraph(graph) {
      for (const id of [...componentManager.getAllInstances().map((i) => i.id)]) {
        handles.detach(id);
        componentManager.removeComponent(id);
      }
      edgeManager.setEdges([]);
      rebuildAllFlowEdges();

      for (const node of graph.nodes) {
        const instance = componentManager.addComponent(node.type, {
          x: node.position.x,
          y: node.position.y,
          z: node.position.z,
        });
        handles.attach(instance);
        if (node.label) {
          componentManager.setLabel(instance.id, node.label);
        }
        if (node.note) {
          componentManager.setNote(instance.id, clampNote(node.note));
        }
      }
      edgeManager.setEdges(graph.edges.map((edge) => ({ ...edge })));
      rebuildAllFlowEdges();
      syncStoreFromScene();
    },
    update(dt) {
      linkPreview.update(dt);
      for (const edge of flowEdges.values()) {
        edge.update(dt);
      }
      for (const edge of edgeManager.getEdges()) {
        syncFlowEdgeGeometry(edge.id);
      }
    },
    dispose() {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      endLinking();
      clearHoverHandles();
      clearHighlight();
      for (const id of [...flowEdges.keys()]) {
        removeFlowEdgeVisual(id);
      }
      canvas.style.cursor = '';
    },
  };
}
