export type Locale = 'en' | 'pt-BR';

export const LOCALE_STORAGE_KEY = 'sdq-locale';
export const DEFAULT_LOCALE: Locale = 'pt-BR';
export const LOCALE_CHANGE_EVENT = 'sdq:localechange';

const VALID_LOCALES = new Set<Locale>(['en', 'pt-BR']);

function resolveStorage(storage?: Storage): Storage {
  if (storage) {
    return storage;
  }
  if (typeof localStorage === 'undefined') {
    throw new Error('localStorage is not available');
  }
  return localStorage;
}

function isLocale(value: string): value is Locale {
  return VALID_LOCALES.has(value as Locale);
}

export function getLocale(storage?: Storage): Locale {
  const raw = resolveStorage(storage).getItem(LOCALE_STORAGE_KEY);
  if (!raw || !isLocale(raw)) {
    return DEFAULT_LOCALE;
  }
  return raw;
}

export function setLocale(locale: Locale, storage?: Storage): void {
  if (!isLocale(locale)) {
    return;
  }
  resolveStorage(storage).setItem(LOCALE_STORAGE_KEY, locale);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LOCALE_CHANGE_EVENT, { detail: { locale } }));
  }
}
