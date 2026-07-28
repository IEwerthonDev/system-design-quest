import type { SimulationSettings } from '@sdq/shared';
import { DEFAULT_SIMULATION } from '@sdq/shared';

export interface SimControls {
  root: HTMLElement;
  sync(settings: SimulationSettings): void;
  destroy(): void;
}

export interface MountSimControlsOptions {
  onChange(partial: Partial<SimulationSettings>): void;
  getSettings(): SimulationSettings;
}

function injectStyles(): void {
  if (document.getElementById('sdq-sim-controls-styles')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'sdq-sim-controls-styles';
  style.textContent = `
    .sdq-sim-controls {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #f8fafc;
      color: #0f172a;
      border-radius: 999px;
      padding: 6px 14px 6px 8px;
      font-family: ui-monospace, Menlo, monospace;
      font-size: 11px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
    }
    .sdq-sim-controls__top,
    .sdq-sim-controls__meters {
      display: contents;
    }
    .sdq-sim-controls__start {
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 999px;
      padding: 6px 14px;
      font-weight: 700;
      cursor: pointer;
      font: inherit;
      touch-action: manipulation;
    }
    .sdq-sim-controls__start[data-running="true"] {
      background: #dc2626;
    }
    .sdq-sim-controls__field {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 90px;
    }
    .sdq-sim-controls__field label {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.03em;
    }
    .sdq-sim-controls input[type="range"] {
      width: 100%;
      accent-color: #38bdf8;
    }
    .sdq-sim-controls__hint {
      font-size: 10px;
      color: #64748b;
      max-width: 110px;
      line-height: 1.2;
    }

    @media (max-width: 768px) {
      .sdq-sim-controls {
        flex-direction: column;
        align-items: stretch;
        gap: 0;
        width: 100%;
        border-radius: 14px;
        padding: 0;
        background: rgba(8, 20, 38, 0.96);
        border: 1px solid rgba(56, 120, 180, 0.35);
        color: #e2e8f0;
        box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
        overflow: hidden;
      }
      .sdq-sim-controls__top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 12px;
        background: rgba(15, 40, 72, 0.55);
        border-bottom: 1px solid rgba(56, 120, 180, 0.2);
      }
      .sdq-sim-controls__meters {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 10px 12px 12px;
      }
      .sdq-sim-controls__start {
        flex-shrink: 0;
        min-height: 40px;
        min-width: 84px;
        border-radius: 10px;
        font-size: 12px;
        letter-spacing: 0.04em;
      }
      .sdq-sim-controls__field {
        min-width: 0;
        gap: 4px;
      }
      .sdq-sim-controls__field label {
        font-size: 9px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #94a3b8;
      }
      .sdq-sim-controls__field label span:last-child {
        color: #7dd3fc;
        font-weight: 700;
      }
      .sdq-sim-controls input[type="range"] {
        min-height: 24px;
        accent-color: #38bdf8;
      }
      .sdq-sim-controls__hint {
        display: block;
        flex: 1;
        min-width: 0;
        max-width: none;
        font-size: 10px;
        line-height: 1.3;
        color: #94a3b8;
        text-align: right;
      }
    }
  `;
  document.head.append(style);
}

export function mountSimControls(
  container: HTMLElement,
  options: MountSimControlsOptions,
): SimControls {
  injectStyles();
  const root = document.createElement('div');
  root.className = 'sdq-sim-controls';
  root.setAttribute('data-testid', 'sim-controls');

  const top = document.createElement('div');
  top.className = 'sdq-sim-controls__top';

  const meters = document.createElement('div');
  meters.className = 'sdq-sim-controls__meters';

  const start = document.createElement('button');
  start.type = 'button';
  start.className = 'sdq-sim-controls__start';
  start.setAttribute('data-testid', 'sim-start');
  start.textContent = 'Start';

  const makeSlider = (
    key: 'speed' | 'traffic' | 'readRatio',
    label: string,
    min: number,
    max: number,
    testId: string,
  ): { field: HTMLElement; input: HTMLInputElement; valueEl: HTMLElement } => {
    const field = document.createElement('div');
    field.className = 'sdq-sim-controls__field';
    const lab = document.createElement('label');
    const name = document.createElement('span');
    name.textContent = label;
    const valueEl = document.createElement('span');
    lab.append(name, valueEl);
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.setAttribute('data-testid', testId);
    input.addEventListener('input', () => {
      const v = Number(input.value);
      options.onChange({ [key]: v });
      sync(options.getSettings());
    });
    field.append(lab, input);
    return { field, input, valueEl };
  };

  const speed = makeSlider('speed', 'Speed', 1, 5, 'sim-speed');
  const traffic = makeSlider('traffic', 'Traffic', 1, 5, 'sim-traffic');
  const rw = makeSlider('readRatio', 'Reads vs Writes', 0, 100, 'sim-read-ratio');
  const hint = document.createElement('div');
  hint.className = 'sdq-sim-controls__hint';
  hint.setAttribute('data-testid', 'sim-rw-hint');

  start.addEventListener('click', () => {
    const current = options.getSettings();
    options.onChange({ running: !current.running });
    sync(options.getSettings());
  });

  top.append(start, hint);
  meters.append(speed.field, traffic.field, rw.field);
  root.append(top, meters);
  container.append(root);

  const sync = (settings: SimulationSettings): void => {
    const s = { ...DEFAULT_SIMULATION, ...settings };
    start.dataset.running = String(s.running);
    start.textContent = s.running ? 'Stop' : 'Start';
    speed.input.value = String(s.speed);
    speed.valueEl.textContent = `${s.speed}x`;
    traffic.input.value = String(s.traffic);
    traffic.valueEl.textContent = `${s.traffic}x`;
    rw.input.value = String(s.readRatio);
    rw.valueEl.textContent = `${s.readRatio}% read`;
    if (s.readRatio >= 70) {
      hint.textContent = `Read-heavy · ${100 - s.readRatio}% write`;
    } else if (s.readRatio <= 30) {
      hint.textContent = `Write-heavy · ${s.readRatio}% read`;
    } else {
      hint.textContent = `Balanced · ${100 - s.readRatio}% write`;
    }
  };

  sync(options.getSettings());

  return { root, sync, destroy: () => root.remove() };
}
