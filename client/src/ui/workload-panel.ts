import type { SimulationSettings } from '@sdq/shared';
import { LOCALE_CHANGE_EVENT } from '../i18n/locale';
import { t } from '../i18n/t';

export interface WorkloadPanel {
  root: HTMLElement;
  fab: HTMLButtonElement;
  backdrop: HTMLElement;
  sync(settings: SimulationSettings): void;
  open(): void;
  close(): void;
  isOpen(): boolean;
  setVisible(visible: boolean): void;
  destroy(): void;
}

export interface MountWorkloadPanelOptions {
  getSettings(): SimulationSettings;
  onChange(partial: Partial<SimulationSettings>): void;
  onOpen?: () => void;
}

type FieldKey =
  | 'rps'
  | 'readRps'
  | 'writeRps'
  | 'concurrentUsers'
  | 'avgObjectKb'
  | 'avgResponseKb'
  | 'networkLatencyMs'
  | 'bandwidthMbps'
  | 'targetAvailability'
  | 'growthFactor'
  | 'dailyDataGb';

const FIELDS: { key: FieldKey; labelKey: string; min: number; max: number; step: number }[] = [
  { key: 'rps', labelKey: 'workload.rps', min: 0, max: 1_000_000, step: 100 },
  { key: 'readRps', labelKey: 'workload.readRps', min: 0, max: 1_000_000, step: 100 },
  { key: 'writeRps', labelKey: 'workload.writeRps', min: 0, max: 1_000_000, step: 50 },
  { key: 'concurrentUsers', labelKey: 'workload.concurrentUsers', min: 0, max: 10_000_000, step: 100 },
  { key: 'avgObjectKb', labelKey: 'workload.avgObjectKb', min: 0, max: 100_000, step: 1 },
  { key: 'avgResponseKb', labelKey: 'workload.avgResponseKb', min: 0, max: 100_000, step: 1 },
  { key: 'networkLatencyMs', labelKey: 'workload.networkLatencyMs', min: 0, max: 5000, step: 5 },
  { key: 'bandwidthMbps', labelKey: 'workload.bandwidthMbps', min: 0, max: 100_000, step: 10 },
  { key: 'targetAvailability', labelKey: 'workload.targetAvailability', min: 90, max: 100, step: 0.1 },
  { key: 'growthFactor', labelKey: 'workload.growthFactor', min: 1, max: 1000, step: 1 },
  { key: 'dailyDataGb', labelKey: 'workload.dailyDataGb', min: 0, max: 1_000_000, step: 1 },
];

function injectStyles(): void {
  if (document.getElementById('sdq-workload-styles')) return;
  const style = document.createElement('style');
  style.id = 'sdq-workload-styles';
  style.textContent = `
    .sdq-workload-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 21;
      background: rgba(2, 8, 23, 0.45);
      backdrop-filter: blur(2px);
    }
    .sdq-workload-backdrop.is-open {
      display: block;
    }
    .sdq-workload-fab {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      position: fixed;
      left: 12px;
      bottom: calc(72px + env(safe-area-inset-bottom, 0px));
      z-index: 19;
      min-height: 44px;
      padding: 10px 14px;
      border-radius: var(--sdq-radius, 10px);
      border: 1px solid var(--sdq-accent-border, rgba(201,169,98,0.35));
      background: var(--sdq-bg-elevated, #141416);
      color: var(--sdq-accent, #c9a962);
      font: 600 11px var(--sdq-font-mono, monospace);
      letter-spacing: 0.06em;
      cursor: pointer;
      touch-action: manipulation;
      box-shadow: var(--sdq-shadow);
    }
    .sdq-workload-fab[hidden] { display: none !important; }
    .sdq-workload {
      position: absolute;
      left: 12px;
      top: 72px;
      z-index: 22;
      width: min(280px, calc(100vw - 24px));
      max-height: min(50vh, 420px);
      overflow: auto;
      background: var(--sdq-bg-elevated);
      border: 1px solid var(--sdq-border);
      border-radius: 12px;
      padding: 10px 12px;
      box-shadow: var(--sdq-shadow);
      font-family: var(--sdq-font-mono);
      font-size: 11px;
      color: var(--sdq-text);
    }
    .sdq-workload[hidden] { display: none !important; }
    .sdq-workload--collapsed {
      visibility: hidden;
      pointer-events: none;
      transform: translateX(-8px);
    }
    .sdq-workload__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }
    .sdq-workload__title {
      font-weight: 700;
      margin: 0;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      font-size: 10px;
      color: var(--sdq-text-subtle);
    }
    .sdq-workload__collapse {
      border: 1px solid var(--sdq-border);
      background: var(--sdq-bg);
      color: var(--sdq-text);
      border-radius: 6px;
      min-width: 32px;
      min-height: 32px;
      cursor: pointer;
      font: inherit;
    }
    .sdq-workload__field {
      display: grid;
      grid-template-columns: 1fr 88px;
      gap: 6px;
      align-items: center;
      margin-bottom: 6px;
    }
    .sdq-workload__field label {
      color: var(--sdq-text-subtle);
      font-size: 10px;
    }
    .sdq-workload__field input {
      width: 100%;
      background: var(--sdq-bg);
      border: 1px solid var(--sdq-border);
      border-radius: 6px;
      color: var(--sdq-text);
      padding: 4px 6px;
      font: inherit;
    }
  `;
  document.head.append(style);
}

export function mountWorkloadPanel(
  container: HTMLElement,
  options: MountWorkloadPanelOptions,
): WorkloadPanel {
  injectStyles();

  const backdrop = document.createElement('div');
  backdrop.className = 'sdq-workload-backdrop';
  backdrop.setAttribute('data-testid', 'workload-backdrop');

  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'sdq-workload-fab';
  fab.setAttribute('data-testid', 'workload-fab');

  const root = document.createElement('aside');
  root.className = 'sdq-workload sdq-workload--collapsed';
  root.setAttribute('data-testid', 'workload-panel');

  const header = document.createElement('div');
  header.className = 'sdq-workload__header';

  const title = document.createElement('h2');
  title.className = 'sdq-workload__title';

  const collapseBtn = document.createElement('button');
  collapseBtn.type = 'button';
  collapseBtn.className = 'sdq-workload__collapse';
  collapseBtn.setAttribute('data-testid', 'workload-collapse');
  collapseBtn.textContent = '«';

  header.append(title, collapseBtn);
  root.append(header);

  const inputs = new Map<FieldKey, HTMLInputElement>();
  const labels = new Map<FieldKey, HTMLLabelElement>();

  for (const field of FIELDS) {
    const row = document.createElement('div');
    row.className = 'sdq-workload__field';
    const label = document.createElement('label');
    label.htmlFor = `sdq-wl-${field.key}`;
    const input = document.createElement('input');
    input.type = 'number';
    input.id = `sdq-wl-${field.key}`;
    input.min = String(field.min);
    input.max = String(field.max);
    input.step = String(field.step);
    input.setAttribute('data-testid', `workload-${field.key}`);
    input.addEventListener('change', () => {
      const value = Number(input.value);
      if (!Number.isFinite(value)) return;
      options.onChange({ [field.key]: value });
    });
    inputs.set(field.key, input);
    labels.set(field.key, label);
    row.append(label, input);
    root.append(row);
  }

  const applyOpen = (open: boolean): void => {
    root.classList.toggle('sdq-workload--collapsed', !open);
    backdrop.classList.toggle('is-open', open);
    fab.hidden = open;
    collapseBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  const open = (): void => {
    if (!root.classList.contains('sdq-workload--collapsed') && !root.hidden) {
      return;
    }
    options.onOpen?.();
    applyOpen(true);
  };

  const close = (): void => {
    applyOpen(false);
  };

  fab.addEventListener('click', open);
  collapseBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);

  const refreshChrome = (): void => {
    title.textContent = t('workload.title');
    fab.textContent = t('workload.fab');
    fab.setAttribute('aria-label', t('workload.fab'));
    collapseBtn.setAttribute('aria-label', t('workload.collapse'));
    collapseBtn.title = t('workload.collapse');
    for (const field of FIELDS) {
      labels.get(field.key)!.textContent = t(field.labelKey as Parameters<typeof t>[0]);
    }
  };
  refreshChrome();

  const onLocaleChange = (): void => {
    refreshChrome();
  };
  if (typeof window !== 'undefined') {
    window.addEventListener(LOCALE_CHANGE_EVENT, onLocaleChange);
  }

  container.append(backdrop, fab, root);

  const sync = (settings: SimulationSettings): void => {
    refreshChrome();
    for (const field of FIELDS) {
      const input = inputs.get(field.key)!;
      const value = settings[field.key];
      input.value = value == null ? '' : String(value);
    }
  };

  sync(options.getSettings());

  return {
    root,
    fab,
    backdrop,
    sync,
    open,
    close,
    isOpen: () => !root.classList.contains('sdq-workload--collapsed') && !root.hidden,
    setVisible(visible: boolean) {
      root.hidden = !visible;
      fab.hidden = !visible || !root.classList.contains('sdq-workload--collapsed');
      backdrop.hidden = !visible;
      if (!visible) {
        close();
        fab.hidden = true;
      }
    },
    destroy() {
      if (typeof window !== 'undefined') {
        window.removeEventListener(LOCALE_CHANGE_EVENT, onLocaleChange);
      }
      backdrop.remove();
      fab.remove();
      root.remove();
    },
  };
}
