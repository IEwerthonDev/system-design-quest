import { describe, expect, it, beforeEach } from 'vitest';
import { loadPreferences, resetPreferences } from '../storage/preferences';
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

  it('renders mute toggle in the panel', () => {
    mountSettingsPanel(host, { storage });

    const settings = host.querySelector('[data-testid="settings-root"]');
    expect(settings).toBeTruthy();

    const openBtn = host.querySelector('[data-testid="settings-open"]') as HTMLButtonElement;
    openBtn.click();

    expect(host.querySelector('[data-testid="settings-panel"]')).toBeTruthy();
    expect(host.querySelector('[data-testid="settings-sound-toggle"]')).toBeTruthy();
    expect(host.querySelector('[data-testid="settings-redo-tutorial"]')).toBeNull();
    expect(host.querySelector('[data-testid="settings-replay-onboarding"]')).toBeNull();
  });

  it('mounts inline in an anchor slot for canvas header', () => {
    const anchor = document.createElement('div');
    host.append(anchor);
    const panel = mountSettingsPanel(host, { storage, anchor });

    expect(anchor.querySelector('[data-testid="settings-open"]')).toBeTruthy();
    expect(anchor.querySelector('.sdq-settings-btn--in-header')).toBeTruthy();

    panel.setVisible(false);
    expect(anchor.querySelector('[data-testid="settings-root"]')?.hasAttribute('hidden')).toBe(true);
  });

  it('sound toggle persists mute', () => {
    mountSettingsPanel(host, { storage });
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
