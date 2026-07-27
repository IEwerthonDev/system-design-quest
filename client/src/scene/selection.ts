import type { ComponentManager } from './component-manager';
import type { PropertiesPanel } from '../ui/properties-panel';
import { COMPONENT_NOTE_MAX_LENGTH, clampNote } from '../ui/properties-panel';
import { createEdgeRegistry, type EdgeRegistry } from './edge-manager';

export { COMPONENT_NOTE_MAX_LENGTH };
export { createEdgeRegistry, type EdgeRegistry };

const DRAG_THRESHOLD_PX = 4;

export interface SelectionControllerOptions {
  componentManager: ComponentManager;
  edgeRegistry: EdgeRegistry;
  canvas: HTMLCanvasElement;
  propertiesPanel: PropertiesPanel;
}

export interface SelectionController {
  select(id: string | null): void;
  getSelectedId(): string | null;
  getLabel(id: string): string;
  getNote(id: string): string;
  setLabel(id: string, label: string): void;
  setNote(id: string, note: string): void;
  deleteSelected(id?: string): boolean;
  dispose(): void;
}

export function createSelectionController(
  options: SelectionControllerOptions,
): SelectionController {
  const { componentManager, edgeRegistry, canvas, propertiesPanel } = options;
  let selectedId: string | null = null;

  const syncPanel = (): void => {
    if (!selectedId) {
      propertiesPanel.sync({ visible: false, componentId: null, label: '', note: '' });
      return;
    }

    const instance = componentManager.getInstance(selectedId);
    if (!instance) {
      selectedId = null;
      propertiesPanel.sync({ visible: false, componentId: null, label: '', note: '' });
      return;
    }

    propertiesPanel.sync({
      visible: true,
      componentId: instance.id,
      label: instance.label,
      note: instance.note ?? '',
    });
  };

  const select = (id: string | null): void => {
    if (selectedId === id) {
      syncPanel();
      return;
    }

    componentManager.setSelected(selectedId, false);
    selectedId = id;
    if (selectedId) {
      componentManager.setSelected(selectedId, true);
    }
    syncPanel();
  };

  const deleteSelected = (id?: string): boolean => {
    const targetId = id ?? selectedId;
    if (!targetId) {
      return false;
    }

    edgeRegistry.removeEdgesForNode(targetId);
    const removed = componentManager.removeComponent(targetId);
    if (!removed) {
      return false;
    }

    if (selectedId === targetId) {
      selectedId = null;
      syncPanel();
    }
    return true;
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Delete' && event.key !== 'Backspace') {
      return;
    }

    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
    ) {
      return;
    }

    if (!selectedId) {
      return;
    }

    event.preventDefault();
    deleteSelected();
  };

  let pressId: string | null = null;
  let pressX = 0;
  let pressY = 0;
  let didDrag = false;

  const onPointerDown = (event: PointerEvent): void => {
    pressId = null;
    didDrag = false;
    pressX = event.clientX;
    pressY = event.clientY;

    const handled = componentManager.handlePointerDown(event);
    if (!handled) {
      select(null);
      return;
    }

    const picked = componentManager.getPickedInstanceId();
    pressId = picked;
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (pressId && !didDrag) {
      const dx = event.clientX - pressX;
      const dy = event.clientY - pressY;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
        didDrag = true;
      }
    }

    componentManager.handlePointerMove(event);
  };

  const onPointerUp = (): void => {
    if (pressId && !didDrag) {
      select(pressId);
    } else if (!pressId) {
      select(null);
    }

    pressId = null;
    didDrag = false;
    componentManager.handlePointerUp();
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('keydown', onKeyDown);

  return {
    select,
    getSelectedId() {
      return selectedId;
    },
    getLabel(id) {
      return componentManager.getInstance(id)?.label ?? '';
    },
    getNote(id) {
      return componentManager.getInstance(id)?.note ?? '';
    },
    setLabel(id, label) {
      componentManager.setLabel(id, label.trim());
      if (selectedId === id) {
        syncPanel();
      }
    },
    setNote(id, note) {
      componentManager.setNote(id, clampNote(note));
      if (selectedId === id) {
        syncPanel();
      }
    },
    deleteSelected,
    dispose() {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      componentManager.setSelected(selectedId, false);
      selectedId = null;
      propertiesPanel.sync({ visible: false, componentId: null, label: '', note: '' });
    },
  };
}
