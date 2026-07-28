import { loadPreferences, setSoundEnabled, type UserPreferences } from '../storage/preferences';

export interface SettingsPanelCallbacks {
  onSoundChange?: (preferences: UserPreferences) => void;
  storage?: Storage;
  /** When set, the open button is mounted here instead of fixed FAB. */
  anchor?: HTMLElement;
}

export interface SettingsPanel {
  root: HTMLElement;
  open(): void;
  close(): void;
  isOpen(): boolean;
  setVisible(visible: boolean): void;
}

function injectSettingsStyles(): void {
  if (document.getElementById('sdq-settings-styles')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'sdq-settings-styles';
  style.textContent = `
    .sdq-settings-fab {
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 60;
      border: 1px solid var(--sdq-hover-bg);
      background: var(--sdq-bg);
      color: var(--sdq-text);
      border-radius: var(--sdq-radius-sm);
      padding: 8px 12px;
      cursor: pointer;
      font: 600 13px var(--sdq-font);
    }
    @media (max-width: 768px) {
      .sdq-settings-fab {
        top: calc(6px + env(safe-area-inset-top, 0px));
        right: 10px;
        padding: 6px 10px;
        font-size: 11px;
        border-radius: var(--sdq-radius);
        border-color: var(--sdq-border-strong);
        background: var(--sdq-bg-elevated);
      }
    }
    .sdq-settings-btn--in-header {
      position: static;
      flex-shrink: 0;
      min-height: 36px;
      padding: 6px 12px;
      border: 1px solid var(--sdq-border);
      background: var(--sdq-bg-elevated);
      color: var(--sdq-text-muted);
      border-radius: var(--sdq-radius-sm);
      font: 500 13px var(--sdq-font);
      cursor: pointer;
      touch-action: manipulation;
    }
    .sdq-settings-btn--in-header:hover {
      color: var(--sdq-text);
      border-color: var(--sdq-border-strong);
    }
    .sdq-settings-panel {
      position: fixed;
      top: 52px;
      right: 12px;
      z-index: 61;
      width: min(320px, calc(100vw - 24px));
      background: var(--sdq-bg);
      border: 1px solid var(--sdq-hover-bg);
      border-radius: var(--sdq-radius);
      padding: 14px;
      color: var(--sdq-text);
      font: 14px system-ui, sans-serif;
      box-shadow: var(--sdq-shadow);
    }
    .sdq-settings-panel--anchored {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      left: auto;
    }
    .sdq-settings-panel[hidden] { display: none !important; }
    .sdq-settings-root[hidden] { display: none !important; }
    .sdq-settings-panel h2 {
      margin: 0 0 12px;
      font-size: 15px;
    }
    .sdq-settings-panel__row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
    }
  `;
  document.head.appendChild(style);
}

export function mountSettingsPanel(
  parent: HTMLElement,
  callbacks: SettingsPanelCallbacks,
): SettingsPanel {
  injectSettingsStyles();
  const storage = callbacks.storage;
  const inline = Boolean(callbacks.anchor);

  const openBtn = document.createElement('button');
  openBtn.type = 'button';
  openBtn.className = inline ? 'sdq-settings-btn--in-header' : 'sdq-settings-fab';
  openBtn.setAttribute('data-testid', 'settings-open');
  openBtn.textContent = 'Configurações';

  const panel = document.createElement('div');
  panel.className = inline ? 'sdq-settings-panel sdq-settings-panel--anchored' : 'sdq-settings-panel';
  panel.setAttribute('data-testid', 'settings-panel');
  panel.hidden = true;

  const title = document.createElement('h2');
  title.textContent = 'Configurações';

  const soundRow = document.createElement('div');
  soundRow.className = 'sdq-settings-panel__row';
  const soundLabel = document.createElement('label');
  soundLabel.htmlFor = 'sdq-sound-toggle';
  soundLabel.textContent = 'Sons';
  const soundToggle = document.createElement('input');
  soundToggle.type = 'checkbox';
  soundToggle.id = 'sdq-sound-toggle';
  soundToggle.setAttribute('data-testid', 'settings-sound-toggle');
  soundToggle.checked = loadPreferences(storage).soundEnabled;
  soundRow.append(soundLabel, soundToggle);

  panel.append(title, soundRow);

  const root = document.createElement('div');
  root.className = 'sdq-settings-root';
  root.setAttribute('data-testid', 'settings-root');
  root.style.position = inline ? 'relative' : '';
  root.append(openBtn, panel);

  if (inline && callbacks.anchor) {
    callbacks.anchor.append(root);
  } else {
    parent.appendChild(root);
  }

  let open = false;

  const setOpen = (next: boolean): void => {
    open = next;
    panel.hidden = !next;
  };

  openBtn.addEventListener('click', () => {
    setOpen(!open);
  });

  soundToggle.addEventListener('change', () => {
    const prefs = setSoundEnabled(soundToggle.checked, storage);
    callbacks.onSoundChange?.(prefs);
  });

  return {
    root,
    open: () => setOpen(true),
    close: () => setOpen(false),
    isOpen: () => open,
    setVisible(visible) {
      root.hidden = !visible;
      if (!visible) {
        setOpen(false);
      }
    },
  };
}
