import {
  getComponentMeta,
  type ComponentConfig,
  type ComponentNode,
  type PartitioningStrategy,
} from '@sdq/shared';

export interface ConfigPopoverCallbacks {
  onClose(): void;
  onNotesChange(id: string, notes: string): void;
  onConfigChange(id: string, config: ComponentConfig): void;
}

export interface ConfigPopover {
  root: HTMLElement;
  open(node: ComponentNode, anchor: DOMRect): void;
  close(): void;
  destroy(): void;
}

const STRATEGIES: PartitioningStrategy[] = ['hash', 'range', 'geographic', 'list'];

function injectStyles(): void {
  if (document.getElementById('sdq-config-popover-styles')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'sdq-config-popover-styles';
  style.textContent = `
    .sdq-config-popover {
      position: fixed;
      width: 300px;
      z-index: 40;
      background: rgba(15, 30, 60, 0.98);
      border: 1px solid rgba(148,163,184,0.35);
      border-radius: 10px;
      color: #e2e8f0;
      font-family: ui-monospace, Menlo, monospace;
      font-size: 12px;
      padding: 12px 14px 14px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.45);
    }
    .sdq-config-popover[hidden] { display: none !important; }
    .sdq-config-popover__header {
      display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
    }
    .sdq-config-popover__dot {
      width: 8px; height: 8px; border-radius: 50%; background: #FBBF24;
    }
    .sdq-config-popover__title { font-weight: 700; flex: 1; }
    .sdq-config-popover__close {
      background: transparent; border: none; color: #94a3b8; cursor: pointer; font-size: 16px;
    }
    .sdq-config-popover__desc { color: #94a3b8; margin-bottom: 12px; line-height: 1.4; }
    .sdq-config-popover__field { margin-bottom: 10px; }
    .sdq-config-popover__field label {
      display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px; letter-spacing: 0.04em;
    }
    .sdq-config-popover input[type="range"] { width: 100%; }
    .sdq-config-popover select, .sdq-config-popover input[type="text"], .sdq-config-popover textarea {
      width: 100%; background: rgba(0,0,0,0.35); border: 1px solid rgba(148,163,184,0.3);
      color: #e2e8f0; border-radius: 6px; padding: 6px 8px; font: inherit;
    }
    .sdq-config-popover textarea { min-height: 64px; resize: vertical; }
    .sdq-config-popover__notes-title { font-size: 11px; margin: 12px 0 6px; letter-spacing: 0.04em; }
    .sdq-config-popover__hint { font-size: 10px; color: #64748b; margin-top: 8px; }
  `;
  document.head.append(style);
}

export function mountConfigPopover(
  host: HTMLElement,
  callbacks: ConfigPopoverCallbacks,
): ConfigPopover {
  injectStyles();
  const root = document.createElement('div');
  root.className = 'sdq-config-popover';
  root.setAttribute('data-testid', 'config-popover');
  root.hidden = true;
  host.append(root);

  let currentId: string | null = null;

  const render = (node: ComponentNode): void => {
    currentId = node.id;
    const meta = getComponentMeta(node.type);
    root.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'sdq-config-popover__header';
    const dot = document.createElement('span');
    dot.className = 'sdq-config-popover__dot';
    const title = document.createElement('span');
    title.className = 'sdq-config-popover__title';
    title.textContent = meta.label;
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'sdq-config-popover__close';
    close.setAttribute('aria-label', 'Fechar');
    close.textContent = '×';
    close.addEventListener('click', () => callbacks.onClose());
    header.append(dot, title, close);

    const desc = document.createElement('p');
    desc.className = 'sdq-config-popover__desc';
    desc.textContent = meta.description;

    root.append(header, desc);

    if (node.config?.kind === 'cache' || node.config?.kind === 'cdn') {
      const field = document.createElement('div');
      field.className = 'sdq-config-popover__field';
      const label = document.createElement('label');
      const name = document.createElement('span');
      name.textContent = 'HIT RATE';
      const value = document.createElement('span');
      value.textContent = `${node.config.hitRate}%`;
      label.append(name, value);
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '0';
      slider.max = '100';
      slider.value = String(node.config.hitRate);
      slider.setAttribute('data-testid', 'config-hit-rate');
      slider.addEventListener('input', () => {
        const hitRate = Number(slider.value);
        value.textContent = `${hitRate}%`;
        callbacks.onConfigChange(node.id, { kind: node.config!.kind, hitRate });
      });
      field.append(label, slider);
      root.append(field);
    }

    if (node.config?.kind === 'sql_db') {
      const cfg = node.config;
      const shardField = document.createElement('div');
      shardField.className = 'sdq-config-popover__field';
      const shardLabel = document.createElement('label');
      const shardName = document.createElement('span');
      shardName.textContent = 'SHARD COUNT';
      const shardVal = document.createElement('span');
      shardVal.textContent = String(cfg.shardCount);
      shardLabel.append(shardName, shardVal);
      const shardSlider = document.createElement('input');
      shardSlider.type = 'range';
      shardSlider.min = '1';
      shardSlider.max = '256';
      shardSlider.value = String(cfg.shardCount);
      shardSlider.setAttribute('data-testid', 'config-shard-count');
      shardSlider.addEventListener('input', () => {
        const shardCount = Number(shardSlider.value);
        shardVal.textContent = String(shardCount);
        callbacks.onConfigChange(node.id, { ...cfg, shardCount });
      });
      shardField.append(shardLabel, shardSlider);

      const stratField = document.createElement('div');
      stratField.className = 'sdq-config-popover__field';
      const stratLabel = document.createElement('label');
      stratLabel.innerHTML = '<span>PARTITIONING STRATEGY</span>';
      const select = document.createElement('select');
      select.setAttribute('data-testid', 'config-partitioning');
      for (const s of STRATEGIES) {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s === 'geographic' ? 'Geographic / spatial' : s;
        if (s === cfg.partitioningStrategy) {
          opt.selected = true;
        }
        select.append(opt);
      }
      select.addEventListener('change', () => {
        callbacks.onConfigChange(node.id, {
          ...cfg,
          partitioningStrategy: select.value as PartitioningStrategy,
        });
      });
      stratField.append(stratLabel, select);

      const keyField = document.createElement('div');
      keyField.className = 'sdq-config-popover__field';
      const keyLabel = document.createElement('label');
      keyLabel.innerHTML = '<span>PARTITION KEY (OPTIONAL)</span>';
      const keyInput = document.createElement('input');
      keyInput.type = 'text';
      keyInput.placeholder = 'e.g. user_id';
      keyInput.value = cfg.partitionKey ?? '';
      keyInput.setAttribute('data-testid', 'config-partition-key');
      keyInput.addEventListener('change', () => {
        callbacks.onConfigChange(node.id, {
          ...cfg,
          partitionKey: keyInput.value || undefined,
        });
      });
      keyField.append(keyLabel, keyInput);

      const skewField = document.createElement('div');
      skewField.className = 'sdq-config-popover__field';
      const skewLabel = document.createElement('label');
      const skewName = document.createElement('span');
      skewName.textContent = 'KEY SKEW / HOT PARTITION';
      const skewVal = document.createElement('span');
      skewVal.textContent = `${cfg.keySkew}%`;
      skewLabel.append(skewName, skewVal);
      const skewSlider = document.createElement('input');
      skewSlider.type = 'range';
      skewSlider.min = '0';
      skewSlider.max = '100';
      skewSlider.value = String(cfg.keySkew);
      skewSlider.setAttribute('data-testid', 'config-key-skew');
      skewSlider.addEventListener('input', () => {
        const keySkew = Number(skewSlider.value);
        skewVal.textContent = `${keySkew}%`;
        callbacks.onConfigChange(node.id, { ...cfg, keySkew });
      });
      skewField.append(skewLabel, skewSlider);

      root.append(shardField, stratField, keyField, skewField);
    }

    const notesTitle = document.createElement('div');
    notesTitle.className = 'sdq-config-popover__notes-title';
    notesTitle.textContent = 'IMPLEMENTATION NOTES';
    const notes = document.createElement('textarea');
    notes.setAttribute('data-testid', 'config-notes');
    notes.placeholder = 'e.g. cache-aside; 5m TTL; LRU eviction; invalidate on write';
    notes.value = node.implementationNotes ?? node.note ?? '';
    notes.addEventListener('change', () => {
      callbacks.onNotesChange(node.id, notes.value);
    });
    const hint = document.createElement('p');
    hint.className = 'sdq-config-popover__hint';
    hint.textContent = 'The AI judges read these notes when scoring your design.';

    root.append(notesTitle, notes, hint);
  };

  return {
    root,
    open(node, anchor) {
      render(node);
      root.hidden = false;
      const top = Math.min(window.innerHeight - 320, anchor.bottom + 8);
      const left = Math.min(window.innerWidth - 320, Math.max(8, anchor.left));
      root.style.top = `${top}px`;
      root.style.left = `${left}px`;
    },
    close() {
      root.hidden = true;
      currentId = null;
    },
    destroy() {
      root.remove();
    },
  };
}
