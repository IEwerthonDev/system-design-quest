export const NICKNAME_STORAGE_KEY = 'sdq-nickname';

function resolveStorage(storage?: Storage): Storage {
  if (storage) {
    return storage;
  }
  if (typeof localStorage === 'undefined') {
    throw new Error('localStorage is not available');
  }
  return localStorage;
}

export function generateDefaultNickname(): string {
  const suffix = Math.floor(Math.random() * 9000) + 1000;
  return `player_${suffix}`;
}

export function loadNickname(storage?: Storage): string | null {
  const target = resolveStorage(storage);
  const raw = target.getItem(NICKNAME_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  return raw;
}

export function saveNickname(nickname: string, storage?: Storage): string {
  const target = resolveStorage(storage);
  target.setItem(NICKNAME_STORAGE_KEY, nickname);
  return nickname;
}

export function getOrCreateNickname(storage?: Storage): string {
  const existing = loadNickname(storage);
  if (existing) {
    return existing;
  }
  const generated = generateDefaultNickname();
  return saveNickname(generated, storage);
}

export function resetNickname(storage?: Storage): void {
  resolveStorage(storage).removeItem(NICKNAME_STORAGE_KEY);
}
