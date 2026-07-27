export const COMPONENT_NOTE_MAX_LENGTH = 200;

export type PropertiesPanelMode = 'component' | 'edge' | 'hidden';
export type EdgePanelDirection = 'forward' | 'bidirectional';

export interface PropertiesPanelState {
  mode?: PropertiesPanelMode;
  visible: boolean;
  componentId: string | null;
  label: string;
  note: string;
  edgeId?: string | null;
  edgeDirection?: EdgePanelDirection;
}

export interface PropertiesPanelCallbacks {
  onLabelChange: (componentId: string, label: string) => void;
  onNoteChange: (componentId: string, note: string) => void;
  onDelete: (componentId: string) => void;
  onEdgeDelete?: (edgeId: string) => void;
  onEdgeInvert?: (edgeId: string) => void;
  onEdgeDirectionChange?: (edgeId: string, direction: EdgePanelDirection) => void;
}

export interface PropertiesPanel {
  root: HTMLElement;
  sync(state: PropertiesPanelState): void;
}

export function clampNote(note: string): string {
  return note.slice(0, COMPONENT_NOTE_MAX_LENGTH);
}

export function resolvePanelMode(state: PropertiesPanelState): PropertiesPanelMode {
  if (state.mode) {
    return state.mode;
  }
  return state.visible ? 'component' : 'hidden';
}

function injectPropertiesStyles(root: HTMLElement): void {
  if (document.getElementById('sdq-properties-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'sdq-properties-styles';
  style.textContent = `
    .sdq-properties {
      position: fixed;
      top: 0;
      right: 0;
      width: 260px;
      height: 100%;
      overflow-y: auto;
      background: rgba(15, 20, 25, 0.92);
      border-left: 1px solid rgba(148, 163, 184, 0.2);
      color: #e2e8f0;
      font-family: system-ui, sans-serif;
      font-size: 13px;
      z-index: 10;
      padding: 16px 14px 24px;
      display: none;
    }
    .sdq-properties--visible {
      display: block;
    }
    .sdq-properties__title {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 14px;
    }
    .sdq-properties__field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 12px;
    }
    .sdq-properties__label {
      font-size: 11px;
      font-weight: 600;
      color: #cbd5e1;
    }
    .sdq-properties__input,
    .sdq-properties__textarea {
      width: 100%;
      border-radius: 6px;
      border: 1px solid rgba(148, 163, 184, 0.25);
      background: rgba(30, 41, 59, 0.8);
      color: #e2e8f0;
      padding: 8px 10px;
      font: inherit;
      box-sizing: border-box;
    }
    .sdq-properties__textarea {
      min-height: 88px;
      resize: vertical;
    }
    .sdq-properties__delete,
    .sdq-properties__action {
      width: 100%;
      margin-top: 8px;
      border-radius: 6px;
      padding: 8px 10px;
      font: inherit;
      cursor: pointer;
    }
    .sdq-properties__delete {
      border: 1px solid rgba(248, 113, 113, 0.45);
      background: rgba(127, 29, 29, 0.35);
      color: #fecaca;
    }
    .sdq-properties__delete:hover {
      background: rgba(153, 27, 27, 0.5);
    }
    .sdq-properties__action {
      border: 1px solid rgba(148, 163, 184, 0.35);
      background: rgba(30, 41, 59, 0.8);
      color: #e2e8f0;
    }
    .sdq-properties__action:hover {
      background: rgba(51, 65, 85, 0.9);
    }
    .sdq-properties__action--active {
      border-color: rgba(96, 165, 250, 0.55);
      background: rgba(30, 64, 175, 0.35);
      color: #bfdbfe;
    }
    .sdq-properties__section[hidden] {
      display: none !important;
    }
  `;
  root.append(style);
}

export function mountPropertiesPanel(
  container: HTMLElement,
  callbacks: PropertiesPanelCallbacks,
): PropertiesPanel {
  injectPropertiesStyles(document.head);

  const panel = document.createElement('aside');
  panel.className = 'sdq-properties';
  panel.setAttribute('data-testid', 'properties-panel');

  const title = document.createElement('div');
  title.className = 'sdq-properties__title';
  title.textContent = 'Propriedades';
  panel.append(title);

  const componentSection = document.createElement('div');
  componentSection.className = 'sdq-properties__section';
  componentSection.setAttribute('data-testid', 'prop-component-section');

  const labelField = document.createElement('label');
  labelField.className = 'sdq-properties__field';
  labelField.innerHTML = '<span class="sdq-properties__label">Label</span>';
  const labelInput = document.createElement('input');
  labelInput.className = 'sdq-properties__input';
  labelInput.setAttribute('data-testid', 'prop-label');
  labelInput.type = 'text';
  labelField.append(labelInput);

  const noteField = document.createElement('label');
  noteField.className = 'sdq-properties__field';
  noteField.innerHTML = '<span class="sdq-properties__label">Nota</span>';
  const noteInput = document.createElement('textarea');
  noteInput.className = 'sdq-properties__textarea';
  noteInput.setAttribute('data-testid', 'prop-note');
  noteInput.maxLength = COMPONENT_NOTE_MAX_LENGTH;
  noteField.append(noteInput);

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'sdq-properties__delete';
  deleteButton.setAttribute('data-testid', 'prop-delete');
  deleteButton.textContent = 'Excluir componente';

  componentSection.append(labelField, noteField, deleteButton);

  const edgeSection = document.createElement('div');
  edgeSection.className = 'sdq-properties__section';
  edgeSection.setAttribute('data-testid', 'prop-edge-section');
  edgeSection.hidden = true;

  const edgeInvertButton = document.createElement('button');
  edgeInvertButton.type = 'button';
  edgeInvertButton.className = 'sdq-properties__action';
  edgeInvertButton.setAttribute('data-testid', 'prop-edge-invert');
  edgeInvertButton.textContent = 'Inverter direção';

  const edgeBidirectionalButton = document.createElement('button');
  edgeBidirectionalButton.type = 'button';
  edgeBidirectionalButton.className = 'sdq-properties__action';
  edgeBidirectionalButton.setAttribute('data-testid', 'prop-edge-bidirectional');
  edgeBidirectionalButton.textContent = 'Tornar bidirecional';

  const edgeDeleteButton = document.createElement('button');
  edgeDeleteButton.type = 'button';
  edgeDeleteButton.className = 'sdq-properties__delete';
  edgeDeleteButton.setAttribute('data-testid', 'prop-edge-delete');
  edgeDeleteButton.textContent = 'Excluir aresta';

  edgeSection.append(edgeInvertButton, edgeBidirectionalButton, edgeDeleteButton);
  panel.append(componentSection, edgeSection);
  container.append(panel);

  let activeComponentId: string | null = null;
  let activeEdgeId: string | null = null;
  let activeEdgeDirection: EdgePanelDirection = 'forward';
  let syncing = false;

  labelInput.addEventListener('input', () => {
    if (syncing || !activeComponentId) {
      return;
    }
    callbacks.onLabelChange(activeComponentId, labelInput.value);
  });

  noteInput.addEventListener('input', () => {
    if (syncing || !activeComponentId) {
      return;
    }
    callbacks.onNoteChange(activeComponentId, noteInput.value);
  });

  deleteButton.addEventListener('click', () => {
    if (!activeComponentId) {
      return;
    }
    callbacks.onDelete(activeComponentId);
  });

  edgeDeleteButton.addEventListener('click', () => {
    if (!activeEdgeId) {
      return;
    }
    callbacks.onEdgeDelete?.(activeEdgeId);
  });

  edgeInvertButton.addEventListener('click', () => {
    if (!activeEdgeId) {
      return;
    }
    callbacks.onEdgeInvert?.(activeEdgeId);
  });

  edgeBidirectionalButton.addEventListener('click', () => {
    if (!activeEdgeId) {
      return;
    }
    const next: EdgePanelDirection =
      activeEdgeDirection === 'bidirectional' ? 'forward' : 'bidirectional';
    callbacks.onEdgeDirectionChange?.(activeEdgeId, next);
  });

  return {
    root: panel,
    sync(state) {
      const mode = resolvePanelMode(state);
      activeComponentId = state.componentId;
      activeEdgeId = state.edgeId ?? null;
      activeEdgeDirection = state.edgeDirection ?? 'forward';
      syncing = true;

      const visible = mode !== 'hidden';
      panel.classList.toggle('sdq-properties--visible', visible);
      panel.setAttribute('data-mode', mode);

      const showComponent = mode === 'component';
      const showEdge = mode === 'edge';
      componentSection.hidden = !showComponent;
      edgeSection.hidden = !showEdge;

      title.textContent = showEdge ? 'Aresta' : 'Propriedades';
      labelInput.value = state.label;
      noteInput.value = state.note;

      const bidirectional = activeEdgeDirection === 'bidirectional';
      edgeBidirectionalButton.textContent = bidirectional
        ? 'Voltar para unidirecional'
        : 'Tornar bidirecional';
      edgeBidirectionalButton.classList.toggle('sdq-properties__action--active', bidirectional);
      edgeBidirectionalButton.setAttribute('aria-pressed', bidirectional ? 'true' : 'false');

      syncing = false;
    },
  };
}
