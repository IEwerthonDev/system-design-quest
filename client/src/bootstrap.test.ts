import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bootstrapApp, clearAppUi } from './bootstrap';
import { completeOnboardingExperienced, resetPreferences } from './storage/preferences';

vi.mock('./session/phase-navigation', () => ({
  mountPhaseNavigation: vi.fn(() => ({
    root: document.createElement('div'),
    sync: vi.fn(),
    destroy: vi.fn(),
  })),
}));

vi.mock('./ui/problem-library', () => ({
  mountProblemLibrary: vi.fn(({ onSelect }) => {
    const root = document.createElement('div');
    root.setAttribute('data-testid', 'library-mock');
    return { root, setFilter: vi.fn(), getFilter: vi.fn(() => 'all' as const) };
  }),
}));

import { mountPhaseNavigation } from './session/phase-navigation';
import { mountProblemLibrary } from './ui/problem-library';

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe('bootstrapApp', () => {
  let container: HTMLDivElement;
  let storage: MemoryStorage;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    storage = new MemoryStorage();
    resetPreferences(storage);
    vi.clearAllMocks();
  });

  afterEach(() => {
    container.remove();
  });

  it('preserves the blueprint host when clearing UI chrome', () => {
    const host = document.createElement('div');
    host.id = 'blueprint-root';
    const chrome = document.createElement('div');
    chrome.setAttribute('data-testid', 'chrome');
    container.append(host, chrome);

    clearAppUi(container, host);

    expect(container.contains(host)).toBe(true);
    expect(container.querySelector('[data-testid="chrome"]')).toBeNull();
  });

  it('always opens the problem library as home', () => {
    bootstrapApp(container, null, { storage });
    expect(mountProblemLibrary).toHaveBeenCalled();
    expect(mountPhaseNavigation).not.toHaveBeenCalled();
  });

  it('opens problem library for returning users', () => {
    completeOnboardingExperienced(storage);
    bootstrapApp(container, null, { storage });

    expect(mountProblemLibrary).toHaveBeenCalled();
    expect(mountPhaseNavigation).not.toHaveBeenCalled();
  });

  it('does not mount global settings on the library screen', () => {
    bootstrapApp(container, null, { storage });
    expect(container.querySelector('[data-testid="settings-open"]')).toBeNull();
  });
});
