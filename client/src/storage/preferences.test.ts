import { describe, expect, it, beforeEach } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  resetPreferences,
  savePreferences,
} from './preferences';

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

describe('preferences soundEnabled', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    resetPreferences(storage);
  });

  it('defaults soundEnabled to true', () => {
    expect(loadPreferences(storage).soundEnabled).toBe(true);
    expect(DEFAULT_PREFERENCES.soundEnabled).toBe(true);
  });

  it('persists soundEnabled mute toggle', () => {
    savePreferences({ soundEnabled: false }, storage);
    expect(loadPreferences(storage).soundEnabled).toBe(false);
    savePreferences({ soundEnabled: true }, storage);
    expect(loadPreferences(storage).soundEnabled).toBe(true);
  });

  it('fills soundEnabled true when legacy prefs omit the field', () => {
    storage.setItem(
      'sdq-user-preferences',
      JSON.stringify({
        onboardingCompleted: true,
        experienceLevel: 'experienced',
        guidedModeRequested: false,
        libraryUnlocked: true,
      }),
    );
    expect(loadPreferences(storage).soundEnabled).toBe(true);
  });
});
