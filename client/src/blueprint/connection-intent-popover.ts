import {
  CONNECTION_INTENTS,
  resolveMenuSelection,
  type ConnectionIntentId,
} from './connection-intents';

export interface ConnectionIntentPopoverCallbacks {
  onSelect(edgeId: string, intentId: ConnectionIntentId): void;
  onClose(): void;
}

export interface ConnectionIntentAnchor {
  x: number;
  y: number;
}

export interface ConnectionIntentPopover {
  root: HTMLElement;
  open(edgeId: string, label: string | undefined, anchor?: ConnectionIntentAnchor): void;
  close(): void;
  destroy(): void;
}

const SHEET_BREAKPOINT = 640;

function injectStyles(): void {
  if (document.getElementById('sdq-connection-intent-styles')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'sdq-connection-intent-styles';
  style.textContent = `
    .sdq-connection-intent {
      position: fixed;
      z-index: 45;
      width: 300px;
      max-height: min(70vh, 100%);
      overflow-y: auto;
      background: rgba(15, 30, 60, 0.98);
      border: 1px solid rgba(148,163,184,0.35);
      border-radius: 10px;
      color: #e2e8f0;
      font-family: ui-monospace, Menlo, monospace;
      font-size: 12px;
      padding: 12px 14px 14px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.45);
      box-sizing: border-box;
    }
    .sdq-connection-intent[hidden] { display: none !important; }
    .sdq-connection-intent--sheet {
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      top: auto !important;
      width: 100% !important;
      max-width: 100%;
      border-radius: 12px 12px 0 0;
      max-height: min(70vh, calc(100% - 8px));
    }
    .sdq-connection-intent__header {
      display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
    }
    .sdq-connection-intent__titles { flex: 1; min-width: 0; }
    .sdq-connection-intent__title {
      font-weight: 700; letter-spacing: 0.04em; display: block;
    }
    .sdq-connection-intent__role {
      color: #94a3b8; font-size: 10px; letter-spacing: 0.06em; margin-top: 2px;
    }
    .sdq-connection-intent__close {
      background: transparent; border: none; color: #94a3b8; cursor: pointer; font-size: 16px;
    }
    .sdq-connection-intent__option {
      display: block; width: 100%; text-align: left;
      background: rgba(0,0,0,0.25); border: 1px solid rgba(148,163,184,0.25);
      color: inherit; font: inherit; border-radius: 8px; padding: 10px 12px;
      margin-bottom: 8px; cursor: pointer;
    }
    .sdq-connection-intent__option:last-child { margin-bottom: 0; }
    .sdq-connection-intent__option.is-selected,
    .sdq-connection-intent__option[aria-selected="true"] {
      border-color: #38bdf8; background: rgba(14, 165, 233, 0.15);
    }
    .sdq-connection-intent__option-codes {
      display: flex; gap: 8px; align-items: baseline; margin-bottom: 4px;
    }
    .sdq-connection-intent__short { font-weight: 700; color: #f8fafc; }
    .sdq-connection-intent__option-role { color: #94a3b8; font-size: 10px; letter-spacing: 0.05em; }
    .sdq-connection-intent__option-desc { color: #cbd5e1; line-height: 1.35; font-size: 11px; }
  `;
  document.head.append(style);
}

function roleHeaderLabel(
  selection: ReturnType<typeof resolveMenuSelection>,
): string {
  if (selection === null) return 'REQUEST';
  if (selection === 'custom') return 'CUSTOM';
  const opt = CONNECTION_INTENTS.find((o) => o.id === selection);
  return opt?.role ?? 'CUSTOM';
}

export function mountConnectionIntentPopover(
  host: HTMLElement,
  callbacks: ConnectionIntentPopoverCallbacks,
): ConnectionIntentPopover {
  injectStyles();
  const root = document.createElement('div');
  root.className = 'sdq-connection-intent';
  root.setAttribute('data-testid', 'connection-intent');
  root.hidden = true;
  host.append(root);

  let currentEdgeId: string | null = null;

  const render = (edgeId: string, label: string | undefined): void => {
    currentEdgeId = edgeId;
    const selection = resolveMenuSelection(label, edgeId);
    root.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'sdq-connection-intent__header';
    const titles = document.createElement('div');
    titles.className = 'sdq-connection-intent__titles';
    const title = document.createElement('span');
    title.className = 'sdq-connection-intent__title';
    title.setAttribute('data-testid', 'connection-intent-title');
    title.textContent = 'CONNECTION INTENT';
    const role = document.createElement('div');
    role.className = 'sdq-connection-intent__role';
    role.setAttribute('data-testid', 'connection-intent-role');
    role.textContent = roleHeaderLabel(selection);
    titles.append(title, role);

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'sdq-connection-intent__close';
    close.setAttribute('aria-label', 'Fechar');
    close.textContent = '×';
    close.addEventListener('click', () => callbacks.onClose());
    header.append(titles, close);
    root.append(header);

    for (const intent of CONNECTION_INTENTS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sdq-connection-intent__option';
      btn.setAttribute('data-testid', 'connection-intent-option');
      btn.setAttribute('data-intent-id', intent.id);
      const isActive = selection === intent.id;
      if (isActive) {
        btn.classList.add('is-selected');
        btn.setAttribute('aria-selected', 'true');
      } else {
        btn.setAttribute('aria-selected', 'false');
      }

      const codes = document.createElement('div');
      codes.className = 'sdq-connection-intent__option-codes';
      const short = document.createElement('span');
      short.className = 'sdq-connection-intent__short';
      short.textContent = intent.shortLabel;
      const optRole = document.createElement('span');
      optRole.className = 'sdq-connection-intent__option-role';
      optRole.textContent = intent.role;
      codes.append(short, optRole);

      const desc = document.createElement('div');
      desc.className = 'sdq-connection-intent__option-desc';
      desc.textContent = intent.description;

      btn.append(codes, desc);
      btn.addEventListener('click', () => {
        if (!currentEdgeId) return;
        callbacks.onSelect(currentEdgeId, intent.id);
      });
      root.append(btn);
    }
  };

  const position = (anchor?: ConnectionIntentAnchor): void => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    root.classList.remove('sdq-connection-intent--sheet');
    root.style.left = '';
    root.style.right = '';
    root.style.bottom = '';
    root.style.top = '';
    root.style.width = '';

    if (vw <= SHEET_BREAKPOINT) {
      root.classList.add('sdq-connection-intent--sheet');
      root.style.left = '0px';
      root.style.right = '0px';
      root.style.bottom = '0px';
      root.style.width = `${vw}px`;
      root.style.maxHeight = `${Math.min(Math.floor(vh * 0.7), vh - 8)}px`;
      return;
    }

    const width = 300;
    const estimatedHeight = 360;
    let left = anchor?.x ?? 24;
    let top = anchor?.y ?? 24;
    left = Math.max(8, Math.min(left, vw - width - 8));
    top = Math.max(8, Math.min(top, vh - estimatedHeight - 8));
    root.style.left = `${left}px`;
    root.style.top = `${top}px`;
    root.style.width = `${width}px`;
  };

  return {
    root,
    open(edgeId, label, anchor) {
      render(edgeId, label);
      root.hidden = false;
      position(anchor);
    },
    close() {
      root.hidden = true;
      currentEdgeId = null;
    },
    destroy() {
      root.remove();
    },
  };
}
