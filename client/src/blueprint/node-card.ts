import {
  defaultConfigForType,
  getComponentMeta,
  type ComponentNode,
  type ComponentType,
  type PressureLevel,
} from '@sdq/shared';

const CATEGORY_BORDER: Record<string, string> = {
  client: '#60A5FA',
  edge: '#A78BFA',
  traffic: '#C084FC',
  compute: '#34D399',
  data: '#FBBF24',
  messaging: '#FB923C',
  observability: '#94A3B8',
  security: '#F472B6',
};

export interface NodeCardCallbacks {
  onSelect(id: string): void;
  onReplicasChange(id: string, replicas: number): void;
  onDragStart(id: string, ev: PointerEvent): void;
  onOutHandleDown(id: string, ev: PointerEvent): void;
  onOpenDetails?(id: string): void;
  onDelete?(id: string): void;
}

export interface NodeCardHandle {
  root: HTMLElement;
  setSelected(selected: boolean): void;
  setPressure(level: PressureLevel | null, latencyMs?: number | null, reason?: string | null): void;
  sync(node: ComponentNode): void;
  destroy(): void;
}

function injectNodeCardStyles(): void {
  if (document.getElementById('sdq-node-card-styles')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'sdq-node-card-styles';
  style.textContent = `
    .sdq-node {
      position: absolute;
      min-width: 140px;
      background: var(--sdq-bg-elevated);
      border: 2px solid var(--sdq-text-subtle);
      border-radius: var(--sdq-radius-sm);
      color: var(--sdq-text);
      font-family: var(--sdq-font-mono);
      font-size: 12px;
      box-shadow: var(--sdq-shadow);
      cursor: grab;
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
      z-index: 2;
    }
    .sdq-node--selected {
      box-shadow: 0 0 0 2px var(--sdq-accent), 0 0 18px var(--sdq-accent-muted);
    }
    .sdq-node--pressure-warn { outline: 2px solid var(--sdq-warning); }
    .sdq-node--pressure-hot { outline: 2px solid var(--sdq-danger); animation: sdq-pulse 1s ease-in-out infinite; }
    @keyframes sdq-pulse {
      50% { outline-color: var(--sdq-danger); }
    }
    .sdq-node__load-label {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-align: center;
      padding: 2px 6px 0;
    }
    .sdq-node__load-label--hot { color: var(--sdq-danger); }
    .sdq-node__load-label--warn { color: var(--sdq-warning); }
    .sdq-node__load-reason {
      font-size: 9px;
      font-weight: 500;
      letter-spacing: 0;
      text-align: center;
      padding: 0 8px 2px;
      color: var(--sdq-text-muted);
      line-height: 1.25;
    }
    .sdq-node__ms-bar {
      display: block;
      margin: 4px 10px 6px;
      height: 14px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 700;
      line-height: 14px;
      text-align: center;
      color: var(--sdq-bg);
    }
    .sdq-node__ms-bar--ok { background: var(--sdq-success); }
    .sdq-node__ms-bar--warn { background: var(--sdq-warning); }
    .sdq-node__ms-bar--hot { background: var(--sdq-danger); color: var(--sdq-bg); }
    .sdq-node__body { padding: 10px 12px 6px; display: flex; gap: 8px; align-items: flex-start; }
    .sdq-node__label { font-weight: 700; flex: 1; }
    .sdq-node__badge {
      font-size: 10px; background: rgba(0,0,0,0.35); padding: 2px 6px; border-radius: 4px;
    }
    .sdq-node__footer {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 6px 8px 8px; border-top: 1px solid var(--sdq-border);
    }
    .sdq-node__rep-btn {
      width: 22px; height: 22px; border-radius: 4px; border: 1px solid var(--sdq-border-strong);
      background: var(--sdq-bg-surface); color: var(--sdq-text); cursor: pointer; font-weight: 700;
    }
    .sdq-node__handle {
      position: absolute; width: 12px; height: 12px; border-radius: 50%;
      background: var(--sdq-accent); border: 2px solid var(--sdq-bg); top: 50%; transform: translateY(-50%);
      z-index: 3;
      touch-action: none;
    }
    .sdq-node__handle--in { left: -7px; }
    .sdq-node__handle--out { right: -7px; }
    .sdq-node__handle::after {
      content: "";
      position: absolute;
      inset: -10px;
    }
    .sdq-node__delete {
      display: none;
      align-items: center;
      justify-content: center;
      min-width: 36px;
      min-height: 36px;
      margin-left: 4px;
      border-radius: var(--sdq-radius-sm);
      border: 1px solid var(--sdq-danger);
      background: rgba(248, 113, 113, 0.12);
      color: var(--sdq-danger);
      cursor: pointer;
      font-size: 14px;
      font-weight: 700;
    }
    .sdq-node__details {
      display: none;
      align-items: center;
      justify-content: center;
      min-width: 28px;
      min-height: 28px;
      margin-left: auto;
      padding: 0;
      border-radius: var(--sdq-radius-sm);
      border: 1px solid var(--sdq-border-strong);
      background: var(--sdq-bg-surface);
      color: var(--sdq-text-muted);
      cursor: pointer;
      touch-action: manipulation;
    }
    .sdq-node__details svg {
      width: 14px;
      height: 14px;
      display: block;
      pointer-events: none;
    }
    .sdq-node__details:hover {
      color: var(--sdq-accent);
      border-color: var(--sdq-accent-border);
    }
    .sdq-node--selected .sdq-node__delete,
    .sdq-node--selected .sdq-node__details {
      display: inline-flex;
    }
  `;
  document.head.append(style);
}

export function createNodeCard(node: ComponentNode, callbacks: NodeCardCallbacks): NodeCardHandle {
  injectNodeCardStyles();
  const meta = getComponentMeta(node.type);
  const border = CATEGORY_BORDER[meta.category] ?? 'var(--sdq-text-subtle)';

  const root = document.createElement('div');
  root.className = 'sdq-node';
  root.dataset.nodeId = node.id;
  root.dataset.testid = `blueprint-node-${node.id}`;
  root.style.borderColor = border;
  root.style.left = `${node.position.x}px`;
  root.style.top = `${node.position.y}px`;

  const handleIn = document.createElement('div');
  handleIn.className = 'sdq-node__handle sdq-node__handle--in';
  handleIn.dataset.handle = 'in';
  const handleOut = document.createElement('div');
  handleOut.className = 'sdq-node__handle sdq-node__handle--out';
  handleOut.dataset.handle = 'out';

  const body = document.createElement('div');
  body.className = 'sdq-node__body';
  const labelEl = document.createElement('div');
  labelEl.className = 'sdq-node__label';
  const badgeEl = document.createElement('div');
  badgeEl.className = 'sdq-node__badge';
  badgeEl.hidden = true;
  body.append(labelEl, badgeEl);

  const loadLabel = document.createElement('div');
  loadLabel.className = 'sdq-node__load-label';
  loadLabel.dataset.testid = 'load-label';
  loadLabel.hidden = true;

  const loadReason = document.createElement('div');
  loadReason.className = 'sdq-node__load-reason';
  loadReason.dataset.testid = 'load-reason';
  loadReason.hidden = true;

  const msBar = document.createElement('div');
  msBar.className = 'sdq-node__ms-bar';
  msBar.dataset.testid = 'ms-bar';
  msBar.hidden = true;

  const footer = document.createElement('div');
  footer.className = 'sdq-node__footer';
  const minus = document.createElement('button');
  minus.type = 'button';
  minus.className = 'sdq-node__rep-btn';
  minus.textContent = '−';
  minus.setAttribute('aria-label', 'Diminuir replicas');
  const repsLabel = document.createElement('span');
  repsLabel.dataset.testid = `replicas-${node.id}`;
  const plus = document.createElement('button');
  plus.type = 'button';
  plus.className = 'sdq-node__rep-btn';
  plus.textContent = '+';
  plus.setAttribute('aria-label', 'Aumentar replicas');
  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'sdq-node__delete';
  del.setAttribute('data-testid', `node-delete-${node.id}`);
  del.setAttribute('aria-label', 'Remover componente');
  del.textContent = '×';
  const details = document.createElement('button');
  details.type = 'button';
  details.className = 'sdq-node__details';
  details.setAttribute('data-testid', `node-details-${node.id}`);
  details.setAttribute('aria-label', 'Configurações do componente');
  details.setAttribute('title', 'Configurações do componente');
  details.innerHTML =
    '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/><path d="M8 9h2"/></svg>';
  footer.append(minus, repsLabel, plus, details, del);

  root.append(handleIn, handleOut, body, loadLabel, loadReason, msBar, footer);

  const sync = (n: ComponentNode): void => {
    const reps = n.replicas ?? 1;
    root.style.left = `${n.position.x}px`;
    root.style.top = `${n.position.y}px`;
    const suffix = n.type === 'app_server' && reps > 1 ? ` x${reps}` : '';
    labelEl.textContent = `${n.label}${suffix}`;
    repsLabel.textContent = `${reps} rep${reps === 1 ? '' : 's'}`;

    if (n.config?.kind === 'sql_db' && n.config.shardCount > 1) {
      badgeEl.hidden = false;
      badgeEl.textContent = `${n.config.shardCount}sh`;
    } else {
      badgeEl.hidden = true;
    }
  };
  sync(node);

  root.addEventListener('pointerdown', (ev) => {
    const t = ev.target as HTMLElement;
    if (
      t.closest('.sdq-node__rep-btn') ||
      t.closest('.sdq-node__delete') ||
      t.closest('.sdq-node__details')
    ) {
      return;
    }
    if (t.dataset.handle === 'out' || t.closest('[data-handle="out"]')) {
      ev.preventDefault();
      ev.stopPropagation();
      callbacks.onOutHandleDown(node.id, ev);
      return;
    }
    if (t.dataset.handle === 'in' || t.closest('[data-handle="in"]')) {
      return;
    }
    ev.preventDefault();
    callbacks.onSelect(node.id);
    callbacks.onDragStart(node.id, ev);
  });

  minus.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const current = Number.parseInt(repsLabel.textContent ?? '1', 10) || 1;
    callbacks.onReplicasChange(node.id, Math.max(1, current - 1));
  });
  plus.addEventListener('click', (ev) => {
    ev.stopPropagation();
    const current = Number.parseInt(repsLabel.textContent ?? '1', 10) || 1;
    callbacks.onReplicasChange(node.id, current + 1);
  });
  del.addEventListener('click', (ev) => {
    ev.stopPropagation();
    callbacks.onDelete?.(node.id);
  });
  details.addEventListener('click', (ev) => {
    ev.stopPropagation();
    callbacks.onOpenDetails?.(node.id);
  });

  return {
    root,
    setSelected(selected) {
      root.classList.toggle('sdq-node--selected', selected);
    },
    setPressure(level, latencyMs = null, reason = null) {
      root.classList.remove('sdq-node--pressure-warn', 'sdq-node--pressure-hot');
      loadLabel.classList.remove('sdq-node__load-label--hot', 'sdq-node__load-label--warn');
      msBar.classList.remove('sdq-node__ms-bar--ok', 'sdq-node__ms-bar--warn', 'sdq-node__ms-bar--hot');

      if (level === null) {
        loadLabel.hidden = true;
        loadLabel.textContent = '';
        loadLabel.removeAttribute('title');
        loadReason.hidden = true;
        loadReason.textContent = '';
        msBar.hidden = true;
        msBar.textContent = '';
        return;
      }

      if (level === 'warn') {
        root.classList.add('sdq-node--pressure-warn');
        loadLabel.hidden = false;
        loadLabel.textContent = 'QUEUEING';
        loadLabel.classList.add('sdq-node__load-label--warn');
      } else if (level === 'hot') {
        root.classList.add('sdq-node--pressure-hot');
        loadLabel.hidden = false;
        loadLabel.textContent = 'BOTTLENECK';
        loadLabel.classList.add('sdq-node__load-label--hot');
      } else {
        loadLabel.hidden = true;
        loadLabel.textContent = '';
        loadLabel.removeAttribute('title');
      }

      const reasonText = reason?.trim() ?? '';
      if ((level === 'warn' || level === 'hot') && reasonText) {
        loadReason.hidden = false;
        loadReason.textContent = reasonText;
        loadLabel.title = reasonText;
      } else {
        loadReason.hidden = true;
        loadReason.textContent = '';
        if (level === 'ok') {
          loadLabel.removeAttribute('title');
        }
      }

      msBar.hidden = false;
      msBar.classList.add(`sdq-node__ms-bar--${level}`);
      msBar.textContent = latencyMs != null ? `${latencyMs}ms` : '';
    },
    sync,
    destroy() {
      root.remove();
    },
  };
}

export function buildNewNode(
  type: ComponentType,
  position: { x: number; y: number },
  id: string,
): ComponentNode {
  const meta = getComponentMeta(type);
  const config = defaultConfigForType(type);
  return {
    id,
    type,
    label: meta.label,
    replicas: 1,
    position: { x: position.x, y: position.y },
    ...(config ? { config } : {}),
  };
}
