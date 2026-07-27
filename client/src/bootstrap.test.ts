import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bootstrapApp } from './bootstrap';
import {
  completeOnboardingExperienced,
  completeOnboardingBeginner,
  isProblemLibraryUnlocked,
  resetPreferences,
} from './storage/preferences';

vi.mock('./session/phase-navigation', () => ({
  mountPhaseNavigation: vi.fn(() => ({
    root: document.createElement('div'),
    sync: vi.fn(),
    destroy: vi.fn(),
  })),
}));

vi.mock('./ui/onboarding', () => ({
  mountOnboarding: vi.fn(({ onComplete, onSkip }) => {
    const root = document.createElement('div');
    root.setAttribute('data-testid', 'onboarding-mock');
    return { root, getCurrentScreenIndex: () => 0 };
  }),
}));

vi.mock('./ui/problem-library', () => ({
  mountProblemLibrary: vi.fn(({ onSelect }) => {
    const root = document.createElement('div');
    root.setAttribute('data-testid', 'library-mock');
    return { root, setFilter: vi.fn(), getFilter: vi.fn(() => 'all' as const) };
  }),
}));

import { mountPhaseNavigation } from './session/phase-navigation';
import { mountOnboarding } from './ui/onboarding';
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

  it('shows onboarding when preferences indicate first visit', () => {
    bootstrapApp(container, null, { storage });
    expect(mountOnboarding).toHaveBeenCalled();
    expect(mountProblemLibrary).not.toHaveBeenCalled();
  });

  it('routes experienced users to problem library', () => {
    completeOnboardingExperienced(storage);
    bootstrapApp(container, null, { storage });

    expect(mountProblemLibrary).toHaveBeenCalled();
    expect(mountPhaseNavigation).not.toHaveBeenCalled();
  });

  it('routes beginner guided users directly to URL Shortener', () => {
    completeOnboardingBeginner(storage);
    bootstrapApp(container, null, { storage });

    expect(mountPhaseNavigation).toHaveBeenCalledWith(
      container,
      expect.objectContaining({
        problemId: 'url-shortener',
        guidedMode: true,
      }),
    );
    expect(mountProblemLibrary).not.toHaveBeenCalled();
  });

  it('routes to library when tutorial unlocked even for beginners', () => {
    completeOnboardingBeginner(storage);
    storage.setItem(
      'sdq-user-preferences',
      JSON.stringify({
        onboardingCompleted: true,
        experienceLevel: 'beginner',
        guidedModeRequested: true,
        libraryUnlocked: true,
        soundEnabled: true,
      }),
    );

    bootstrapApp(container, null, { storage });
    expect(mountProblemLibrary).toHaveBeenCalled();
  });

  it('Refazer tutorial from settings starts guided URL Shortener session', () => {
    completeOnboardingExperienced(storage);
    bootstrapApp(container, null, { storage });
    expect(mountProblemLibrary).toHaveBeenCalled();
    vi.clearAllMocks();

    (
      container.querySelector('[data-testid="settings-open"]') as HTMLButtonElement
    ).click();
    (
      container.querySelector('[data-testid="settings-redo-tutorial"]') as HTMLButtonElement
    ).click();

    expect(mountPhaseNavigation).toHaveBeenCalledWith(
      container,
      expect.objectContaining({
        problemId: 'url-shortener',
        guidedMode: true,
      }),
    );
    expect(mountProblemLibrary).not.toHaveBeenCalled();
  });
});

describe('library unlock flag', () => {
  it('defaults to false for new users', () => {
    expect(isProblemLibraryUnlocked()).toBe(false);
  });
});
