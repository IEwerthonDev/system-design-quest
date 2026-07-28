import {
  getComponentMeta,
  type ComponentConfig,
  type ComponentNode,
  type LbAlgorithm,
  type MqDurability,
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
const LB_ALGORITHMS: LbAlgorithm[] = ['round_robin', 'least_conn', 'ip_hash'];
const MQ_DURABILITIES: MqDurability[] = ['memory', 'disk'];

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
      background: var(--sdq-bg-elevated);
      border: 1px solid rgba(148,163,184,0.35);
      border-radius: var(--sdq-radius);
      color: var(--sdq-text);
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
      background: transparent; border: none; color: var(--sdq-text-muted); cursor: pointer; font-size: 16px;
    }
    .sdq-config-popover__desc { color: var(--sdq-text-muted); margin-bottom: 12px; line-height: 1.4; }
    .sdq-config-popover__field { margin-bottom: 10px; }
    .sdq-config-popover__field label {
      display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px; letter-spacing: 0.04em;
    }
    .sdq-config-popover input[type="range"] { width: 100%; }
    .sdq-config-popover select, .sdq-config-popover input[type="text"], .sdq-config-popover textarea {
      width: 100%; background: rgba(0,0,0,0.35); border: 1px solid rgba(148,163,184,0.3);
      color: var(--sdq-text); border-radius: var(--sdq-radius-sm); padding: 6px 8px; font: inherit;
    }
    .sdq-config-popover textarea { min-height: 64px; resize: vertical; }
    .sdq-config-popover__notes-title { font-size: 11px; margin: 12px 0 6px; letter-spacing: 0.04em; }
    .sdq-config-popover__hint { font-size: 10px; color: var(--sdq-text-subtle); margin-top: 8px; }
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

    if (node.config?.kind === 'cache') {
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
        callbacks.onConfigChange(node.id, { kind: 'cache', hitRate });
      });
      field.append(label, slider);
      root.append(field);
    }

    if (node.config?.kind === 'cdn') {
      const cfg = node.config;
      const hitField = document.createElement('div');
      hitField.className = 'sdq-config-popover__field';
      const hitLabel = document.createElement('label');
      const hitName = document.createElement('span');
      hitName.textContent = 'HIT RATE';
      const hitVal = document.createElement('span');
      hitVal.textContent = `${cfg.hitRate}%`;
      hitLabel.append(hitName, hitVal);
      const hitSlider = document.createElement('input');
      hitSlider.type = 'range';
      hitSlider.min = '0';
      hitSlider.max = '100';
      hitSlider.value = String(cfg.hitRate);
      hitSlider.setAttribute('data-testid', 'config-hit-rate');
      hitSlider.addEventListener('input', () => {
        const hitRate = Number(hitSlider.value);
        hitVal.textContent = `${hitRate}%`;
        callbacks.onConfigChange(node.id, { ...cfg, hitRate });
      });
      hitField.append(hitLabel, hitSlider);

      const ttlField = document.createElement('div');
      ttlField.className = 'sdq-config-popover__field';
      const ttlLabel = document.createElement('label');
      const ttlName = document.createElement('span');
      ttlName.textContent = 'TTL (SECONDS)';
      const ttlVal = document.createElement('span');
      ttlVal.textContent = String(cfg.ttlSeconds);
      ttlLabel.append(ttlName, ttlVal);
      const ttlSlider = document.createElement('input');
      ttlSlider.type = 'range';
      ttlSlider.min = '1';
      ttlSlider.max = '86400';
      ttlSlider.value = String(cfg.ttlSeconds);
      ttlSlider.setAttribute('data-testid', 'config-cdn-ttl');
      ttlSlider.addEventListener('input', () => {
        const ttlSeconds = Number(ttlSlider.value);
        ttlVal.textContent = String(ttlSeconds);
        callbacks.onConfigChange(node.id, { ...cfg, ttlSeconds });
      });
      ttlField.append(ttlLabel, ttlSlider);
      root.append(hitField, ttlField);
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

    if (node.config?.kind === 'mq') {
      const cfg = node.config;
      const durField = document.createElement('div');
      durField.className = 'sdq-config-popover__field';
      const durLabel = document.createElement('label');
      durLabel.innerHTML = '<span>DURABILITY</span>';
      const durSelect = document.createElement('select');
      durSelect.setAttribute('data-testid', 'config-mq-durability');
      for (const d of MQ_DURABILITIES) {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        if (d === cfg.durability) {
          opt.selected = true;
        }
        durSelect.append(opt);
      }
      durSelect.addEventListener('change', () => {
        callbacks.onConfigChange(node.id, {
          ...cfg,
          durability: durSelect.value as MqDurability,
        });
      });
      durField.append(durLabel, durSelect);

      const partField = document.createElement('div');
      partField.className = 'sdq-config-popover__field';
      const partLabel = document.createElement('label');
      const partName = document.createElement('span');
      partName.textContent = 'PARTITION COUNT';
      const partVal = document.createElement('span');
      partVal.textContent = String(cfg.partitionCount);
      partLabel.append(partName, partVal);
      const partSlider = document.createElement('input');
      partSlider.type = 'range';
      partSlider.min = '1';
      partSlider.max = '256';
      partSlider.value = String(cfg.partitionCount);
      partSlider.setAttribute('data-testid', 'config-mq-partitions');
      partSlider.addEventListener('input', () => {
        const partitionCount = Number(partSlider.value);
        partVal.textContent = String(partitionCount);
        callbacks.onConfigChange(node.id, { ...cfg, partitionCount });
      });
      partField.append(partLabel, partSlider);
      root.append(durField, partField);
    }

    if (node.config?.kind === 'ws') {
      const cfg = node.config;
      const field = document.createElement('div');
      field.className = 'sdq-config-popover__field';
      const label = document.createElement('label');
      const name = document.createElement('span');
      name.textContent = 'FAN-OUT LIMIT';
      const value = document.createElement('span');
      value.textContent = String(cfg.fanOutLimit);
      label.append(name, value);
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '1';
      slider.max = '100000';
      slider.value = String(cfg.fanOutLimit);
      slider.setAttribute('data-testid', 'config-ws-fanout');
      slider.addEventListener('input', () => {
        const fanOutLimit = Number(slider.value);
        value.textContent = String(fanOutLimit);
        callbacks.onConfigChange(node.id, { ...cfg, fanOutLimit });
      });
      field.append(label, slider);
      root.append(field);
    }

    if (node.config?.kind === 'lb') {
      const cfg = node.config;
      const field = document.createElement('div');
      field.className = 'sdq-config-popover__field';
      const label = document.createElement('label');
      label.innerHTML = '<span>ALGORITHM</span>';
      const select = document.createElement('select');
      select.setAttribute('data-testid', 'config-lb-algorithm');
      for (const algo of LB_ALGORITHMS) {
        const opt = document.createElement('option');
        opt.value = algo;
        opt.textContent = algo;
        if (algo === cfg.algorithm) {
          opt.selected = true;
        }
        select.append(opt);
      }
      select.addEventListener('change', () => {
        callbacks.onConfigChange(node.id, {
          ...cfg,
          algorithm: select.value as LbAlgorithm,
        });
      });
      field.append(label, select);
      root.append(field);
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
