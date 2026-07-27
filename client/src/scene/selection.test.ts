import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import type { ConnectionEdge } from '@sdq/shared';
import { createComponentManager, resetComponentIdCounter } from './component-manager';
import {
  COMPONENT_NOTE_MAX_LENGTH,
  createEdgeRegistry,
  createSelectionController,
} from './selection';
import { mountPropertiesPanel } from '../ui/properties-panel';

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

describe('selection controller', () => {
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let canvas: HTMLCanvasElement;
  let controls: { enabled: boolean };
  let intersectObjects: ReturnType<typeof vi.fn>;
  let intersectPlane: ReturnType<typeof vi.fn>;
  let raycaster: THREE.Raycaster;
  let manager: ReturnType<typeof createComponentManager>;
  let edgeRegistry: ReturnType<typeof createEdgeRegistry>;
  let selection: ReturnType<typeof createSelectionController>;
  let panelContainer: HTMLDivElement;

  beforeEach(() => {
    resetComponentIdCounter();
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

    controls = { enabled: true };

    intersectObjects = vi.fn();
    intersectPlane = vi.fn((_plane: THREE.Plane, target: THREE.Vector3) => {
      target.set(5, 0, 7);
      return target;
    });

    raycaster = {
      setFromCamera: vi.fn(),
      intersectObjects,
      ray: { intersectPlane: intersectPlane },
    } as unknown as THREE.Raycaster;

    manager = createComponentManager({
      scene,
      camera,
      canvas,
      controls,
      raycaster,
      attachPointerHandlers: false,
    });
    edgeRegistry = createEdgeRegistry();
    panelContainer = document.createElement('div');
    document.body.append(panelContainer);

    const panel = mountPropertiesPanel(panelContainer, {
      onLabelChange: (id, label) => selection.setLabel(id, label),
      onNoteChange: (id, note) => selection.setNote(id, note),
      onDelete: (id) => selection.deleteSelected(id),
    });

    selection = createSelectionController({
      componentManager: manager,
      edgeRegistry,
      canvas,
      propertiesPanel: panel,
    });
  });

  afterEach(() => {
    selection.dispose();
    manager.dispose();
    panelContainer.remove();
  });

  it('selects a component on click without drag', () => {
    const instance = manager.addComponent('load_balancer', { x: 0, y: 0, z: 0 });
    intersectObjects.mockReturnValueOnce([{ object: instance.mesh }]);

    canvas.dispatchEvent(
      createPointerEvent('pointerdown', {
        clientX: 400,
        clientY: 300,
        pointerId: 1,
      }),
    );
    window.dispatchEvent(createPointerEvent('pointerup', { pointerId: 1 }));

    expect(selection.getSelectedId()).toBe(instance.id);
    expect(panelContainer.querySelector<HTMLInputElement>('[data-testid="prop-label"]')?.value).toBe(
      'Load Balancer',
    );
  });

  it('allows renaming the selected component label via properties panel', () => {
    const instance = manager.addComponent('api_gateway', { x: 0, y: 0, z: 0 });
    selection.select(instance.id);

    const labelInput = panelContainer.querySelector<HTMLInputElement>('[data-testid="prop-label"]')!;
    labelInput.value = 'Public API';
    labelInput.dispatchEvent(new Event('input', { bubbles: true }));

    expect(manager.getInstance(instance.id)?.label).toBe('Public API');
    expect(selection.getLabel(instance.id)).toBe('Public API');
  });

  it('allows adding a note up to 200 characters', () => {
    const instance = manager.addComponent('cache_redis', { x: 0, y: 0, z: 0 });
    selection.select(instance.id);

    const noteInput = panelContainer.querySelector<HTMLTextAreaElement>('[data-testid="prop-note"]')!;
    const validNote = 'a'.repeat(COMPONENT_NOTE_MAX_LENGTH);
    noteInput.value = validNote;
    noteInput.dispatchEvent(new Event('input', { bubbles: true }));

    expect(selection.getNote(instance.id)).toBe(validNote);
    expect(noteInput.maxLength).toBe(COMPONENT_NOTE_MAX_LENGTH);
  });

  it('rejects notes longer than 200 characters', () => {
    const instance = manager.addComponent('worker', { x: 0, y: 0, z: 0 });
    selection.select(instance.id);

    const tooLong = 'x'.repeat(COMPONENT_NOTE_MAX_LENGTH + 1);
    selection.setNote(instance.id, tooLong);

    expect(selection.getNote(instance.id)).toBe('x'.repeat(COMPONENT_NOTE_MAX_LENGTH));
  });

  it('removes the selected component and its connections on Delete key', () => {
    const a = manager.addComponent('app_server', { x: 0, y: 0, z: 0 });
    const b = manager.addComponent('sql_db', { x: 2, y: 0, z: 0 });

    const edges: ConnectionEdge[] = [
      { id: 'edge-1', from: a.id, to: b.id, direction: 'forward' },
      { id: 'edge-2', from: b.id, to: a.id, direction: 'bidirectional' },
      { id: 'edge-3', from: b.id, to: 'other', direction: 'forward' },
    ];
    edgeRegistry.setEdges(edges);

    selection.select(a.id);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));

    expect(manager.getInstance(a.id)).toBeUndefined();
    expect(manager.getAllInstances()).toHaveLength(1);
    expect(edgeRegistry.getEdges()).toEqual([edges[2]]);
    expect(selection.getSelectedId()).toBeNull();
  });

  it('removes component when delete button is clicked in properties panel', () => {
    const instance = manager.addComponent('dns', { x: 0, y: 0, z: 0 });
    selection.select(instance.id);

    const deleteButton = panelContainer.querySelector<HTMLButtonElement>(
      '[data-testid="prop-delete"]',
    )!;
    deleteButton.click();

    expect(manager.getInstance(instance.id)).toBeUndefined();
    expect(selection.getSelectedId()).toBeNull();
  });
});
