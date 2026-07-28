import type { ArchitectureFinding, MentorAction, MentorResult } from '@sdq/shared';
import { MENTOR_ACTIONS } from '@sdq/shared';
import { getLocale } from '../i18n/locale';
import { t } from '../i18n/t';
import { askMentor } from '../mentor/mentor-api';
import { getGraph } from '../session/session-store';

export interface MentorPanel {
  root: HTMLElement;
  destroy(): void;
}

export interface MountMentorPanelOptions {
  getFindings(): ArchitectureFinding[];
  askMentorFn?: typeof askMentor;
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
    .sdq-mentor__title {
      font-weight: 700;
      margin: 0 0 8px;
      font-size: 11px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--sdq-text-subtle);
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
  const root = document.createElement('aside');
  root.className = 'sdq-mentor';
  root.setAttribute('data-testid', 'mentor-panel');

  const title = document.createElement('h2');
  title.className = 'sdq-mentor__title';
  title.textContent = t('mentor.title');

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
    btn.textContent = t(ACTION_KEYS[action] as Parameters<typeof t>[0]);
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

  root.append(title, actions, resultTitle, resultBody);
  container.append(root);

  return {
    root,
    destroy() {
      root.remove();
    },
  };
}
