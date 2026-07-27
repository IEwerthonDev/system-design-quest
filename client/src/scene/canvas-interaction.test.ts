import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import type { ArchitectureGraph } from '@sdq/shared';
import {
  createCanvasInteraction,
  type CanvasInteraction,
} from './canvas-interaction';
import { createComponentManager, resetComponentIdCounter } from './component-manager';
import { createEdgeManager, resetEdgeIdCounter } from './edge-manager';
import { createComponentHandles } from './handles/component-handles';
import { createLinkPreview } from './edges/link-preview';
import { serializeGraph } from './graph-serializer';
import { mountPropertiesPanel } from '../ui/properties-panel';

vi.mock('./edges/flow-edge.frag?raw', () => ({
  default: 'mocked-fragment-shader',
}));

function createPointerEvent(
  type: string,
  init: { clientX?: number; clientY?: number; pointerId?: number },
): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clientX', { value: init.clientX ?? 0 });
  Object.defineProperty(event, 'clientY', { value: init.clientY ?? 0 });
  Object.defineProperty(event, 'pointerId', { value: init.pointerId ?? 1 });
  return event;
}

describe('canvas interaction — link gesture (CGD-01/02)', () => {
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let canvas: HTMLCanvasElement;
  let controls: { enabled: boolean };
  let raycaster: THREE.Raycaster;
  let intersectObjects: ReturnType<typeof vi.fn>;
  let intersectPlane: ReturnType<typeof vi.fn>;
  let componentManager: ReturnType<typeof createComponentManager>;
  let edgeManager: ReturnType<typeof createEdgeManager>;
  let handles: ReturnType<typeof createComponentHandles>;
  let preview: ReturnType<typeof createLinkPreview>;
  let panelHost: HTMLDivElement;
  let interaction: CanvasInteraction;
  let persisted: ArchitectureGraph[];

  beforeEach(() => {
    resetComponentIdCounter();
    resetEdgeIdCounter();
    persisted = [];

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
    camera.position.set(20, 20, 20);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    canvas = document.createElement('canvas');
    Object.defineProperty(canvas, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: 600, configurable: true });
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    canvas.setPointerCapture = vi.fn();
    canvas.releasePointerCapture = vi.fn();
    document.body.append(canvas);

    controls = { enabled: true };

    intersectObjects = vi.fn().mockReturnValue([]);
    intersectPlane = vi.fn((_plane: THREE.Plane, target: THREE.Vector3) => {
      target.set(1, 0, 1);
      return target;
    });
    raycaster = {
      setFromCamera: vi.fn(),
      intersectObjects,
      ray: { intersectPlane },
    } as unknown as THREE.Raycaster;

    componentManager = createComponentManager({
      scene,
      camera,
      canvas,
      controls,
      raycaster,
      attachPointerHandlers: false,
    });
    edgeManager = createEdgeManager({ componentManager });
    handles = createComponentHandles();
    preview = createLinkPreview(scene);
    panelHost = document.createElement('div');
    document.body.append(panelHost);
    const propertiesPanel = mountPropertiesPanel(panelHost, {
      onLabelChange: () => undefined,
      onNoteChange: () => undefined,
      onDelete: () => undefined,
    });

    interaction = createCanvasInteraction({
      scene,
      camera,
      canvas,
      controls,
      raycaster,
      componentManager,
      edgeManager,
      handles,
      linkPreview: preview,
      propertiesPanel,
      persistGraph: (graph) => {
        persisted.push(graph);
      },
    });
  });

  afterEach(() => {
    interaction.dispose();
    componentManager.dispose();
    handles.dispose();
    preview.dispose();
    panelHost.remove();
    canvas.remove();
  });

  function attachBoth() {
    const a = componentManager.addComponent('client_web', { x: 0, y: 0, z: 0 });
    const b = componentManager.addComponent('load_balancer', { x: 3, y: 0, z: 0 });
    handles.attach(a);
    handles.attach(b);
    return { a, b };
  }

  it('shows in/out handles on component hover', () => {
    const { a } = attachBoth();
    const set = handles.attach(a);
    expect(set.in.visible).toBe(false);

    intersectObjects.mockImplementation((targets: THREE.Object3D[]) => {
      if (targets.includes(a.mesh)) {
        return [{ object: a.mesh }];
      }
      return [];
    });

    canvas.dispatchEvent(createPointerEvent('pointermove', { clientX: 100, clientY: 100 }));

    expect(interaction.getInteractionState().mode).toBe('hover');
    expect(interaction.getInteractionState().hoverComponentId).toBe(a.id);
    expect(set.in.visible).toBe(true);
    expect(set.out.visible).toBe(true);
  });

  it('drag from out-handle enters linking and creates A→B on valid drop', () => {
    const { a, b } = attachBoth();
    const aOut = handles.attach(a).out;
    const bIn = handles.attach(b).in;

    intersectObjects.mockImplementation((targets: THREE.Object3D[]) => {
      if (targets.includes(aOut)) {
        return [{ object: aOut }];
      }
      return [];
    });

    canvas.dispatchEvent(
      createPointerEvent('pointerdown', { clientX: 10, clientY: 10, pointerId: 1 }),
    );
    expect(interaction.getInteractionState().mode).toBe('linking');
    expect(interaction.getInteractionState().linkingFromId).toBe(a.id);
    expect(controls.enabled).toBe(false);

    intersectObjects.mockImplementation((targets: THREE.Object3D[]) => {
      if (targets.includes(bIn)) {
        return [{ object: bIn }];
      }
      return [];
    });

    canvas.dispatchEvent(createPointerEvent('pointermove', { clientX: 200, clientY: 200 }));
    window.dispatchEvent(createPointerEvent('pointerup', { pointerId: 1 }));

    const edges = edgeManager.getEdges();
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ from: a.id, to: b.id, direction: 'forward' });
    expect(persisted.at(-1)?.edges).toEqual(edges);
    expect(serializeGraph(componentManager, edgeManager).edges).toEqual(edges);
    expect(interaction.getInteractionState().mode).toBe('idle');
    expect(controls.enabled).toBe(true);
  });

  it('drop on destination body (not only in-handle) creates edge', () => {
    const { a, b } = attachBoth();
    const aOut = handles.attach(a).out;

    intersectObjects.mockImplementation((targets: THREE.Object3D[]) => {
      if (targets.includes(aOut)) {
        return [{ object: aOut }];
      }
      return [];
    });
    canvas.dispatchEvent(
      createPointerEvent('pointerdown', { clientX: 10, clientY: 10, pointerId: 1 }),
    );

    intersectObjects.mockImplementation((targets: THREE.Object3D[]) => {
      if (targets.includes(b.mesh)) {
        return [{ object: b.mesh }];
      }
      return [];
    });
    window.dispatchEvent(createPointerEvent('pointerup', { pointerId: 1 }));

    expect(edgeManager.getEdges()).toEqual([
      expect.objectContaining({ from: a.id, to: b.id }),
    ]);
  });

  it('cancels linking on empty drop without creating an edge', () => {
    const { a } = attachBoth();
    const aOut = handles.attach(a).out;

    intersectObjects.mockImplementation((targets: THREE.Object3D[]) => {
      if (targets.includes(aOut)) {
        return [{ object: aOut }];
      }
      return [];
    });
    canvas.dispatchEvent(
      createPointerEvent('pointerdown', { clientX: 10, clientY: 10, pointerId: 1 }),
    );
    expect(interaction.getInteractionState().mode).toBe('linking');

    intersectObjects.mockReturnValue([]);
    window.dispatchEvent(createPointerEvent('pointerup', { pointerId: 1 }));

    expect(edgeManager.getEdges()).toHaveLength(0);
    expect(interaction.getInteractionState().mode).toBe('idle');
    expect(controls.enabled).toBe(true);
  });

  it('rejects self-loop and duplicate ordered pair with forbidden cursor', () => {
    const { a, b } = attachBoth();
    const aOut = handles.attach(a).out;
    edgeManager.connect(a.id, b.id);

    intersectObjects.mockImplementation((targets: THREE.Object3D[]) => {
      if (targets.includes(aOut)) {
        return [{ object: aOut }];
      }
      return [];
    });
    canvas.dispatchEvent(
      createPointerEvent('pointerdown', { clientX: 10, clientY: 10, pointerId: 1 }),
    );

    intersectObjects.mockImplementation((targets: THREE.Object3D[]) => {
      if (targets.includes(a.mesh)) {
        return [{ object: a.mesh }];
      }
      return [];
    });
    canvas.dispatchEvent(createPointerEvent('pointermove', { clientX: 50, clientY: 50 }));
    expect(interaction.getInteractionState().invalidTarget).toBe(true);
    expect(canvas.style.cursor).toBe('not-allowed');

    window.dispatchEvent(createPointerEvent('pointerup', { pointerId: 1 }));
    expect(edgeManager.getEdges()).toHaveLength(1);

    intersectObjects.mockImplementation((targets: THREE.Object3D[]) => {
      if (targets.includes(aOut)) {
        return [{ object: aOut }];
      }
      return [];
    });
    canvas.dispatchEvent(
      createPointerEvent('pointerdown', { clientX: 10, clientY: 10, pointerId: 1 }),
    );
    intersectObjects.mockImplementation((targets: THREE.Object3D[]) => {
      if (targets.includes(b.mesh)) {
        return [{ object: b.mesh }];
      }
      return [];
    });
    canvas.dispatchEvent(createPointerEvent('pointermove', { clientX: 80, clientY: 80 }));
    expect(interaction.getInteractionState().invalidTarget).toBe(true);
    window.dispatchEvent(createPointerEvent('pointerup', { pointerId: 1 }));
    expect(edgeManager.getEdges()).toHaveLength(1);
  });

  it('body drag still moves component when press is not on a handle', () => {
    const { a } = attachBoth();
    handles.setHandlesVisible(a.id, true);

    intersectObjects.mockImplementation((targets: THREE.Object3D[]) => {
      if (targets.includes(a.mesh)) {
        return [{ object: a.mesh }];
      }
      return [];
    });
    intersectPlane.mockImplementation((_plane: THREE.Plane, target: THREE.Vector3) => {
      target.set(4, 0, 5);
      return target;
    });

    canvas.dispatchEvent(
      createPointerEvent('pointerdown', { clientX: 100, clientY: 100, pointerId: 1 }),
    );
    canvas.dispatchEvent(
      createPointerEvent('pointermove', { clientX: 140, clientY: 140, pointerId: 1 }),
    );
    window.dispatchEvent(createPointerEvent('pointerup', { pointerId: 1 }));

    expect(a.group.position.x).toBe(4);
    expect(a.group.position.z).toBe(5);
    expect(edgeManager.getEdges()).toHaveLength(0);
  });
});

describe('canvas interaction — preview + highlight (CGD-03/04)', () => {
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let canvas: HTMLCanvasElement;
  let controls: { enabled: boolean };
  let raycaster: THREE.Raycaster;
  let intersectObjects: ReturnType<typeof vi.fn>;
  let componentManager: ReturnType<typeof createComponentManager>;
  let edgeManager: ReturnType<typeof createEdgeManager>;
  let handles: ReturnType<typeof createComponentHandles>;
  let preview: ReturnType<typeof createLinkPreview>;
  let panelHost: HTMLDivElement;
  let interaction: CanvasInteraction;

  beforeEach(() => {
    resetComponentIdCounter();
    resetEdgeIdCounter();

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
    camera.position.set(20, 20, 20);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    canvas = document.createElement('canvas');
    Object.defineProperty(canvas, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: 600, configurable: true });
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    canvas.setPointerCapture = vi.fn();
    document.body.append(canvas);
    controls = { enabled: true };

    intersectObjects = vi.fn().mockReturnValue([]);
    raycaster = {
      setFromCamera: vi.fn(),
      intersectObjects,
      ray: {
        intersectPlane: vi.fn((_plane: THREE.Plane, target: THREE.Vector3) => {
          target.set(2, 0, 2);
          return target;
        }),
      },
    } as unknown as THREE.Raycaster;

    componentManager = createComponentManager({
      scene,
      camera,
      canvas,
      controls,
      raycaster,
      attachPointerHandlers: false,
    });
    edgeManager = createEdgeManager({ componentManager });
    handles = createComponentHandles();
    preview = createLinkPreview(scene);
    panelHost = document.createElement('div');
    document.body.append(panelHost);
    interaction = createCanvasInteraction({
      scene,
      camera,
      canvas,
      controls,
      raycaster,
      componentManager,
      edgeManager,
      handles,
      linkPreview: preview,
      propertiesPanel: mountPropertiesPanel(panelHost, {
        onLabelChange: () => undefined,
        onNoteChange: () => undefined,
        onDelete: () => undefined,
      }),
    });
  });

  afterEach(() => {
    interaction.dispose();
    componentManager.dispose();
    handles.dispose();
    preview.dispose();
    panelHost.remove();
    canvas.remove();
  });

  function attachBoth() {
    const a = componentManager.addComponent('api_gateway', { x: 0, y: 0, z: 0 });
    const b = componentManager.addComponent('app_server', { x: 3, y: 0, z: 0 });
    handles.attach(a);
    handles.attach(b);
    return { a, b };
  }

  it('exposes previewActive with curved preview while linking', () => {
    const { a, b } = attachBoth();
    const aOut = handles.attach(a).out;
    const bSet = handles.attach(b);

    expect(bSet.in.visible).toBe(false);

    intersectObjects.mockImplementation((targets: THREE.Object3D[]) => {
      if (targets.includes(aOut)) {
        return [{ object: aOut }];
      }
      return [];
    });
    canvas.dispatchEvent(
      createPointerEvent('pointerdown', { clientX: 10, clientY: 10, pointerId: 1 }),
    );

    expect(interaction.getInteractionState().mode).toBe('linking');
    expect(interaction.getInteractionState().previewActive).toBe(true);
    expect(preview.isActive).toBe(true);
    expect(preview.mesh.visible).toBe(true);
    expect(preview.mesh.geometry).toBeInstanceOf(THREE.TubeGeometry);
    // Destination handles appear without prior hover (forced)
    expect(bSet.in.visible).toBe(true);
    expect(bSet.out.visible).toBe(true);

    interaction.update(0.5);
    const uniforms = (
      preview.mesh.material as THREE.ShaderMaterial
    ).uniforms as { uTime: { value: number } };
    expect(uniforms.uTime.value).toBeGreaterThan(0);
  });

  it('highlights valid target node + in-handle; invalid uses setValidTarget(false)', () => {
    const { a, b } = attachBoth();
    const aOut = handles.attach(a).out;
    const bIn = handles.attach(b).in;

    intersectObjects.mockImplementation((targets: THREE.Object3D[]) => {
      if (targets.includes(aOut)) {
        return [{ object: aOut }];
      }
      return [];
    });
    canvas.dispatchEvent(
      createPointerEvent('pointerdown', { clientX: 10, clientY: 10, pointerId: 1 }),
    );

    intersectObjects.mockImplementation((targets: THREE.Object3D[]) => {
      if (targets.includes(bIn) || targets.includes(b.mesh)) {
        return [{ object: targets.includes(bIn) ? bIn : b.mesh }];
      }
      return [];
    });
    canvas.dispatchEvent(createPointerEvent('pointermove', { clientX: 200, clientY: 200 }));

    expect(preview.isValidTarget).toBe(true);
    expect(interaction.getInteractionState().invalidTarget).toBe(false);
    const mat = b.mesh.material as THREE.MeshStandardMaterial;
    expect(mat.emissiveIntensity).toBeGreaterThan(0);

    intersectObjects.mockImplementation((targets: THREE.Object3D[]) => {
      if (targets.includes(a.mesh)) {
        return [{ object: a.mesh }];
      }
      return [];
    });
    canvas.dispatchEvent(createPointerEvent('pointermove', { clientX: 50, clientY: 50 }));
    expect(preview.isValidTarget).toBe(false);
    expect(interaction.getInteractionState().invalidTarget).toBe(true);
    expect(canvas.style.cursor).toBe('not-allowed');
  });

  it('hides preview and keeps permanent flow edge after successful drop', () => {
    const { a, b } = attachBoth();
    const aOut = handles.attach(a).out;

    intersectObjects.mockImplementation((targets: THREE.Object3D[]) => {
      if (targets.includes(aOut)) {
        return [{ object: aOut }];
      }
      return [];
    });
    canvas.dispatchEvent(
      createPointerEvent('pointerdown', { clientX: 10, clientY: 10, pointerId: 1 }),
    );
    expect(interaction.getInteractionState().previewActive).toBe(true);

    intersectObjects.mockImplementation((targets: THREE.Object3D[]) => {
      if (targets.includes(b.mesh)) {
        return [{ object: b.mesh }];
      }
      return [];
    });
    window.dispatchEvent(createPointerEvent('pointerup', { pointerId: 1 }));

    expect(interaction.getInteractionState().previewActive).toBe(false);
    expect(preview.isActive).toBe(false);
    expect(preview.mesh.visible).toBe(false);

    const edges = edgeManager.getEdges();
    expect(edges).toHaveLength(1);
    const visual = interaction.getFlowEdges().get(edges[0].id);
    expect(visual).toBeDefined();
    expect(visual!.mesh.userData.isFlowEdge).toBe(true);
    expect(visual!.mesh.visible).toBe(true);
  });
});

describe('canvas interaction — select/delete/invert edges (CGD-05/06)', () => {
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let canvas: HTMLCanvasElement;
  let controls: { enabled: boolean };
  let raycaster: THREE.Raycaster;
  let intersectObjects: ReturnType<typeof vi.fn>;
  let componentManager: ReturnType<typeof createComponentManager>;
  let edgeManager: ReturnType<typeof createEdgeManager>;
  let handles: ReturnType<typeof createComponentHandles>;
  let preview: ReturnType<typeof createLinkPreview>;
  let panelHost: HTMLDivElement;
  let interaction: CanvasInteraction;

  beforeEach(() => {
    resetComponentIdCounter();
    resetEdgeIdCounter();

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
    camera.position.set(20, 20, 20);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    canvas = document.createElement('canvas');
    Object.defineProperty(canvas, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: 600, configurable: true });
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    canvas.setPointerCapture = vi.fn();
    document.body.append(canvas);
    controls = { enabled: true };

    intersectObjects = vi.fn().mockReturnValue([]);
    raycaster = {
      setFromCamera: vi.fn(),
      intersectObjects,
      ray: {
        intersectPlane: vi.fn((_plane: THREE.Plane, target: THREE.Vector3) => {
          target.set(1, 0, 1);
          return target;
        }),
      },
    } as unknown as THREE.Raycaster;

    componentManager = createComponentManager({
      scene,
      camera,
      canvas,
      controls,
      raycaster,
      attachPointerHandlers: false,
    });
    edgeManager = createEdgeManager({ componentManager });
    handles = createComponentHandles();
    preview = createLinkPreview(scene);
    panelHost = document.createElement('div');
    document.body.append(panelHost);

    const interactionRef: { current: CanvasInteraction | null } = { current: null };
    const propertiesPanel = mountPropertiesPanel(panelHost, {
      onLabelChange: () => undefined,
      onNoteChange: () => undefined,
      onDelete: () => interactionRef.current?.deleteSelected(),
      onEdgeDelete: (id) => {
        interactionRef.current?.deleteEdge(id);
      },
      onEdgeInvert: (id) => {
        interactionRef.current?.invertEdge(id);
      },
    });

    interaction = createCanvasInteraction({
      scene,
      camera,
      canvas,
      controls,
      raycaster,
      componentManager,
      edgeManager,
      handles,
      linkPreview: preview,
      propertiesPanel,
    });
    interactionRef.current = interaction;
  });

  afterEach(() => {
    interaction.dispose();
    componentManager.dispose();
    handles.dispose();
    preview.dispose();
    panelHost.remove();
    canvas.remove();
  });

  function linkViaGesture(
    a: ReturnType<typeof componentManager.addComponent>,
    b: ReturnType<typeof componentManager.addComponent>,
  ) {
    const aOut = handles.attach(a).out;
    intersectObjects.mockImplementation((targets: THREE.Object3D[]) => {
      if (targets.includes(aOut)) {
        return [{ object: aOut }];
      }
      return [];
    });
    canvas.dispatchEvent(
      createPointerEvent('pointerdown', { clientX: 10, clientY: 10, pointerId: 1 }),
    );
    intersectObjects.mockImplementation((targets: THREE.Object3D[]) => {
      if (targets.includes(b.mesh)) {
        return [{ object: b.mesh }];
      }
      return [];
    });
    window.dispatchEvent(createPointerEvent('pointerup', { pointerId: 1 }));
    return edgeManager.getEdges()[0];
  }

  it('clicking a flow-edge mesh selects it and shows edge panel mode', () => {
    const a = componentManager.addComponent('client_web', { x: 0, y: 0, z: 0 });
    const b = componentManager.addComponent('cdn', { x: 3, y: 0, z: 0 });
    handles.attach(a);
    handles.attach(b);
    const edge = linkViaGesture(a, b);
    const visual = interaction.getFlowEdges().get(edge.id)!;

    intersectObjects.mockImplementation((targets: THREE.Object3D[]) => {
      if (targets.includes(visual.mesh)) {
        return [{ object: visual.mesh }];
      }
      return [];
    });
    canvas.dispatchEvent(
      createPointerEvent('pointerdown', { clientX: 200, clientY: 200, pointerId: 1 }),
    );

    expect(interaction.getInteractionState().mode).toBe('edgeSelected');
    expect(interaction.getInteractionState().selectedEdgeId).toBe(edge.id);
    expect(panelHost.querySelector('[data-testid="properties-panel"]')?.getAttribute('data-mode')).toBe(
      'edge',
    );
    expect(panelHost.querySelector('[data-testid="prop-edge-section"]')?.hasAttribute('hidden')).toBe(
      false,
    );
  });

  it('Delete/Backspace and panel delete remove the selected edge', () => {
    const a = componentManager.addComponent('api_gateway', { x: 0, y: 0, z: 0 });
    const b = componentManager.addComponent('app_server', { x: 3, y: 0, z: 0 });
    handles.attach(a);
    handles.attach(b);
    const edge = linkViaGesture(a, b);
    interaction.selectEdge(edge.id);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
    expect(edgeManager.getEdges()).toHaveLength(0);
    expect(interaction.getFlowEdges().has(edge.id)).toBe(false);

    const edge2 = linkViaGesture(a, b);
    interaction.selectEdge(edge2.id);
    panelHost.querySelector<HTMLButtonElement>('[data-testid="prop-edge-delete"]')!.click();
    expect(edgeManager.getEdges()).toHaveLength(0);
  });

  it('invert swaps endpoints and updates flow geometry immediately', () => {
    const a = componentManager.addComponent('cache_redis', { x: 0, y: 0, z: 0 });
    const b = componentManager.addComponent('sql_db', { x: 4, y: 0, z: 0 });
    handles.attach(a);
    handles.attach(b);
    const edge = linkViaGesture(a, b);
    interaction.selectEdge(edge.id);

    const rebuild = vi.spyOn(interaction.getFlowEdges().get(edge.id)!, 'rebuildGeometry');
    panelHost.querySelector<HTMLButtonElement>('[data-testid="prop-edge-invert"]')!.click();

    expect(edgeManager.getEdge(edge.id)).toMatchObject({ from: b.id, to: a.id });
    expect(rebuild).toHaveBeenCalled();
  });

  it('Delete with component selected removes component and incident edges', () => {
    const a = componentManager.addComponent('message_queue', { x: 0, y: 0, z: 0 });
    const b = componentManager.addComponent('worker', { x: 3, y: 0, z: 0 });
    handles.attach(a);
    handles.attach(b);
    const edge = linkViaGesture(a, b);

    intersectObjects.mockImplementation((targets: THREE.Object3D[]) => {
      if (targets.includes(a.mesh)) {
        return [{ object: a.mesh }];
      }
      return [];
    });
    canvas.dispatchEvent(
      createPointerEvent('pointerdown', { clientX: 50, clientY: 50, pointerId: 1 }),
    );
    window.dispatchEvent(createPointerEvent('pointerup', { pointerId: 1 }));

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
    expect(componentManager.getInstance(a.id)).toBeUndefined();
    expect(edgeManager.getEdges()).toHaveLength(0);
    expect(interaction.getFlowEdges().has(edge.id)).toBe(false);
  });
});

describe('canvas interaction — reconnect endpoint (CGD-07)', () => {
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let canvas: HTMLCanvasElement;
  let controls: { enabled: boolean };
  let raycaster: THREE.Raycaster;
  let intersectObjects: ReturnType<typeof vi.fn>;
  let componentManager: ReturnType<typeof createComponentManager>;
  let edgeManager: ReturnType<typeof createEdgeManager>;
  let handles: ReturnType<typeof createComponentHandles>;
  let preview: ReturnType<typeof createLinkPreview>;
  let panelHost: HTMLDivElement;
  let interaction: CanvasInteraction;

  beforeEach(() => {
    resetComponentIdCounter();
    resetEdgeIdCounter();

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
    camera.position.set(20, 20, 20);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    canvas = document.createElement('canvas');
    Object.defineProperty(canvas, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: 600, configurable: true });
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    canvas.setPointerCapture = vi.fn();
    document.body.append(canvas);
    controls = { enabled: true };

    intersectObjects = vi.fn().mockReturnValue([]);
    raycaster = {
      setFromCamera: vi.fn(),
      intersectObjects,
      ray: {
        intersectPlane: vi.fn((_plane: THREE.Plane, target: THREE.Vector3) => {
          target.set(2, 0, 2);
          return target;
        }),
      },
    } as unknown as THREE.Raycaster;

    componentManager = createComponentManager({
      scene,
      camera,
      canvas,
      controls,
      raycaster,
      attachPointerHandlers: false,
    });
    edgeManager = createEdgeManager({ componentManager });
    handles = createComponentHandles();
    preview = createLinkPreview(scene);
    panelHost = document.createElement('div');
    document.body.append(panelHost);
    interaction = createCanvasInteraction({
      scene,
      camera,
      canvas,
      controls,
      raycaster,
      componentManager,
      edgeManager,
      handles,
      linkPreview: preview,
      propertiesPanel: mountPropertiesPanel(panelHost, {
        onLabelChange: () => undefined,
        onNoteChange: () => undefined,
        onDelete: () => undefined,
      }),
    });
  });

  afterEach(() => {
    interaction.dispose();
    componentManager.dispose();
    handles.dispose();
    preview.dispose();
    panelHost.remove();
    canvas.remove();
  });

  function linkViaGesture(
    a: ReturnType<typeof componentManager.addComponent>,
    b: ReturnType<typeof componentManager.addComponent>,
  ) {
    const aOut = handles.attach(a).out;
    intersectObjects.mockImplementation((targets: THREE.Object3D[]) => {
      if (targets.includes(aOut)) {
        return [{ object: aOut }];
      }
      return [];
    });
    canvas.dispatchEvent(
      createPointerEvent('pointerdown', { clientX: 10, clientY: 10, pointerId: 1 }),
    );
    intersectObjects.mockImplementation((targets: THREE.Object3D[]) => {
      if (targets.includes(b.mesh)) {
        return [{ object: b.mesh }];
      }
      return [];
    });
    window.dispatchEvent(createPointerEvent('pointerup', { pointerId: 1 }));
    return edgeManager.getEdges()[0];
  }

  it('dragging tip enters reconnecting with preview; controls disabled', () => {
    const a = componentManager.addComponent('client_web', { x: 0, y: 0, z: 0 });
    const b = componentManager.addComponent('cdn', { x: 3, y: 0, z: 0 });
    handles.attach(a);
    handles.attach(b);
    const edge = linkViaGesture(a, b);
    interaction.selectEdge(edge.id);

    const tipTo = [...scene.children].find(
      (obj) => obj.userData?.isEdgeTip && obj.userData.end === 'to',
    ) as THREE.Mesh;
    expect(tipTo).toBeDefined();

    intersectObjects.mockImplementation((targets: THREE.Object3D[]) => {
      if (targets.includes(tipTo)) {
        return [{ object: tipTo }];
      }
      return [];
    });
    canvas.dispatchEvent(
      createPointerEvent('pointerdown', { clientX: 100, clientY: 100, pointerId: 1 }),
    );

    expect(interaction.getInteractionState().mode).toBe('reconnecting');
    expect(interaction.getInteractionState().reconnectEnd).toBe('to');
    expect(interaction.getInteractionState().previewActive).toBe(true);
    expect(controls.enabled).toBe(false);
  });

  it('valid reconnect updates endpoint; invalid restores previous', () => {
    const a = componentManager.addComponent('api_gateway', { x: 0, y: 0, z: 0 });
    const b = componentManager.addComponent('app_server', { x: 3, y: 0, z: 0 });
    const c = componentManager.addComponent('sql_db', { x: 6, y: 0, z: 0 });
    handles.attach(a);
    handles.attach(b);
    handles.attach(c);
    const edge = linkViaGesture(a, b);
    interaction.selectEdge(edge.id);

    const tipTo = [...scene.children].find(
      (obj) => obj.userData?.isEdgeTip && obj.userData.end === 'to',
    ) as THREE.Mesh;

    intersectObjects.mockImplementation((targets: THREE.Object3D[]) => {
      if (targets.includes(tipTo)) {
        return [{ object: tipTo }];
      }
      return [];
    });
    canvas.dispatchEvent(
      createPointerEvent('pointerdown', { clientX: 100, clientY: 100, pointerId: 1 }),
    );

    intersectObjects.mockImplementation((targets: THREE.Object3D[]) => {
      if (targets.includes(c.mesh)) {
        return [{ object: c.mesh }];
      }
      return [];
    });
    window.dispatchEvent(createPointerEvent('pointerup', { pointerId: 1 }));
    expect(edgeManager.getEdge(edge.id)).toMatchObject({ from: a.id, to: c.id });

    interaction.selectEdge(edge.id);
    const tipTo2 = [...scene.children].find(
      (obj) => obj.userData?.isEdgeTip && obj.userData.end === 'to',
    ) as THREE.Mesh;
    intersectObjects.mockImplementation((targets: THREE.Object3D[]) => {
      if (targets.includes(tipTo2)) {
        return [{ object: tipTo2 }];
      }
      return [];
    });
    canvas.dispatchEvent(
      createPointerEvent('pointerdown', { clientX: 100, clientY: 100, pointerId: 1 }),
    );
    // invalid: self-loop onto from node
    intersectObjects.mockImplementation((targets: THREE.Object3D[]) => {
      if (targets.includes(a.mesh)) {
        return [{ object: a.mesh }];
      }
      return [];
    });
    window.dispatchEvent(createPointerEvent('pointerup', { pointerId: 1 }));
    expect(edgeManager.getEdge(edge.id)).toMatchObject({ from: a.id, to: c.id });
    expect(controls.enabled).toBe(true);
  });
});

describe('canvas interaction — bidirectional dual-pulse (CGD-08)', () => {
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let canvas: HTMLCanvasElement;
  let controls: { enabled: boolean };
  let raycaster: THREE.Raycaster;
  let intersectObjects: ReturnType<typeof vi.fn>;
  let componentManager: ReturnType<typeof createComponentManager>;
  let edgeManager: ReturnType<typeof createEdgeManager>;
  let handles: ReturnType<typeof createComponentHandles>;
  let preview: ReturnType<typeof createLinkPreview>;
  let panelHost: HTMLDivElement;
  let interaction: CanvasInteraction;

  beforeEach(() => {
    resetComponentIdCounter();
    resetEdgeIdCounter();

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
    camera.position.set(20, 20, 20);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    canvas = document.createElement('canvas');
    Object.defineProperty(canvas, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: 600, configurable: true });
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    canvas.setPointerCapture = vi.fn();
    document.body.append(canvas);
    controls = { enabled: true };

    intersectObjects = vi.fn().mockReturnValue([]);
    raycaster = {
      setFromCamera: vi.fn(),
      intersectObjects,
      ray: {
        intersectPlane: vi.fn((_plane: THREE.Plane, target: THREE.Vector3) => {
          target.set(1, 0, 1);
          return target;
        }),
      },
    } as unknown as THREE.Raycaster;

    componentManager = createComponentManager({
      scene,
      camera,
      canvas,
      controls,
      raycaster,
      attachPointerHandlers: false,
    });
    edgeManager = createEdgeManager({ componentManager });
    handles = createComponentHandles();
    preview = createLinkPreview(scene);
    panelHost = document.createElement('div');
    document.body.append(panelHost);

    const interactionRef: { current: CanvasInteraction | null } = { current: null };
    interaction = createCanvasInteraction({
      scene,
      camera,
      canvas,
      controls,
      raycaster,
      componentManager,
      edgeManager,
      handles,
      linkPreview: preview,
      propertiesPanel: mountPropertiesPanel(panelHost, {
        onLabelChange: () => undefined,
        onNoteChange: () => undefined,
        onDelete: () => undefined,
        onEdgeDirectionChange: (id, direction) => {
          interactionRef.current?.setEdgeDirection(id, direction);
        },
      }),
    });
    interactionRef.current = interaction;
  });

  afterEach(() => {
    interaction.dispose();
    componentManager.dispose();
    handles.dispose();
    preview.dispose();
    panelHost.remove();
    canvas.remove();
  });

  it('panel toggle sets bidirectional uBidirectional=1 then restores forward single pulse', async () => {
    const { getFlowEdgeUniforms } = await import('./edges/flow-edge');
    const a = componentManager.addComponent('client_web', { x: 0, y: 0, z: 0 });
    const b = componentManager.addComponent('load_balancer', { x: 3, y: 0, z: 0 });
    handles.attach(a);
    handles.attach(b);

    const aOut = handles.attach(a).out;
    intersectObjects.mockImplementation((targets: THREE.Object3D[]) => {
      if (targets.includes(aOut)) {
        return [{ object: aOut }];
      }
      return [];
    });
    canvas.dispatchEvent(
      createPointerEvent('pointerdown', { clientX: 10, clientY: 10, pointerId: 1 }),
    );
    intersectObjects.mockImplementation((targets: THREE.Object3D[]) => {
      if (targets.includes(b.mesh)) {
        return [{ object: b.mesh }];
      }
      return [];
    });
    window.dispatchEvent(createPointerEvent('pointerup', { pointerId: 1 }));

    const edge = edgeManager.getEdges()[0];
    interaction.selectEdge(edge.id);
    const visual = interaction.getFlowEdges().get(edge.id)!;
    const uniforms = getFlowEdgeUniforms(visual.mesh)!;
    expect(uniforms.uBidirectional.value).toBe(0);

    panelHost
      .querySelector<HTMLButtonElement>('[data-testid="prop-edge-bidirectional"]')!
      .click();

    expect(edgeManager.getEdge(edge.id)?.direction).toBe('bidirectional');
    expect(visual.direction).toBe('bidirectional');
    expect(uniforms.uBidirectional.value).toBe(1);

    panelHost
      .querySelector<HTMLButtonElement>('[data-testid="prop-edge-bidirectional"]')!
      .click();

    expect(edgeManager.getEdge(edge.id)?.direction).toBe('forward');
    expect(visual.direction).toBe('forward');
    expect(uniforms.uBidirectional.value).toBe(0);
  });
});

describe('canvas interaction — boot wiring (CGD-09)', () => {
  it('mountCanvasInteraction exposes canvasInteraction on __GAME_STATE__ and places palette drops', async () => {
    const { mountCanvasInteraction } = await import('./canvas-interaction');
    const { initGameState, getGameState } = await import('../test-hook');
    const { PALETTE_DROP_EVENT } = await import('../ui/palette');
    const { resetComponentIdCounter } = await import('./component-manager');
    const { resetEdgeIdCounter } = await import('./edge-manager');

    resetComponentIdCounter();
    resetEdgeIdCounter();
    initGameState();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
    camera.position.set(20, 20, 20);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    const canvas = document.createElement('canvas');
    Object.defineProperty(canvas, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: 600, configurable: true });
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    canvas.setPointerCapture = vi.fn();
    document.body.append(canvas);

    const uiHost = document.createElement('div');
    document.body.append(uiHost);

    const interaction = mountCanvasInteraction(
      {
        scene,
        camera,
        controls: { enabled: true },
      },
      canvas,
      uiHost,
    );

    interaction.update(0);
    expect(getGameState().canvasInteraction).toMatchObject({
      mode: 'idle',
      linkingFromId: null,
      selectedEdgeId: null,
      previewActive: false,
    });
    expect(() => JSON.stringify(getGameState().canvasInteraction)).not.toThrow();

    canvas.dispatchEvent(
      new CustomEvent(PALETTE_DROP_EVENT, {
        detail: { type: 'cache_redis', clientX: 400, clientY: 300 },
      }),
    );

    const instances = interaction.getComponentManager().getAllInstances();
    expect(instances).toHaveLength(1);
    expect(instances[0].type).toBe('cache_redis');
    expect(getGameState().graph.nodes).toHaveLength(1);

    interaction.dispose();
    canvas.remove();
    uiHost.remove();
  });
});
