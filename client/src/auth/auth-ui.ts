import type { AuthMeResponse, DesignSessionRecord } from '@sdq/shared';
import { t } from '../i18n/t';
import { loadLocalSessions } from '../sessions/local-sessions';
import {
  AuthApiError,
  claimNickname,
  fetchMe,
  logout,
  mergeGuestSessions,
  startGoogleLogin,
  type AuthApiOptions,
} from './auth-api';

export const MERGE_PROMPT_STORAGE_PREFIX = 'sdq-auth-merge-answered:';

export type AuthQueryFlag = 'ok' | 'claim' | 'error' | null;

export interface MountAuthUiOptions {
  fetchMeFn?: typeof fetchMe;
  logoutFn?: typeof logout;
  claimNicknameFn?: typeof claimNickname;
  mergeGuestSessionsFn?: typeof mergeGuestSessions;
  startGoogleLoginFn?: typeof startGoogleLogin;
  loadLocalSessionsFn?: (storage?: Storage) => DesignSessionRecord[];
  storage?: Storage;
  /** Override `window.location.search` for tests (e.g. `?auth=claim`). */
  locationSearch?: string;
  /** Clear/replace URL after consuming `?auth=` (defaults to history.replaceState). */
  clearAuthQuery?: () => void;
  authApiOptions?: AuthApiOptions;
  onAuthChange?: (me: AuthMeResponse) => void;
}

export interface AuthUi {
  root: HTMLElement;
  getMe(): AuthMeResponse | null;
  refresh(): Promise<void>;
  destroy(): void;
}

function resolveStorage(storage?: Storage): Storage | undefined {
  if (storage) {
    return storage;
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage;
  }
  return undefined;
}

function mergeAnsweredKey(userId: string): string {
  return `${MERGE_PROMPT_STORAGE_PREFIX}${userId}`;
}

export function hasAnsweredMergePrompt(userId: string, storage?: Storage): boolean {
  const target = resolveStorage(storage);
  if (!target) {
    return false;
  }
  return target.getItem(mergeAnsweredKey(userId)) === '1';
}

export function markMergePromptAnswered(userId: string, storage?: Storage): void {
  const target = resolveStorage(storage);
  target?.setItem(mergeAnsweredKey(userId), '1');
}

export function parseAuthQuery(search: string): AuthQueryFlag {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const auth = params.get('auth');
  if (auth === 'ok' || auth === 'claim' || auth === 'error') {
    return auth;
  }
  return null;
}

export function clearAuthQueryFromLocation(): void {
  if (typeof window === 'undefined') {
    return;
  }
  const url = new URL(window.location.href);
  if (!url.searchParams.has('auth')) {
    return;
  }
  url.searchParams.delete('auth');
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, '', next);
}

function injectAuthStyles(): void {
  if (document.getElementById('sdq-auth-styles')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'sdq-auth-styles';
  style.textContent = `
    .sdq-auth {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .sdq-auth__btn {
      border: 1px solid var(--sdq-border);
      background: transparent;
      color: var(--sdq-text-muted);
      border-radius: var(--sdq-radius-sm, 6px);
      padding: 10px 16px;
      font: 500 13px var(--sdq-font);
      cursor: pointer;
      white-space: nowrap;
      min-height: 44px;
      touch-action: manipulation;
    }
    .sdq-auth__btn:hover {
      border-color: var(--sdq-border-strong);
      color: var(--sdq-text);
    }
    .sdq-auth__btn--primary {
      background: var(--sdq-accent, #c9a962);
      border-color: var(--sdq-accent, #c9a962);
      color: #0c0c0e;
    }
    .sdq-auth__chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font: 500 13px var(--sdq-font);
      color: var(--sdq-text);
      max-width: 180px;
    }
    .sdq-auth__avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      object-fit: cover;
      background: var(--sdq-bg-elevated);
      border: 1px solid var(--sdq-border);
      flex-shrink: 0;
    }
    .sdq-auth__label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .sdq-auth__toast {
      position: fixed;
      bottom: calc(16px + env(safe-area-inset-bottom));
      left: 50%;
      transform: translateX(-50%);
      z-index: 50;
      max-width: min(420px, calc(100vw - 24px));
      padding: 12px 16px;
      border-radius: var(--sdq-radius-sm, 6px);
      background: var(--sdq-bg-elevated);
      border: 1px solid var(--sdq-border);
      color: var(--sdq-text);
      font: 500 13px var(--sdq-font);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    }
    .sdq-auth__toast--error {
      border-color: rgba(239, 68, 68, 0.45);
      color: #fecaca;
    }
    .sdq-auth-modal {
      position: fixed;
      inset: 0;
      z-index: 45;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
      background: rgba(2, 6, 23, 0.55);
      box-sizing: border-box;
    }
    .sdq-auth-modal__dialog {
      width: min(420px, 100%);
      background: var(--sdq-bg-elevated);
      border: 1px solid rgba(148, 163, 184, 0.3);
      border-radius: var(--sdq-radius-lg, 12px);
      color: var(--sdq-text);
      font-family: var(--sdq-font);
      overflow: hidden;
    }
    .sdq-auth-modal__body {
      padding: 20px 18px 12px;
    }
    .sdq-auth-modal__title {
      margin: 0 0 8px;
      font-size: 18px;
      font-weight: 700;
    }
    .sdq-auth-modal__text {
      margin: 0 0 14px;
      font-size: 14px;
      line-height: 1.5;
      color: var(--sdq-text-muted);
    }
    .sdq-auth-modal__input {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 12px;
      border-radius: var(--sdq-radius-sm, 6px);
      border: 1px solid var(--sdq-border-strong);
      background: var(--sdq-bg-surface, #141416);
      color: var(--sdq-text);
      font: 500 14px var(--sdq-font);
      margin-bottom: 8px;
    }
    .sdq-auth-modal__error {
      margin: 0 0 8px;
      color: var(--sdq-danger, #f87171);
      font-size: 13px;
      min-height: 1.2em;
    }
    .sdq-auth-modal__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
      padding: 12px 18px 16px;
      border-top: 1px solid var(--sdq-border);
      background: var(--sdq-bg-surface, #141416);
    }
  `;
  document.head.append(style);
}

export function mountAuthUi(
  container: HTMLElement,
  options: MountAuthUiOptions = {},
): AuthUi {
  injectAuthStyles();

  const storage = options.storage;
  const fetchMeFn = options.fetchMeFn ?? fetchMe;
  const logoutFn = options.logoutFn ?? logout;
  const claimNicknameFn = options.claimNicknameFn ?? claimNickname;
  const mergeGuestSessionsFn = options.mergeGuestSessionsFn ?? mergeGuestSessions;
  const startGoogleLoginFn = options.startGoogleLoginFn ?? startGoogleLogin;
  const loadLocalSessionsFn = options.loadLocalSessionsFn ?? loadLocalSessions;
  const clearAuthQuery = options.clearAuthQuery ?? clearAuthQueryFromLocation;
  const apiOpts = options.authApiOptions ?? {};

  const root = document.createElement('div');
  root.className = 'sdq-auth';
  root.setAttribute('data-testid', 'auth-controls');
  container.append(root);

  let me: AuthMeResponse | null = null;
  let toastEl: HTMLElement | null = null;
  let toastTimer = 0;
  let nickModal: HTMLElement | null = null;
  let mergeModal: HTMLElement | null = null;
  let destroyed = false;

  const showToast = (message: string, kind: 'info' | 'error' = 'info'): void => {
    toastEl?.remove();
    if (toastTimer) {
      window.clearTimeout(toastTimer);
    }
    toastEl = document.createElement('div');
    toastEl.className = `sdq-auth__toast${kind === 'error' ? ' sdq-auth__toast--error' : ''}`;
    toastEl.setAttribute('data-testid', 'auth-toast');
    toastEl.textContent = message;
    document.body.append(toastEl);
    toastTimer = window.setTimeout(() => {
      toastEl?.remove();
      toastEl = null;
    }, 4200);
  };

  const closeNickModal = (): void => {
    nickModal?.remove();
    nickModal = null;
  };

  const closeMergeModal = (): void => {
    mergeModal?.remove();
    mergeModal = null;
  };

  const openNickModal = (): void => {
    if (nickModal) {
      return;
    }
    const overlay = document.createElement('div');
    overlay.className = 'sdq-auth-modal';
    overlay.setAttribute('data-testid', 'auth-nick-modal');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const dialog = document.createElement('div');
    dialog.className = 'sdq-auth-modal__dialog';

    const body = document.createElement('div');
    body.className = 'sdq-auth-modal__body';

    const title = document.createElement('h2');
    title.className = 'sdq-auth-modal__title';
    title.textContent = t('auth.nick.title', undefined, storage);

    const text = document.createElement('p');
    text.className = 'sdq-auth-modal__text';
    text.textContent = t('auth.nick.hint', undefined, storage);

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'sdq-auth-modal__input';
    input.setAttribute('data-testid', 'auth-nick-input');
    input.autocomplete = 'username';
    input.maxLength = 20;
    input.placeholder = 'player_name';

    const error = document.createElement('p');
    error.className = 'sdq-auth-modal__error';
    error.setAttribute('data-testid', 'auth-nick-error');

    body.append(title, text, input, error);

    const actions = document.createElement('div');
    actions.className = 'sdq-auth-modal__actions';

    const submit = document.createElement('button');
    submit.type = 'button';
    submit.className = 'sdq-auth__btn sdq-auth__btn--primary';
    submit.setAttribute('data-testid', 'auth-nick-submit');
    submit.textContent = t('auth.nick.submit', undefined, storage);

    const submitNick = async (): Promise<void> => {
      error.textContent = '';
      submit.disabled = true;
      try {
        const next = await claimNicknameFn(input.value.trim(), apiOpts);
        me = next;
        options.onAuthChange?.(next);
        closeNickModal();
        renderControls();
        void maybePromptMerge(next);
      } catch (err) {
        if (err instanceof AuthApiError && err.status === 409) {
          error.textContent = t('auth.nick.taken', undefined, storage);
        } else if (err instanceof AuthApiError && err.status === 400) {
          error.textContent = t('auth.nick.invalid', undefined, storage);
        } else {
          error.textContent =
            err instanceof Error ? err.message : t('auth.nick.invalid', undefined, storage);
        }
      } finally {
        submit.disabled = false;
      }
    };

    submit.addEventListener('click', () => {
      void submitNick();
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        void submitNick();
      }
    });

    actions.append(submit);
    dialog.append(body, actions);
    overlay.append(dialog);
    document.body.append(overlay);
    nickModal = overlay;
    input.focus();
  };

  const openMergeModal = (userId: string, sessions: DesignSessionRecord[]): void => {
    if (mergeModal) {
      return;
    }
    const overlay = document.createElement('div');
    overlay.className = 'sdq-auth-modal';
    overlay.setAttribute('data-testid', 'auth-merge-modal');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const dialog = document.createElement('div');
    dialog.className = 'sdq-auth-modal__dialog';

    const body = document.createElement('div');
    body.className = 'sdq-auth-modal__body';

    const title = document.createElement('h2');
    title.className = 'sdq-auth-modal__title';
    title.textContent = t('auth.merge.title', undefined, storage);

    const text = document.createElement('p');
    text.className = 'sdq-auth-modal__text';
    text.textContent = t('auth.merge.body', undefined, storage);

    body.append(title, text);

    const actions = document.createElement('div');
    actions.className = 'sdq-auth-modal__actions';

    const noBtn = document.createElement('button');
    noBtn.type = 'button';
    noBtn.className = 'sdq-auth__btn';
    noBtn.setAttribute('data-testid', 'auth-merge-no');
    noBtn.textContent = t('auth.merge.no', undefined, storage);

    const yesBtn = document.createElement('button');
    yesBtn.type = 'button';
    yesBtn.className = 'sdq-auth__btn sdq-auth__btn--primary';
    yesBtn.setAttribute('data-testid', 'auth-merge-yes');
    yesBtn.textContent = t('auth.merge.yes', undefined, storage);

    const finish = (): void => {
      markMergePromptAnswered(userId, storage);
      closeMergeModal();
    };

    noBtn.addEventListener('click', () => {
      finish();
    });

    yesBtn.addEventListener('click', () => {
      void (async () => {
        yesBtn.disabled = true;
        noBtn.disabled = true;
        try {
          await mergeGuestSessionsFn(sessions, apiOpts);
        } catch {
          showToast(t('auth.merge.failed', undefined, storage), 'error');
        } finally {
          finish();
        }
      })();
    });

    actions.append(noBtn, yesBtn);
    dialog.append(body, actions);
    overlay.append(dialog);
    document.body.append(overlay);
    mergeModal = overlay;
  };

  const maybePromptMerge = async (current: AuthMeResponse): Promise<void> => {
    if (!current.authenticated || !current.userId || !current.publicNickname) {
      return;
    }
    if (hasAnsweredMergePrompt(current.userId, storage)) {
      return;
    }
    const local = loadLocalSessionsFn(storage);
    if (local.length === 0) {
      markMergePromptAnswered(current.userId, storage);
      return;
    }
    openMergeModal(current.userId, local);
  };

  const renderControls = (): void => {
    root.replaceChildren();

    if (!me?.authenticated) {
      const signIn = document.createElement('button');
      signIn.type = 'button';
      signIn.className = 'sdq-auth__btn sdq-auth__btn--primary';
      signIn.setAttribute('data-testid', 'auth-sign-in');
      signIn.textContent = t('auth.signIn', undefined, storage);
      signIn.addEventListener('click', () => {
        startGoogleLoginFn();
      });
      root.append(signIn);
      return;
    }

    const chip = document.createElement('div');
    chip.className = 'sdq-auth__chip';
    chip.setAttribute('data-testid', 'auth-signed-in');

    if (me.pictureUrl) {
      const avatar = document.createElement('img');
      avatar.className = 'sdq-auth__avatar';
      avatar.src = me.pictureUrl;
      avatar.alt = '';
      chip.append(avatar);
    }

    const label = document.createElement('span');
    label.className = 'sdq-auth__label';
    label.textContent = me.publicNickname ?? me.displayName ?? me.email ?? 'Signed in';
    chip.append(label);

    const signOut = document.createElement('button');
    signOut.type = 'button';
    signOut.className = 'sdq-auth__btn';
    signOut.setAttribute('data-testid', 'auth-sign-out');
    signOut.textContent = t('auth.signOut', undefined, storage);
    signOut.addEventListener('click', () => {
      void (async () => {
        try {
          await logoutFn(apiOpts);
        } catch {
          // Still drop to guest UI if cookie clear partially failed
        }
        me = { authenticated: false };
        options.onAuthChange?.(me);
        closeNickModal();
        closeMergeModal();
        renderControls();
      })();
    });

    root.append(chip, signOut);
  };

  const refresh = async (): Promise<void> => {
    if (destroyed) {
      return;
    }
    try {
      me = await fetchMeFn(apiOpts);
    } catch {
      me = { authenticated: false };
    }
    options.onAuthChange?.(me);
    renderControls();

    const search =
      options.locationSearch ??
      (typeof window !== 'undefined' ? window.location.search : '');
    const authFlag = parseAuthQuery(search);

    if (authFlag === 'error') {
      showToast(t('auth.error', undefined, storage), 'error');
    } else if (authFlag === 'ok') {
      showToast(t('auth.ok', undefined, storage));
    }

    if (authFlag) {
      clearAuthQuery();
    }

    const needsNick =
      authFlag === 'claim' ||
      (me.authenticated && (!me.publicNickname || me.publicNickname === ''));

    if (needsNick && me.authenticated) {
      openNickModal();
      return;
    }

    if (me.authenticated && me.publicNickname) {
      await maybePromptMerge(me);
    }
  };

  renderControls();
  void refresh();

  return {
    root,
    getMe: () => me,
    refresh,
    destroy: () => {
      destroyed = true;
      if (toastTimer) {
        window.clearTimeout(toastTimer);
      }
      toastEl?.remove();
      closeNickModal();
      closeMergeModal();
      root.remove();
    },
  };
}
