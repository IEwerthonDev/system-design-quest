import { CATALOG_EN, type UiStringKey } from './catalog-en';
import { CATALOG_PT_BR } from './catalog-pt-BR';
import { getLocale, type Locale } from './locale';

const CATALOGS: Record<Locale, Record<string, string>> = {
  en: CATALOG_EN,
  'pt-BR': CATALOG_PT_BR,
};

/**
 * Resolve a UI chrome string for the active (or explicit) locale.
 * Missing keys return the key itself (dev-safe).
 */
export function t(key: string, locale?: Locale, storage?: Storage): string {
  const resolved = locale ?? getLocale(storage);
  const catalog = CATALOGS[resolved] ?? CATALOGS['pt-BR'];
  return catalog[key] ?? key;
}

export type { UiStringKey };
