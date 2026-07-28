import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { bootstrapApp } from '../bootstrap';
import { resetSessionStore } from '../session/session-store';
import {
  completeOnboardingBeginner,
  completeOnboardingSkip,
  loadPreferences,
  resetPreferences,
  savePreferences,
  shouldShowOnboarding,
} from '../storage/preferences';
import { ONBOARDING_SCREENS, mountOnboarding } from './onboarding';

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => [...store.keys()][index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

describe('onboarding', () => {
  let container: HTMLDivElement;
  let storage: Storage;

  beforeEach(() => {
    storage = createMemoryStorage();
    resetPreferences(storage);
    resetSessionStore();
    container = document.createElement('div');
    document.body.append(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('defines three onboarding screens', () => {
    expect(ONBOARDING_SCREENS).toHaveLength(3);
    expect(ONBOARDING_SCREENS.map((screen) => screen.id)).toEqual([
      'what-is-sd',
      'game-flow',
      'experience-choice',
    ]);
  });

  it('shouldShowOnboarding is true until onboarding is completed', () => {
    expect(shouldShowOnboarding(loadPreferences(storage))).toBe(true);
    completeOnboardingSkip(storage);
    expect(shouldShowOnboarding(loadPreferences(storage))).toBe(false);
  });

  it('persists skip preference so onboarding is not shown again', () => {
    completeOnboardingSkip(storage);
    const prefs = loadPreferences(storage);
    expect(prefs.onboardingCompleted).toBe(true);
    expect(prefs.guidedModeRequested).toBe(false);
  });

  it('persists beginner preference with guided mode requested', () => {
    completeOnboardingBeginner(storage);
    expect(loadPreferences(storage)).toMatchObject({
      onboardingCompleted: true,
      experienceLevel: 'beginner',
      guidedModeRequested: true,
    });
  });

  it('renders the first onboarding screen on mount', () => {
    mountOnboarding(container, { onComplete: () => undefined, onSkip: () => undefined });

    expect(container.querySelector('[data-testid="onboarding-title"]')?.textContent).toBe(
      ONBOARDING_SCREENS[0].title,
    );
    expect(container.querySelector('[data-testid="onboarding-step"]')?.textContent).toBe(
      'Passo 1 de 3',
    );
    expect(container.querySelector('[data-testid="onboarding-next"]')).toBeTruthy();
  });

  it('advances through informational screens to the experience choice', () => {
    const panel = mountOnboarding(container, {
      onComplete: () => undefined,
      onSkip: () => undefined,
    });

    container.querySelector<HTMLButtonElement>('[data-testid="onboarding-next"]')!.click();
    expect(panel.getCurrentScreenIndex()).toBe(1);
    expect(container.querySelector('[data-testid="onboarding-title"]')?.textContent).toBe(
      ONBOARDING_SCREENS[1].title,
    );

    container.querySelector<HTMLButtonElement>('[data-testid="onboarding-next"]')!.click();
    expect(panel.getCurrentScreenIndex()).toBe(2);
    expect(container.querySelector('[data-testid="onboarding-beginner"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="onboarding-experienced"]')).toBeTruthy();
  });

  it('calls onSkip when Pular is clicked', () => {
    const onSkip = vi.fn();
    mountOnboarding(container, { onComplete: () => undefined, onSkip });

    container.querySelector<HTMLButtonElement>('[data-testid="onboarding-skip"]')!.click();
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('calls onComplete with guided mode when Sou iniciante is chosen', () => {
    const onComplete = vi.fn();
    mountOnboarding(container, { onComplete, onSkip: () => undefined });

    container.querySelector<HTMLButtonElement>('[data-testid="onboarding-next"]')!.click();
    container.querySelector<HTMLButtonElement>('[data-testid="onboarding-next"]')!.click();
    container.querySelector<HTMLButtonElement>('[data-testid="onboarding-beginner"]')!.click();

    expect(onComplete).toHaveBeenCalledWith({
      experienceLevel: 'beginner',
      guidedModeRequested: true,
    });
  });

  it('calls onComplete without guided mode when Já sei o básico is chosen', () => {
    const onComplete = vi.fn();
    mountOnboarding(container, { onComplete, onSkip: () => undefined });

    container.querySelector<HTMLButtonElement>('[data-testid="onboarding-next"]')!.click();
    container.querySelector<HTMLButtonElement>('[data-testid="onboarding-next"]')!.click();
    container.querySelector<HTMLButtonElement>('[data-testid="onboarding-experienced"]')!.click();

    expect(onComplete).toHaveBeenCalledWith({
      experienceLevel: 'experienced',
      guidedModeRequested: false,
    });
  });

  describe('bootstrapApp', () => {
    it('opens the problem library as home on first visit', () => {
      bootstrapApp(container, null, { storage });

      expect(container.querySelector('[data-testid="onboarding-panel"]')).toBeNull();
      expect(container.querySelector('[data-testid="problem-library"]')).toBeTruthy();
    });

    it('opens library for returning users with saved preferences', () => {
      savePreferences({ onboardingCompleted: true }, storage);

      bootstrapApp(container, null, { storage });

      expect(container.querySelector('[data-testid="onboarding-panel"]')).toBeNull();
      expect(container.querySelector('[data-testid="problem-library"]')).toBeTruthy();
    });

    it('starts a study session from the library without guided mode', () => {
      bootstrapApp(container, null, { storage });

      expect(container.querySelector('[data-testid="problem-library"]')).toBeTruthy();

      container
        .querySelector<HTMLButtonElement>('[data-testid="problem-study-url-shortener"]')
        ?.click();

      expect(window.__GAME_STATE__).toMatchObject({
        guidedMode: false,
        phase: 'briefing',
      });
    });
  });
});
