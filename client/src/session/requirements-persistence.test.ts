import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mountPhaseNavigation } from './phase-navigation';
import {
  advancePhase,
  createSession,
  getRequirements,
  getSession,
  goBackPhase,
  resetSessionStore,
  setRequirements,
} from './session-store';

const sampleRequirements = {
  functional: [
    'Usuário pode encurtar uma URL longa em um link curto único',
    'Usuário é redirecionado para a URL original ao acessar o link curto (HTTP 302)',
  ],
  nonFunctional: [
    'Redirect responde em menos de 100 ms no percentil 99',
    'Sistema suporta 1.000 escritas/s e 100.000 leituras/s em pico',
  ],
};

describe('requirements session persistence', () => {
  beforeEach(() => {
    resetSessionStore();
  });

  it('syncs requirements to __GAME_STATE__ when setRequirements is called', () => {
    createSession('url-shortener', 'study');
    setRequirements(sampleRequirements);

    expect(getRequirements()).toEqual(sampleRequirements);
    expect(window.__GAME_STATE__.requirements).toEqual(sampleRequirements);

    const serialized = JSON.parse(JSON.stringify(window.__GAME_STATE__));
    expect(serialized.requirements.functional).toHaveLength(2);
    expect(serialized.requirements.nonFunctional).toHaveLength(2);
  });

  it('keeps requirements in __GAME_STATE__ when advancing to canvas', () => {
    createSession('url-shortener', 'study');
    advancePhase();
    setRequirements(sampleRequirements);
    advancePhase();

    expect(getSession()?.phase).toBe('canvas');
    expect(window.__GAME_STATE__.requirements).toEqual(sampleRequirements);
  });

  it('preserves requirements in session and __GAME_STATE__ when navigating back', () => {
    createSession('url-shortener', 'study');
    advancePhase();
    setRequirements(sampleRequirements);
    advancePhase();
    goBackPhase();

    expect(getSession()?.phase).toBe('requirements');
    expect(getRequirements()).toEqual(sampleRequirements);
    expect(window.__GAME_STATE__.requirements).toEqual(sampleRequirements);
  });

  describe('mounted phase navigation', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.append(container);
    });

    afterEach(() => {
      container.remove();
    });

    it('persists requirements added via suggestions through canvas and back', () => {
      mountPhaseNavigation(container);

      container.querySelector<HTMLButtonElement>('[data-testid="briefing-start"]')!.click();
      container.querySelector<HTMLButtonElement>('[data-testid="suggestion-card-functional-0"]')!.click();
      container.querySelector<HTMLButtonElement>('[data-testid="suggestion-card-functional-1"]')!.click();
      container.querySelector<HTMLButtonElement>('[data-testid="suggestion-card-nonFunctional-0"]')!.click();
      container.querySelector<HTMLButtonElement>('[data-testid="requirements-advance"]')!.click();

      expect(getSession()?.phase).toBe('canvas');
      expect(window.__GAME_STATE__.requirements.functional).toHaveLength(2);
      expect(window.__GAME_STATE__.requirements.nonFunctional).toHaveLength(1);

      container.querySelector<HTMLButtonElement>('[data-testid="phase-back"]')!.click();

      expect(getSession()?.phase).toBe('requirements');
      expect(window.__GAME_STATE__.requirements.functional).toHaveLength(2);
      expect(
        container.querySelector<HTMLTextAreaElement>('[data-testid="requirements-edit-functional-0"]')
          ?.value,
      ).toBe(window.__GAME_STATE__.requirements.functional[0]);
    });
  });
});
