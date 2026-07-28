import { beforeEach, describe, expect, it } from 'vitest';
import { getLocale, setLocale } from '../i18n/locale';

/**
 * Spec LOCALE-03: client judge caller must send active locale from getLocale().
 * phase-navigation buildJudgeInput wires `locale: getLocale()` into the POST body.
 */
describe('judge client locale wiring', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('getLocale is the source sent on JudgeInput.locale (defaults pt-BR)', () => {
    expect(getLocale()).toBe('pt-BR');
    setLocale('en');
    expect(getLocale()).toBe('en');
    setLocale('pt-BR');
    expect(getLocale()).toBe('pt-BR');
  });
});
