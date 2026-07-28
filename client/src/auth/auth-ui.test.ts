import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthMeResponse, DesignSessionRecord } from '@sdq/shared';
import { setLocale } from '../i18n/locale';
import {
  hasAnsweredMergePrompt,
  markMergePromptAnswered,
  mountAuthUi,
  parseAuthQuery,
} from './auth-ui';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();
  get length(): number {
    return this.data.size;
  }
  clear(): void {
    this.data.clear();
  }
  getItem(key: string): string | null {
    return this.data.has(key) ? (this.data.get(key) ?? null) : null;
  }
  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

const guest: AuthMeResponse = { authenticated: false };
const signedInNeedsNick: AuthMeResponse = {
  authenticated: true,
  userId: 'u1',
  displayName: 'Ada',
  email: 'ada@example.com',
};
const signedIn: AuthMeResponse = {
  ...signedInNeedsNick,
  publicNickname: 'Ada',
};

describe('auth-ui', () => {
  let container: HTMLElement;
  let storage: MemoryStorage;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    storage = new MemoryStorage();
    setLocale('en', storage);
  });

  afterEach(() => {
    container.remove();
    document.querySelectorAll('.sdq-auth-modal, .sdq-auth__toast').forEach((el) => el.remove());
  });

  it('parseAuthQuery reads ok|claim|error', () => {
    expect(parseAuthQuery('?auth=claim')).toBe('claim');
    expect(parseAuthQuery('auth=ok')).toBe('ok');
    expect(parseAuthQuery('?auth=error')).toBe('error');
    expect(parseAuthQuery('')).toBeNull();
  });

  it('shows Sign in when guest', async () => {
    const ui = mountAuthUi(container, {
      storage,
      fetchMeFn: vi.fn().mockResolvedValue(guest),
      clearAuthQuery: vi.fn(),
    });

    await vi.waitFor(() =>
      expect(container.querySelector('[data-testid="auth-sign-in"]')).not.toBeNull(),
    );
    expect(container.querySelector('[data-testid="auth-sign-out"]')).toBeNull();
    ui.destroy();
  });

  it('Sign in calls startGoogleLogin', async () => {
    const startGoogleLoginFn = vi.fn();
    const ui = mountAuthUi(container, {
      storage,
      fetchMeFn: vi.fn().mockResolvedValue(guest),
      startGoogleLoginFn,
      clearAuthQuery: vi.fn(),
    });

    await vi.waitFor(() =>
      expect(container.querySelector('[data-testid="auth-sign-in"]')).not.toBeNull(),
    );
    container.querySelector<HTMLButtonElement>('[data-testid="auth-sign-in"]')!.click();
    expect(startGoogleLoginFn).toHaveBeenCalled();
    ui.destroy();
  });

  it('shows signed-in chip and Sign out when authenticated with nick', async () => {
    const ui = mountAuthUi(container, {
      storage,
      fetchMeFn: vi.fn().mockResolvedValue(signedIn),
      loadLocalSessionsFn: () => [],
      clearAuthQuery: vi.fn(),
    });

    await vi.waitFor(() =>
      expect(container.querySelector('[data-testid="auth-sign-out"]')).not.toBeNull(),
    );
    expect(container.querySelector('[data-testid="auth-signed-in"]')?.textContent).toContain(
      'Ada',
    );
    expect(container.querySelector('[data-testid="auth-sign-in"]')).toBeNull();
    ui.destroy();
  });

  it('opens nick claim modal when ?auth=claim or me without nick', async () => {
    const clearAuthQuery = vi.fn();
    const ui = mountAuthUi(container, {
      storage,
      fetchMeFn: vi.fn().mockResolvedValue(signedInNeedsNick),
      locationSearch: '?auth=claim',
      clearAuthQuery,
      loadLocalSessionsFn: () => [],
    });

    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="auth-nick-modal"]')).not.toBeNull(),
    );
    expect(document.querySelector('[data-testid="auth-nick-input"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="auth-nick-submit"]')).not.toBeNull();
    expect(clearAuthQuery).toHaveBeenCalled();
    ui.destroy();
  });

  it('claim nickname submit closes modal and refreshes chip', async () => {
    const claimNicknameFn = vi.fn().mockResolvedValue(signedIn);
    const ui = mountAuthUi(container, {
      storage,
      fetchMeFn: vi.fn().mockResolvedValue(signedInNeedsNick),
      claimNicknameFn,
      locationSearch: '?auth=claim',
      clearAuthQuery: vi.fn(),
      loadLocalSessionsFn: () => [],
    });

    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="auth-nick-input"]')).not.toBeNull(),
    );
    const input = document.querySelector<HTMLInputElement>('[data-testid="auth-nick-input"]')!;
    input.value = 'Ada';
    document.querySelector<HTMLButtonElement>('[data-testid="auth-nick-submit"]')!.click();

    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="auth-nick-modal"]')).toBeNull(),
    );
    expect(claimNicknameFn).toHaveBeenCalledWith('Ada', expect.anything());
    expect(container.querySelector('[data-testid="auth-signed-in"]')?.textContent).toContain(
      'Ada',
    );
    ui.destroy();
  });

  it('prompts merge when signed in with local sessions', async () => {
    const sessions = [{ id: 's1' }] as DesignSessionRecord[];
    const mergeGuestSessionsFn = vi.fn().mockResolvedValue({ merged: 1, failed: [] });
    const ui = mountAuthUi(container, {
      storage,
      fetchMeFn: vi.fn().mockResolvedValue(signedIn),
      mergeGuestSessionsFn,
      loadLocalSessionsFn: () => sessions,
      locationSearch: '?auth=ok',
      clearAuthQuery: vi.fn(),
    });

    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="auth-merge-modal"]')).not.toBeNull(),
    );

    document.querySelector<HTMLButtonElement>('[data-testid="auth-merge-yes"]')!.click();

    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="auth-merge-modal"]')).toBeNull(),
    );
    expect(mergeGuestSessionsFn).toHaveBeenCalledWith(sessions, expect.anything());
    expect(hasAnsweredMergePrompt('u1', storage)).toBe(true);
    ui.destroy();
  });

  it('merge no skips API and marks answered', async () => {
    const mergeGuestSessionsFn = vi.fn();
    const ui = mountAuthUi(container, {
      storage,
      fetchMeFn: vi.fn().mockResolvedValue(signedIn),
      mergeGuestSessionsFn,
      loadLocalSessionsFn: () => [{ id: 's1' }] as DesignSessionRecord[],
      clearAuthQuery: vi.fn(),
    });

    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="auth-merge-no"]')).not.toBeNull(),
    );
    document.querySelector<HTMLButtonElement>('[data-testid="auth-merge-no"]')!.click();

    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="auth-merge-modal"]')).toBeNull(),
    );
    expect(mergeGuestSessionsFn).not.toHaveBeenCalled();
    expect(hasAnsweredMergePrompt('u1', storage)).toBe(true);
    ui.destroy();
  });

  it('does not re-prompt merge after answered', async () => {
    markMergePromptAnswered('u1', storage);
    const ui = mountAuthUi(container, {
      storage,
      fetchMeFn: vi.fn().mockResolvedValue(signedIn),
      loadLocalSessionsFn: () => [{ id: 's1' }] as DesignSessionRecord[],
      clearAuthQuery: vi.fn(),
    });

    await vi.waitFor(() =>
      expect(container.querySelector('[data-testid="auth-sign-out"]')).not.toBeNull(),
    );
    expect(document.querySelector('[data-testid="auth-merge-modal"]')).toBeNull();
    ui.destroy();
  });

  it('Sign out returns to guest controls', async () => {
    const logoutFn = vi.fn().mockResolvedValue(undefined);
    const ui = mountAuthUi(container, {
      storage,
      fetchMeFn: vi.fn().mockResolvedValue(signedIn),
      logoutFn,
      loadLocalSessionsFn: () => [],
      clearAuthQuery: vi.fn(),
    });

    await vi.waitFor(() =>
      expect(container.querySelector('[data-testid="auth-sign-out"]')).not.toBeNull(),
    );
    container.querySelector<HTMLButtonElement>('[data-testid="auth-sign-out"]')!.click();

    await vi.waitFor(() =>
      expect(container.querySelector('[data-testid="auth-sign-in"]')).not.toBeNull(),
    );
    expect(logoutFn).toHaveBeenCalled();
    ui.destroy();
  });

  it('shows error toast for ?auth=error', async () => {
    const ui = mountAuthUi(container, {
      storage,
      fetchMeFn: vi.fn().mockResolvedValue(guest),
      locationSearch: '?auth=error',
      clearAuthQuery: vi.fn(),
    });

    await vi.waitFor(() =>
      expect(document.querySelector('[data-testid="auth-toast"]')?.textContent).toMatch(
        /sign-in failed/i,
      ),
    );
    ui.destroy();
  });
});
