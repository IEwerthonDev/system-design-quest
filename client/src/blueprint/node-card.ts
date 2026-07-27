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
      background: rgba(15, 30, 55, 0.92);
      border: 2px solid #64748b;
      border-radius: 8px;
      color: #e2e8f0;
      font-family: ui-monospace, "Cascadia Code", "SF Mono", Menlo, monospace;
      font-size: 12px;
      box-shadow: 0 0 12px rgba(0,0,0,0.35);
      cursor: grab;
      user-select: none;
      z-index: 2;
    }
    .sdq-node--selected {
      box-shadow: 0 0 0 2px #fff, 0 0 18px rgba(255,255,255,0.25);
    }
    .sdq-node--pressure-warn { outline: 2px solid #FBBF24; }
    .sdq-node--pressure-hot { outline: 2px solid #F87171; animation: sdq-pulse 1s ease-in-out infinite; }
    @keyframes sdq-pulse {
      50% { outline-color: #ef4444; }
    }
    .sdq-node__load-label {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-align: center;
      padding: 2px 6px 0;
    }
    .sdq-node__load-label--hot { color: #F87171; }
    .sdq-node__load-label--warn { color: #FBBF24; }
    .sdq-node__load-reason {
      font-size: 9px;
      font-weight: 500;
      letter-spacing: 0;
      text-align: center;
      padding: 0 8px 2px;
      color: #94a3b8;
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
      color: #0f172a;
    }
    .sdq-node__ms-bar--ok { background: #34D399; }
    .sdq-node__ms-bar--warn { background: #FBBF24; }
    .sdq-node__ms-bar--hot { background: #F87171; color: #1e1030; }
    .sdq-node__body { padding: 10px 12px 6px; display: flex; gap: 8px; align-items: flex-start; }
    .sdq-node__label { font-weight: 700; flex: 1; }
    .sdq-node__badge {
      font-size: 10px; background: rgba(0,0,0,0.35); padding: 2px 6px; border-radius: 4px;
    }
    .sdq-node__footer {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 6px 8px 8px; border-top: 1px solid rgba(148,163,184,0.2);
    }
    .sdq-node__rep-btn {
      width: 22px; height: 22px; border-radius: 4px; border: 1px solid rgba(148,163,184,0.4);
      background: rgba(30,41,59,0.9); color: #e2e8f0; cursor: pointer; font-weight: 700;
    }
    .sdq-node__handle {
      position: absolute; width: 12px; height: 12px; border-radius: 50%;
      background: #e2e8f0; border: 2px solid #0f1e37; top: 50%; transform: translateY(-50%);
      z-index: 3;
    }
    .sdq-node__handle--in { left: -7px; }
    .sdq-node__handle--out { right: -7px; }
  `;
  document.head.append(style);
}

export function createNodeCard(node: ComponentNode, callbacks: NodeCardCallbacks): NodeCardHandle {
  injectNodeCardStyles();
  const meta = getComponentMeta(node.type);
  const border = CATEGORY_BORDER[meta.category] ?? '#64748b';

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
  footer.append(minus, repsLabel, plus);

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
    if (t.closest('.sdq-node__rep-btn')) {
      return;
    }
    if (t.dataset.handle === 'out') {
      callbacks.onOutHandleDown(node.id, ev);
      return;
    }
    if (t.dataset.handle === 'in') {
      return;
    }
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
