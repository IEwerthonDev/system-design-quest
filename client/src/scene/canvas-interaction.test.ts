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
