import {
  getComponentMeta,
  type AccessPattern,
  type ComponentConfig,
  type ComponentNode,
  type DbTopologyRole,
  type LbAlgorithm,
  type MqDurability,
  type PartitioningStrategy,
} from '@sdq/shared';
import { LOCALE_CHANGE_EVENT } from '../i18n/locale';
import { t } from '../i18n/t';

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
const ACCESS_PATTERNS: AccessPattern[] = ['read', 'write', 'read_write'];
const TOPOLOGY_ROLES: DbTopologyRole[] = ['primary', 'replica', 'standalone'];

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

function fieldLabel(text: string, valueText?: string): HTMLLabelElement {
  const label = document.createElement('label');
  const name = document.createElement('span');
  name.textContent = text;
  label.append(name);
  if (valueText !== undefined) {
    const value = document.createElement('span');
    value.textContent = valueText;
    label.append(value);
  }
  return label;
}

function appendAccessTopologyFields(
  root: HTMLElement,
  cfg: { accessPattern: AccessPattern; topologyRole: DbTopologyRole },
  onPatch: (patch: {
    accessPattern?: AccessPattern;
    topologyRole?: DbTopologyRole;
  }) => void,
): void {
  const accessField = document.createElement('div');
  accessField.className = 'sdq-config-popover__field';
  accessField.append(fieldLabel(t('config.accessPattern')));
  const accessSelect = document.createElement('select');
  accessSelect.setAttribute('data-testid', 'config-access-pattern');
  for (const pattern of ACCESS_PATTERNS) {
    const opt = document.createElement('option');
    opt.value = pattern;
    opt.textContent = t(`config.access.${pattern}`);
    if (pattern === cfg.accessPattern) {
      opt.selected = true;
    }
    accessSelect.append(opt);
  }
  accessSelect.addEventListener('change', () => {
    onPatch({ accessPattern: accessSelect.value as AccessPattern });
  });
  accessField.append(accessSelect);

  const topoField = document.createElement('div');
  topoField.className = 'sdq-config-popover__field';
  topoField.append(fieldLabel(t('config.topologyRole')));
  const topoSelect = document.createElement('select');
  topoSelect.setAttribute('data-testid', 'config-topology-role');
  for (const role of TOPOLOGY_ROLES) {
    const opt = document.createElement('option');
    opt.value = role;
    opt.textContent = t(`config.topology.${role}`);
    if (role === cfg.topologyRole) {
      opt.selected = true;
    }
    topoSelect.append(opt);
  }
  topoSelect.addEventListener('change', () => {
    onPatch({ topologyRole: topoSelect.value as DbTopologyRole });
  });
  topoField.append(topoSelect);

  root.append(accessField, topoField);
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

  let currentNode: ComponentNode | null = null;
  let anchorRect: DOMRect | null = null;

  const onLocaleChange = (): void => {
    if (currentNode && !root.hidden) {
      render(currentNode);
      if (anchorRect) {
        position(anchorRect);
      }
    }
  };

  const position = (anchor: DOMRect): void => {
    const top = Math.min(window.innerHeight - 320, anchor.bottom + 8);
    const left = Math.min(window.innerWidth - 320, Math.max(8, anchor.left));
    root.style.top = `${top}px`;
    root.style.left = `${left}px`;
  };

  const render = (node: ComponentNode): void => {
    currentNode = node;
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
    close.setAttribute('aria-label', t('config.close'));
    close.textContent = '×';
    close.addEventListener('click', () => callbacks.onClose());
    header.append(dot, title, close);

    const desc = document.createElement('p');
    desc.className = 'sdq-config-popover__desc';
    desc.textContent = meta.description;

    root.append(header, desc);

    if (node.config?.kind === 'cache') {
      let cfg = node.config;
      const field = document.createElement('div');
      field.className = 'sdq-config-popover__field';
      const label = fieldLabel(t('config.hitRate'), `${cfg.hitRate}%`);
      const value = label.lastElementChild as HTMLSpanElement;
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '0';
      slider.max = '100';
      slider.value = String(cfg.hitRate);
      slider.setAttribute('data-testid', 'config-hit-rate');
      slider.addEventListener('input', () => {
        const hitRate = Number(slider.value);
        value.textContent = `${hitRate}%`;
        cfg = { kind: 'cache', hitRate };
        currentNode = { ...node, config: cfg };
        callbacks.onConfigChange(node.id, cfg);
      });
      field.append(label, slider);
      root.append(field);
    }

    if (node.config?.kind === 'cdn') {
      let cfg = { ...node.config };
      const hitField = document.createElement('div');
      hitField.className = 'sdq-config-popover__field';
      const hitLabel = fieldLabel(t('config.hitRate'), `${cfg.hitRate}%`);
      const hitVal = hitLabel.lastElementChild as HTMLSpanElement;
      const hitSlider = document.createElement('input');
      hitSlider.type = 'range';
      hitSlider.min = '0';
      hitSlider.max = '100';
      hitSlider.value = String(cfg.hitRate);
      hitSlider.setAttribute('data-testid', 'config-hit-rate');
      hitSlider.addEventListener('input', () => {
        const hitRate = Number(hitSlider.value);
        hitVal.textContent = `${hitRate}%`;
        cfg = { ...cfg, hitRate };
        currentNode = { ...node, config: cfg };
        callbacks.onConfigChange(node.id, cfg);
      });
      hitField.append(hitLabel, hitSlider);

      const ttlField = document.createElement('div');
      ttlField.className = 'sdq-config-popover__field';
      const ttlLabel = fieldLabel(t('config.ttl'), String(cfg.ttlSeconds));
      const ttlVal = ttlLabel.lastElementChild as HTMLSpanElement;
      const ttlSlider = document.createElement('input');
      ttlSlider.type = 'range';
      ttlSlider.min = '1';
      ttlSlider.max = '86400';
      ttlSlider.value = String(cfg.ttlSeconds);
      ttlSlider.setAttribute('data-testid', 'config-cdn-ttl');
      ttlSlider.addEventListener('input', () => {
        const ttlSeconds = Number(ttlSlider.value);
        ttlVal.textContent = String(ttlSeconds);
        cfg = { ...cfg, ttlSeconds };
        currentNode = { ...node, config: cfg };
        callbacks.onConfigChange(node.id, cfg);
      });
      ttlField.append(ttlLabel, ttlSlider);
      root.append(hitField, ttlField);
    }

    if (node.config?.kind === 'sql_db') {
      let cfg = { ...node.config };
      const patchSql = (patch: Partial<typeof cfg>): void => {
        cfg = { ...cfg, ...patch };
        currentNode = { ...node, config: cfg };
        callbacks.onConfigChange(node.id, cfg);
      };

      appendAccessTopologyFields(root, cfg, patchSql);

      const shardField = document.createElement('div');
      shardField.className = 'sdq-config-popover__field';
      const shardLabel = fieldLabel(t('config.shardCount'), String(cfg.shardCount));
      const shardVal = shardLabel.lastElementChild as HTMLSpanElement;
      const shardSlider = document.createElement('input');
      shardSlider.type = 'range';
      shardSlider.min = '1';
      shardSlider.max = '256';
      shardSlider.value = String(cfg.shardCount);
      shardSlider.setAttribute('data-testid', 'config-shard-count');
      shardSlider.addEventListener('input', () => {
        const shardCount = Number(shardSlider.value);
        shardVal.textContent = String(shardCount);
        patchSql({ shardCount });
      });
      shardField.append(shardLabel, shardSlider);

      const stratField = document.createElement('div');
      stratField.className = 'sdq-config-popover__field';
      stratField.append(fieldLabel(t('config.partitioning')));
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
        patchSql({ partitioningStrategy: select.value as PartitioningStrategy });
      });
      stratField.append(select);

      const keyField = document.createElement('div');
      keyField.className = 'sdq-config-popover__field';
      keyField.append(fieldLabel(t('config.partitionKey')));
      const keyInput = document.createElement('input');
      keyInput.type = 'text';
      keyInput.placeholder = 'e.g. user_id';
      keyInput.value = cfg.partitionKey ?? '';
      keyInput.setAttribute('data-testid', 'config-partition-key');
      keyInput.addEventListener('change', () => {
        patchSql({ partitionKey: keyInput.value || undefined });
      });
      keyField.append(keyInput);

      const skewField = document.createElement('div');
      skewField.className = 'sdq-config-popover__field';
      const skewLabel = fieldLabel(t('config.keySkew'), `${cfg.keySkew}%`);
      const skewVal = skewLabel.lastElementChild as HTMLSpanElement;
      const skewSlider = document.createElement('input');
      skewSlider.type = 'range';
      skewSlider.min = '0';
      skewSlider.max = '100';
      skewSlider.value = String(cfg.keySkew);
      skewSlider.setAttribute('data-testid', 'config-key-skew');
      skewSlider.addEventListener('input', () => {
        const keySkew = Number(skewSlider.value);
        skewVal.textContent = `${keySkew}%`;
        patchSql({ keySkew });
      });
      skewField.append(skewLabel, skewSlider);

      root.append(shardField, stratField, keyField, skewField);
    }

    if (node.config?.kind === 'nosql_db') {
      let cfg = { ...node.config };
      const patchNosql = (patch: Partial<typeof cfg>): void => {
        cfg = { ...cfg, ...patch };
        currentNode = { ...node, config: cfg };
        callbacks.onConfigChange(node.id, cfg);
      };
      appendAccessTopologyFields(root, cfg, patchNosql);
    }

    if (node.config?.kind === 'mq') {
      let cfg = { ...node.config };
      const durField = document.createElement('div');
      durField.className = 'sdq-config-popover__field';
      durField.append(fieldLabel(t('config.durability')));
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
        cfg = { ...cfg, durability: durSelect.value as MqDurability };
        currentNode = { ...node, config: cfg };
        callbacks.onConfigChange(node.id, cfg);
      });
      durField.append(durSelect);

      const partField = document.createElement('div');
      partField.className = 'sdq-config-popover__field';
      const partLabel = fieldLabel(t('config.partitionCount'), String(cfg.partitionCount));
      const partVal = partLabel.lastElementChild as HTMLSpanElement;
      const partSlider = document.createElement('input');
      partSlider.type = 'range';
      partSlider.min = '1';
      partSlider.max = '256';
      partSlider.value = String(cfg.partitionCount);
      partSlider.setAttribute('data-testid', 'config-mq-partitions');
      partSlider.addEventListener('input', () => {
        const partitionCount = Number(partSlider.value);
        partVal.textContent = String(partitionCount);
        cfg = { ...cfg, partitionCount };
        currentNode = { ...node, config: cfg };
        callbacks.onConfigChange(node.id, cfg);
      });
      partField.append(partLabel, partSlider);
      root.append(durField, partField);
    }

    if (node.config?.kind === 'ws') {
      let cfg = { ...node.config };
      const field = document.createElement('div');
      field.className = 'sdq-config-popover__field';
      const label = fieldLabel(t('config.fanOut'), String(cfg.fanOutLimit));
      const value = label.lastElementChild as HTMLSpanElement;
      const slider = document.createElement('input');
      slider.type = 'range';
      slider.min = '1';
      slider.max = '100000';
      slider.value = String(cfg.fanOutLimit);
      slider.setAttribute('data-testid', 'config-ws-fanout');
      slider.addEventListener('input', () => {
        const fanOutLimit = Number(slider.value);
        value.textContent = String(fanOutLimit);
        cfg = { ...cfg, fanOutLimit };
        currentNode = { ...node, config: cfg };
        callbacks.onConfigChange(node.id, cfg);
      });
      field.append(label, slider);
      root.append(field);
    }

    if (node.config?.kind === 'lb') {
      let cfg = { ...node.config };
      const field = document.createElement('div');
      field.className = 'sdq-config-popover__field';
      field.append(fieldLabel(t('config.algorithm')));
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
        cfg = { ...cfg, algorithm: select.value as LbAlgorithm };
        currentNode = { ...node, config: cfg };
        callbacks.onConfigChange(node.id, cfg);
      });
      field.append(select);
      root.append(field);
    }

    const notesTitle = document.createElement('div');
    notesTitle.className = 'sdq-config-popover__notes-title';
    notesTitle.textContent = t('config.notes');
    const notes = document.createElement('textarea');
    notes.setAttribute('data-testid', 'config-notes');
    notes.placeholder = t('config.notesPlaceholder');
    notes.value = node.implementationNotes ?? node.note ?? '';
    notes.addEventListener('change', () => {
      callbacks.onNotesChange(node.id, notes.value);
      currentNode = {
        ...node,
        implementationNotes: notes.value,
        config: currentNode?.config ?? node.config,
      };
    });
    const hint = document.createElement('p');
    hint.className = 'sdq-config-popover__hint';
    hint.textContent = t('config.notesHint');

    root.append(notesTitle, notes, hint);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener(LOCALE_CHANGE_EVENT, onLocaleChange);
  }

  return {
    root,
    open(node, anchor) {
      anchorRect = anchor;
      render(node);
      root.hidden = false;
      position(anchor);
    },
    close() {
      root.hidden = true;
      currentNode = null;
      anchorRect = null;
    },
    destroy() {
      if (typeof window !== 'undefined') {
        window.removeEventListener(LOCALE_CHANGE_EVENT, onLocaleChange);
      }
      root.remove();
      currentNode = null;
      anchorRect = null;
    },
  };
}
