import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, getLocale, LOCALE_STORAGE_KEY, setLocale } from './locale';

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

describe('locale preference storage', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('returns pt-BR when unset', () => {
    expect(getLocale(storage)).toBe('pt-BR');
    expect(DEFAULT_LOCALE).toBe('pt-BR');
  });

  it('persists en and pt-BR only', () => {
    setLocale('en', storage);
    expect(storage.getItem(LOCALE_STORAGE_KEY)).toBe('en');
    expect(getLocale(storage)).toBe('en');

    setLocale('pt-BR', storage);
    expect(storage.getItem(LOCALE_STORAGE_KEY)).toBe('pt-BR');
    expect(getLocale(storage)).toBe('pt-BR');
  });

  it('falls back to pt-BR for invalid stored values', () => {
    storage.setItem(LOCALE_STORAGE_KEY, 'fr');
    expect(getLocale(storage)).toBe('pt-BR');

    storage.setItem(LOCALE_STORAGE_KEY, '');
    expect(getLocale(storage)).toBe('pt-BR');

    storage.setItem(LOCALE_STORAGE_KEY, 'pt');
    expect(getLocale(storage)).toBe('pt-BR');
  });
});
