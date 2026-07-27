import { describe, expect, it, beforeEach } from 'vitest';
import { isValidNickname } from '@sdq/shared';
import {
  generateDefaultNickname,
  getOrCreateNickname,
  loadNickname,
  resetNickname,
  saveNickname,
} from './nickname';

describe('nickname storage', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = {
      store: new Map<string, string>(),
      getItem(key: string) {
        return this.store.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        this.store.set(key, value);
      },
      removeItem(key: string) {
        this.store.delete(key);
      },
      clear() {
        this.store.clear();
      },
      key() {
        return null;
      },
      get length() {
        return this.store.size;
      },
    };
    resetNickname(storage);
  });

  it('saveNickname and loadNickname round-trip', () => {
    saveNickname('architect_42', storage);
    expect(loadNickname(storage)).toBe('architect_42');
  });

  it('getOrCreateNickname generates valid default when missing', () => {
    const nickname = getOrCreateNickname(storage);
    expect(isValidNickname(nickname)).toBe(true);
    expect(loadNickname(storage)).toBe(nickname);
  });

  it('generateDefaultNickname matches pattern', () => {
    expect(isValidNickname(generateDefaultNickname())).toBe(true);
  });
});
