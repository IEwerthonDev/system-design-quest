import { beforeEach, describe, expect, it } from 'vitest';
import { CATALOG_EN } from './catalog-en';
import { CATALOG_PT_BR } from './catalog-pt-BR';
import { setLocale } from './locale';
import { t } from './t';

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

describe('UI string catalogs + t()', () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it('covers library, sessions, result, continue, share, and undo chrome keys', () => {
    const requiredPrefixes = [
      'library.',
      'sessions.',
      'result.',
      'continue.',
      'share.',
      'undo.',
      'redo.',
    ];
    const keys = Object.keys(CATALOG_EN);
    for (const prefix of requiredPrefixes) {
      expect(keys.some((key) => key.startsWith(prefix))).toBe(true);
    }
    expect(Object.keys(CATALOG_PT_BR).sort()).toEqual(Object.keys(CATALOG_EN).sort());
  });

  it('returns English and Portuguese strings for the same key', () => {
    expect(t('library.title', 'en')).toBe('Problems');
    expect(t('library.title', 'pt-BR')).toBe('Problemas');
    expect(t('result.openSessions', 'en')).toBe('View in My sessions');
    expect(t('result.openSessions', 'pt-BR')).toBe('Ver em Minhas sessões');
    expect(t('continue.cta', 'pt-BR')).toBe('Continuar de onde parei');
    expect(t('share.cta', 'en')).toBe('Share');
    expect(t('undo.label', 'pt-BR')).toBe('Desfazer');
  });

  it('uses stored locale when locale arg omitted', () => {
    setLocale('en', storage);
    expect(t('library.sessions', undefined, storage)).toBe('My sessions');
    setLocale('pt-BR', storage);
    expect(t('library.sessions', undefined, storage)).toBe('Minhas sessões');
  });

  it('returns the key string when the key is missing (dev-safe)', () => {
    expect(t('library.doesNotExist', 'en')).toBe('library.doesNotExist');
    expect(t('totally.unknown', 'pt-BR')).toBe('totally.unknown');
  });

  it('keeps industry jargon English in both locales', () => {
    expect(t('library.action.study', 'pt-BR')).toBe('Study');
    expect(t('library.action.speedrun', 'pt-BR')).toBe('Speedrun');
    expect(t('library.action.study', 'en')).toBe('Study');
  });
});
