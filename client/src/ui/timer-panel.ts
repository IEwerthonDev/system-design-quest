import type { GameMode } from '../test-hook';
import { getSession, getElapsedMs } from '../session/session-store';

export interface TimerPanel {
  root: HTMLElement;
  sync(): void;
}

function formatElapsedMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function injectTimerStyles(root: HTMLElement): void {
  if (document.getElementById('sdq-timer-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'sdq-timer-styles';
  style.textContent = `
    .sdq-timer {
      position: fixed;
      top: max(12px, env(safe-area-inset-top));
      right: 12px;
      z-index: 25;
      border: 1px solid var(--sdq-accent-border);
      background: var(--sdq-bg-elevated);
      color: var(--sdq-accent);
      border-radius: var(--sdq-radius-sm);
      padding: 8px 14px;
      font: 700 14px var(--sdq-font-mono);
      letter-spacing: 0.04em;
      box-shadow: var(--sdq-shadow);
    }
  `;
  root.append(style);
}

export interface MountTimerPanelOptions {
  getMode?: () => GameMode;
  now?: () => number;
}

export function mountTimerPanel(
  container: HTMLElement,
  options: MountTimerPanelOptions = {},
): TimerPanel {
  injectTimerStyles(document.head);

  const getMode = options.getMode ?? (() => getSession()?.mode ?? 'study');
  const now = options.now ?? Date.now;

  const root = document.createElement('div');
  root.className = 'sdq-timer';
  root.setAttribute('data-testid', 'speedrun-timer');
  root.hidden = true;
  container.append(root);

  const sync = (): void => {
    const mode = getMode();
    if (mode !== 'speedrun') {
      root.hidden = true;
      return;
    }

    const session = getSession();
    if (!session) {
      root.hidden = true;
      return;
    }

    root.hidden = false;
    root.textContent = formatElapsedMs(getElapsedMs(session, now));
  };

  sync();

  return { root, sync };
}

export { formatElapsedMs };
