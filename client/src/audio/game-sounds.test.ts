import { describe, expect, it, vi, beforeEach } from 'vitest';
import { playGameSound } from './game-sounds';
import * as sound from './sound';
import { PREFERENCES_STORAGE_KEY, resetPreferences, savePreferences } from '../storage/preferences';

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

describe('playGameSound', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    resetPreferences(storage);
    vi.restoreAllMocks();
  });

  it('calls playSound enabled when soundEnabled true', () => {
    const spy = vi.spyOn(sound, 'playSound').mockImplementation(() => undefined);
    savePreferences({ soundEnabled: true }, storage);
    playGameSound('place', storage);
    expect(spy).toHaveBeenCalledWith('place', { enabled: true });
  });

  it('calls playSound disabled when muted', () => {
    const spy = vi.spyOn(sound, 'playSound').mockImplementation(() => undefined);
    savePreferences({ soundEnabled: false }, storage);
    playGameSound('connect', storage);
    expect(spy).toHaveBeenCalledWith('connect', { enabled: false });
    void PREFERENCES_STORAGE_KEY;
  });
});
