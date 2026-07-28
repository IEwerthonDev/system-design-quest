import type { DesignSessionStatus } from '@sdq/shared';

export const SESSION_STATUS_COPY: Record<
  Exclude<DesignSessionStatus, 'in_progress'>,
  { title: string; body: string }
> = {
  approved: {
    title: 'Design aprovado',
    body: 'Confirmar salva esta sessão como aprovada no seu histórico.',
  },
  rejected: {
    title: 'Design reprovado',
    body: 'Confirmar salva esta sessão como reprovada no seu histórico.',
  },
  partial: {
    title: 'Design parcial',
    body: 'Confirmar salva esta sessão como parcial no seu histórico.',
  },
};

export interface SessionConfirmModalOptions {
  status: Exclude<DesignSessionStatus, 'in_progress'>;
  onConfirm(): void | Promise<void>;
  onBack(): void | Promise<void>;
  /** Optional error message shown after a failed persist. */
  errorMessage?: string | null;
}

export interface SessionConfirmModal {
  root: HTMLElement;
  setError(message: string | null): void;
  destroy(): void;
}

function injectStyles(): void {
  if (document.getElementById('sdq-session-confirm-styles')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'sdq-session-confirm-styles';
  style.textContent = `
    .sdq-session-confirm {
      position: fixed;
      inset: 0;
      z-index: 40;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
      background: rgba(2, 6, 23, 0.55);
      box-sizing: border-box;
    }
    .sdq-session-confirm__dialog {
      width: min(420px, 100%);
      max-height: min(90dvh, 100%);
      display: flex;
      flex-direction: column;
      background: var(--sdq-bg-elevated);
      border: 1px solid rgba(148, 163, 184, 0.3);
      border-radius: var(--sdq-radius-lg);
      color: var(--sdq-text);
      font-family: var(--sdq-font);
      overflow: hidden;
      box-sizing: border-box;
    }
    .sdq-session-confirm__body {
      flex: 1 1 auto;
      overflow-y: auto;
      padding: 20px 18px 12px;
      min-height: 0;
    }
    .sdq-session-confirm__title {
      margin: 0 0 8px;
      font-size: 18px;
      font-weight: 700;
    }
    .sdq-session-confirm__text {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
      color: var(--sdq-text-muted);
    }
    .sdq-session-confirm__error {
      margin: 12px 0 0;
      color: var(--sdq-danger);
      font-size: 13px;
    }
    .sdq-session-confirm__actions {
      flex: 0 0 auto;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
      padding: 12px 18px 16px;
      border-top: 1px solid var(--sdq-border);
      background: var(--sdq-bg-surface);
    }
    .sdq-session-confirm__btn {
      border-radius: var(--sdq-radius-sm);
      padding: 10px 14px;
      font: 600 13px var(--sdq-font);
      cursor: pointer;
      border: 1px solid var(--sdq-border-strong);
      background: var(--sdq-bg-elevated);
      color: var(--sdq-text);
    }
    .sdq-session-confirm__btn--primary {
      background: var(--sdq-accent);
      border-color: var(--sdq-accent);
      color: #fff;
    }
  `;
  document.head.append(style);
}

export function mountSessionConfirmModal(
  container: HTMLElement,
  options: SessionConfirmModalOptions,
): SessionConfirmModal {
  injectStyles();

  const copy = SESSION_STATUS_COPY[options.status];
  const root = document.createElement('div');
  root.className = 'sdq-session-confirm';
  root.setAttribute('data-testid', 'session-confirm-modal');
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');

  const dialog = document.createElement('div');
  dialog.className = 'sdq-session-confirm__dialog';
  dialog.setAttribute('data-testid', 'session-confirm-dialog');

  const body = document.createElement('div');
  body.className = 'sdq-session-confirm__body';

  const title = document.createElement('h2');
  title.className = 'sdq-session-confirm__title';
  title.setAttribute('data-testid', 'session-confirm-title');
  title.textContent = copy.title;

  const text = document.createElement('p');
  text.className = 'sdq-session-confirm__text';
  text.setAttribute('data-testid', 'session-confirm-body');
  text.textContent = copy.body;

  const errorEl = document.createElement('p');
  errorEl.className = 'sdq-session-confirm__error';
  errorEl.setAttribute('data-testid', 'session-confirm-error');
  errorEl.hidden = !options.errorMessage;
  errorEl.textContent = options.errorMessage ?? '';

  body.append(title, text, errorEl);

  const actions = document.createElement('div');
  actions.className = 'sdq-session-confirm__actions';
  actions.setAttribute('data-testid', 'session-confirm-actions');

  const backBtn = document.createElement('button');
  backBtn.type = 'button';
  backBtn.className = 'sdq-session-confirm__btn';
  backBtn.setAttribute('data-testid', 'session-confirm-back');
  backBtn.textContent = 'Voltar';
  backBtn.addEventListener('click', () => {
    void options.onBack();
  });

  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'button';
  confirmBtn.className = 'sdq-session-confirm__btn sdq-session-confirm__btn--primary';
  confirmBtn.setAttribute('data-testid', 'session-confirm-confirm');
  confirmBtn.textContent = 'Confirmar';
  confirmBtn.addEventListener('click', () => {
    void options.onConfirm();
  });

  actions.append(backBtn, confirmBtn);
  dialog.append(body, actions);
  root.append(dialog);
  container.append(root);

  return {
    root,
    setError(message) {
      errorEl.hidden = !message;
      errorEl.textContent = message ?? '';
    },
    destroy() {
      root.remove();
    },
  };
}
