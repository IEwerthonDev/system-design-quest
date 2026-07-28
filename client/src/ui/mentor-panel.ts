import type { ArchitectureFinding, MentorAction, MentorResult } from '@sdq/shared';
import { MENTOR_ACTIONS } from '@sdq/shared';
import { getLocale, LOCALE_CHANGE_EVENT } from '../i18n/locale';
import { t } from '../i18n/t';
import { askMentor } from '../mentor/mentor-api';
import { getGraph } from '../session/session-store';

export interface MentorPanel {
  root: HTMLElement;
  fab: HTMLButtonElement;
  backdrop: HTMLElement;
  open(): void;
  close(): void;
  isOpen(): boolean;
  setVisible(visible: boolean): void;
  destroy(): void;
}

export interface MountMentorPanelOptions {
  getFindings(): ArchitectureFinding[];
  askMentorFn?: typeof askMentor;
  onOpen?: () => void;
}

const ACTION_KEYS: Record<MentorAction, string> = {
  evaluate: 'mentor.evaluate',
  hint: 'mentor.hint',
  bottlenecks: 'mentor.bottlenecks',
  improve: 'mentor.improve',
  missing: 'mentor.missing',
};

function injectStyles(): void {
  if (document.getElementById('sdq-mentor-styles')) return;
  const style = document.createElement('style');
  style.id = 'sdq-mentor-styles';
  style.textContent = `
    .sdq-mentor-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 21;
      background: rgba(2, 8, 23, 0.45);
      backdrop-filter: blur(2px);
    }
    .sdq-mentor-backdrop.is-open {
      display: block;
    }
    .sdq-mentor-fab {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      position: fixed;
      right: 12px;
      bottom: calc(16px + env(safe-area-inset-bottom, 0px));
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
    .sdq-mentor-fab[hidden] { display: none !important; }
    .sdq-mentor {
      position: absolute;
      right: 12px;
      bottom: calc(72px + env(safe-area-inset-bottom));
      z-index: 22;
      width: min(360px, calc(100vw - 24px));
      background: var(--sdq-bg-elevated);
      border: 1px solid var(--sdq-border);
      border-radius: 12px;
      padding: 10px 12px;
      box-shadow: var(--sdq-shadow);
      font-family: var(--sdq-font-sans, var(--sdq-font-mono));
      font-size: 12px;
      color: var(--sdq-text);
    }
    .sdq-mentor[hidden] { display: none !important; }
    .sdq-mentor--collapsed {
      visibility: hidden;
      pointer-events: none;
      transform: translateY(8px);
    }
    .sdq-mentor__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }
    .sdq-mentor__title {
      font-weight: 700;
      margin: 0;
      font-size: 11px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--sdq-text-subtle);
    }
    .sdq-mentor__collapse {
      border: 1px solid var(--sdq-border);
      background: var(--sdq-bg);
      color: var(--sdq-text);
      border-radius: 6px;
      min-width: 32px;
      min-height: 32px;
      cursor: pointer;
      font: inherit;
    }
    .sdq-mentor__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 8px;
    }
    .sdq-mentor__btn {
      background: var(--sdq-accent-muted);
      color: var(--sdq-accent);
      border: 1px solid var(--sdq-accent-border);
      border-radius: 999px;
      padding: 6px 10px;
      font: inherit;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
    }
    .sdq-mentor__btn:disabled {
      opacity: 0.5;
      cursor: wait;
    }
    .sdq-mentor__result {
      white-space: pre-wrap;
      line-height: 1.4;
      max-height: 220px;
      overflow: auto;
      margin: 0;
      padding: 8px;
      border-radius: 8px;
      background: var(--sdq-bg);
      border: 1px solid var(--sdq-border);
    }
    .sdq-mentor__result-title {
      font-weight: 700;
      margin: 0 0 6px;
      color: var(--sdq-accent);
    }
  `;
  document.head.append(style);
}

export function mountMentorPanel(
  container: HTMLElement,
  options: MountMentorPanelOptions,
): MentorPanel {
  injectStyles();
  const ask = options.askMentorFn ?? askMentor;

  const backdrop = document.createElement('div');
  backdrop.className = 'sdq-mentor-backdrop';
  backdrop.setAttribute('data-testid', 'mentor-backdrop');

  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'sdq-mentor-fab';
  fab.setAttribute('data-testid', 'mentor-fab');

  const root = document.createElement('aside');
  root.className = 'sdq-mentor sdq-mentor--collapsed';
  root.setAttribute('data-testid', 'mentor-panel');

  const header = document.createElement('div');
  header.className = 'sdq-mentor__header';

  const title = document.createElement('h2');
  title.className = 'sdq-mentor__title';

  const collapseBtn = document.createElement('button');
  collapseBtn.type = 'button';
  collapseBtn.className = 'sdq-mentor__collapse';
  collapseBtn.setAttribute('data-testid', 'mentor-collapse');
  collapseBtn.textContent = '«';

  header.append(title, collapseBtn);

  const actions = document.createElement('div');
  actions.className = 'sdq-mentor__actions';

  const resultTitle = document.createElement('p');
  resultTitle.className = 'sdq-mentor__result-title';
  resultTitle.setAttribute('data-testid', 'mentor-result-title');
  resultTitle.hidden = true;

  const resultBody = document.createElement('pre');
  resultBody.className = 'sdq-mentor__result';
  resultBody.setAttribute('data-testid', 'mentor-result-body');
  resultBody.hidden = true;

  let busy = false;
  const buttons: HTMLButtonElement[] = [];

  const setBusy = (value: boolean): void => {
    busy = value;
    for (const btn of buttons) {
      btn.disabled = value;
    }
  };

  const showResult = (result: MentorResult): void => {
    resultTitle.hidden = false;
    resultBody.hidden = false;
    resultTitle.textContent = result.title;
    resultBody.textContent = result.body;
  };

  for (const action of MENTOR_ACTIONS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sdq-mentor__btn';
    btn.setAttribute('data-testid', `mentor-action-${action}`);
    btn.addEventListener('click', () => {
      if (busy) return;
      setBusy(true);
      void ask({
        action,
        graph: getGraph(),
        findings: options.getFindings(),
        locale: getLocale(),
      })
        .then(showResult)
        .catch((err: unknown) => {
          resultTitle.hidden = false;
          resultBody.hidden = false;
          resultTitle.textContent = t('mentor.error');
          resultBody.textContent = err instanceof Error ? err.message : String(err);
        })
        .finally(() => setBusy(false));
    });
    buttons.push(btn);
    actions.append(btn);
  }

  root.append(header, actions, resultTitle, resultBody);

  const applyOpen = (open: boolean): void => {
    root.classList.toggle('sdq-mentor--collapsed', !open);
    backdrop.classList.toggle('is-open', open);
    fab.hidden = open;
    collapseBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  const open = (): void => {
    if (!root.classList.contains('sdq-mentor--collapsed') && !root.hidden) {
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
    title.textContent = t('mentor.title');
    fab.textContent = t('mentor.fab');
    fab.setAttribute('aria-label', t('mentor.fab'));
    collapseBtn.setAttribute('aria-label', t('mentor.collapse'));
    collapseBtn.title = t('mentor.collapse');
    for (let i = 0; i < MENTOR_ACTIONS.length; i++) {
      const action = MENTOR_ACTIONS[i]!;
      buttons[i]!.textContent = t(ACTION_KEYS[action] as Parameters<typeof t>[0]);
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

  return {
    root,
    fab,
    backdrop,
    open,
    close,
    isOpen: () => !root.classList.contains('sdq-mentor--collapsed') && !root.hidden,
    setVisible(visible: boolean) {
      root.hidden = !visible;
      fab.hidden = !visible || !root.classList.contains('sdq-mentor--collapsed');
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
