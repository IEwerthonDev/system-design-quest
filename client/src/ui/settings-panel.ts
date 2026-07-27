import {
  loadPreferences,
  requestRedoTutorial,
  requestReplayOnboarding,
  setSoundEnabled,
  type UserPreferences,
} from '../storage/preferences';

export interface SettingsPanelCallbacks {
  onRedoTutorial: (preferences: UserPreferences) => void;
  onReplayOnboarding: (preferences: UserPreferences) => void;
  onSoundChange?: (preferences: UserPreferences) => void;
  storage?: Storage;
}

export interface SettingsPanel {
  root: HTMLElement;
  open(): void;
  close(): void;
  isOpen(): boolean;
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
      border: 1px solid #334155;
      background: #0f172a;
      color: #e2e8f0;
      border-radius: 8px;
      padding: 8px 12px;
      cursor: pointer;
      font: 600 13px system-ui, sans-serif;
    }
    .sdq-settings-panel {
      position: fixed;
      top: 52px;
      right: 12px;
      z-index: 61;
      width: min(320px, calc(100vw - 24px));
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 14px;
      color: #e2e8f0;
      font: 14px system-ui, sans-serif;
      box-shadow: 0 12px 40px rgba(0,0,0,0.35);
    }
    .sdq-settings-panel[hidden] { display: none !important; }
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
    .sdq-settings-panel button.action {
      width: 100%;
      margin-top: 8px;
      border: 1px solid #475569;
      background: #1e293b;
      color: #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      cursor: pointer;
      font: 600 13px system-ui, sans-serif;
      text-align: left;
    }
    .sdq-settings-panel button.action:hover {
      background: #334155;
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

  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'sdq-settings-fab';
  fab.setAttribute('data-testid', 'settings-open');
  fab.textContent = 'Configurações';

  const panel = document.createElement('div');
  panel.className = 'sdq-settings-panel';
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

  const redoBtn = document.createElement('button');
  redoBtn.type = 'button';
  redoBtn.className = 'action';
  redoBtn.setAttribute('data-testid', 'settings-redo-tutorial');
  redoBtn.textContent = 'Refazer tutorial';

  const onboardBtn = document.createElement('button');
  onboardBtn.type = 'button';
  onboardBtn.className = 'action';
  onboardBtn.setAttribute('data-testid', 'settings-replay-onboarding');
  onboardBtn.textContent = 'Rever onboarding';

  panel.append(title, soundRow, redoBtn, onboardBtn);

  const root = document.createElement('div');
  root.setAttribute('data-testid', 'settings-root');
  root.append(fab, panel);
  parent.appendChild(root);

  let open = false;

  const setOpen = (next: boolean): void => {
    open = next;
    panel.hidden = !next;
  };

  fab.addEventListener('click', () => {
    setOpen(!open);
  });

  soundToggle.addEventListener('change', () => {
    const prefs = setSoundEnabled(soundToggle.checked, storage);
    callbacks.onSoundChange?.(prefs);
  });

  redoBtn.addEventListener('click', () => {
    const prefs = requestRedoTutorial(storage);
    setOpen(false);
    callbacks.onRedoTutorial(prefs);
  });

  onboardBtn.addEventListener('click', () => {
    const prefs = requestReplayOnboarding(storage);
    setOpen(false);
    callbacks.onReplayOnboarding(prefs);
  });

  return {
    root,
    open: () => setOpen(true),
    close: () => setOpen(false),
    isOpen: () => open,
  };
}
