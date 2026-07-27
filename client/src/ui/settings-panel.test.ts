import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  loadPreferences,
  requestRedoTutorial,
  requestReplayOnboarding,
  resetPreferences,
  shouldShowOnboarding,
} from '../storage/preferences';
import { mountSettingsPanel } from './settings-panel';

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

describe('settings-panel', () => {
  let storage: MemoryStorage;
  let host: HTMLElement;

  beforeEach(() => {
    storage = new MemoryStorage();
    resetPreferences(storage);
    host = document.createElement('div');
    document.body.appendChild(host);
  });

  it('renders mute toggle, refazer tutorial and rever onboarding', () => {
    mountSettingsPanel(host, {
      storage,
      onRedoTutorial: () => undefined,
      onReplayOnboarding: () => undefined,
    });

    const panel = mountSettingsPanel;
    void panel;
    const settings = host.querySelector('[data-testid="settings-root"]');
    expect(settings).toBeTruthy();

    const openBtn = host.querySelector('[data-testid="settings-open"]') as HTMLButtonElement;
    openBtn.click();

    expect(host.querySelector('[data-testid="settings-panel"]')).toBeTruthy();
    expect(host.querySelector('[data-testid="settings-sound-toggle"]')).toBeTruthy();
    expect(host.querySelector('[data-testid="settings-redo-tutorial"]')).toBeTruthy();
    expect(host.querySelector('[data-testid="settings-replay-onboarding"]')).toBeTruthy();
  });

  it('Refazer tutorial sets guided URL Shortener prefs and invokes callback', () => {
    const onRedo = vi.fn();
    mountSettingsPanel(host, {
      storage,
      onRedoTutorial: onRedo,
      onReplayOnboarding: () => undefined,
    });

    (host.querySelector('[data-testid="settings-open"]') as HTMLButtonElement).click();
    (host.querySelector('[data-testid="settings-redo-tutorial"]') as HTMLButtonElement).click();

    const prefs = loadPreferences(storage);
    expect(prefs.guidedModeRequested).toBe(true);
    expect(prefs.libraryUnlocked).toBe(false);
    expect(prefs.experienceLevel).toBe('beginner');
    expect(onRedo).toHaveBeenCalled();
  });

  it('Rever onboarding clears completion so onboarding shows', () => {
    requestRedoTutorial(storage);
    const onReplay = vi.fn();
    mountSettingsPanel(host, {
      storage,
      onRedoTutorial: () => undefined,
      onReplayOnboarding: onReplay,
    });

    (host.querySelector('[data-testid="settings-open"]') as HTMLButtonElement).click();
    (
      host.querySelector('[data-testid="settings-replay-onboarding"]') as HTMLButtonElement
    ).click();

    expect(shouldShowOnboarding(loadPreferences(storage))).toBe(true);
    expect(onReplay).toHaveBeenCalled();
    void requestReplayOnboarding;
  });

  it('sound toggle persists mute', () => {
    mountSettingsPanel(host, {
      storage,
      onRedoTutorial: () => undefined,
      onReplayOnboarding: () => undefined,
    });
    (host.querySelector('[data-testid="settings-open"]') as HTMLButtonElement).click();
    const toggle = host.querySelector(
      '[data-testid="settings-sound-toggle"]',
    ) as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    toggle.checked = false;
    toggle.dispatchEvent(new Event('change'));
    expect(loadPreferences(storage).soundEnabled).toBe(false);
  });
});
