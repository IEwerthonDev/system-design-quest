import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_SIMULATION } from '@sdq/shared';
import { CATALOG_EN } from '../i18n/catalog-en';
import { CATALOG_PT_BR } from '../i18n/catalog-pt-BR';
import { LOCALE_CHANGE_EVENT, setLocale } from '../i18n/locale';
import { mountWorkloadPanel } from './workload-panel';
import { mountMentorPanel } from './mentor-panel';
import { createSession, resetSessionStore } from '../session/session-store';

describe('sandbox drawer i18n chrome', () => {
  let host: HTMLElement;

  afterEach(() => {
    host?.remove();
    resetSessionStore();
    setLocale('pt-BR');
  });

  it('defines FAB and collapse strings in en and pt-BR catalogs', () => {
    for (const catalog of [CATALOG_EN, CATALOG_PT_BR]) {
      expect(catalog['workload.fab'].length).toBeGreaterThan(0);
      expect(catalog['workload.collapse'].length).toBeGreaterThan(0);
      expect(catalog['mentor.fab'].length).toBeGreaterThan(0);
      expect(catalog['mentor.collapse'].length).toBeGreaterThan(0);
    }
    expect(CATALOG_EN['workload.fab']).toBe('WORKLOAD');
    expect(CATALOG_PT_BR['workload.fab']).toBe('CARGA');
    expect(CATALOG_EN['mentor.fab']).toBe('MENTOR');
    expect(CATALOG_PT_BR['mentor.title']).toBe('Mentor IA');
  });

  it('refreshes FAB labels on locale change', () => {
    resetSessionStore();
    createSession('__sandbox__', 'sandbox');
    host = document.createElement('div');
    document.body.append(host);
    setLocale('en');

    const workload = mountWorkloadPanel(host, {
      getSettings: () => ({ ...DEFAULT_SIMULATION }),
      onChange: () => undefined,
    });
    const mentor = mountMentorPanel(host, { getFindings: () => [] });

    expect(workload.fab.textContent).toBe('WORKLOAD');
    expect(mentor.fab.textContent).toBe('MENTOR');

    setLocale('pt-BR');
    window.dispatchEvent(new CustomEvent(LOCALE_CHANGE_EVENT, { detail: { locale: 'pt-BR' } }));

    expect(workload.fab.textContent).toBe('CARGA');
    expect(mentor.fab.textContent).toBe('MENTOR');

    workload.destroy();
    mentor.destroy();
  });
});
