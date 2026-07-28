import type { SimulationSettings } from '@sdq/shared';
import { t } from '../i18n/t';

export interface WorkloadPanel {
  root: HTMLElement;
  sync(settings: SimulationSettings): void;
  destroy(): void;
}

export interface MountWorkloadPanelOptions {
  getSettings(): SimulationSettings;
  onChange(partial: Partial<SimulationSettings>): void;
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
    .sdq-workload__title {
      font-weight: 700;
      margin: 0 0 8px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      font-size: 10px;
      color: var(--sdq-text-subtle);
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
  const root = document.createElement('aside');
  root.className = 'sdq-workload';
  root.setAttribute('data-testid', 'workload-panel');

  const title = document.createElement('h2');
  title.className = 'sdq-workload__title';
  title.textContent = t('workload.title');
  root.append(title);

  const inputs = new Map<FieldKey, HTMLInputElement>();

  for (const field of FIELDS) {
    const row = document.createElement('div');
    row.className = 'sdq-workload__field';
    const label = document.createElement('label');
    label.htmlFor = `sdq-wl-${field.key}`;
    label.textContent = t(field.labelKey as Parameters<typeof t>[0]);
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
    row.append(label, input);
    root.append(row);
  }

  container.append(root);

  const sync = (settings: SimulationSettings): void => {
    title.textContent = t('workload.title');
    for (const field of FIELDS) {
      const input = inputs.get(field.key)!;
      const value = settings[field.key];
      input.value = value == null ? '' : String(value);
    }
  };

  sync(options.getSettings());

  return {
    root,
    sync,
    destroy() {
      root.remove();
    },
  };
}
