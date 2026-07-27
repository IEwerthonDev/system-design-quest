import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import type { ArchitectureGraph } from '@sdq/shared';
import {
  canGoBackPhase,
  getPreviousPhase,
  PHASE_ORDER,
  retreatPhase,
} from './phase-machine';
import {
  getPhaseLayerVisibility,
  mountPhaseNavigation,
} from './phase-navigation';
import {
  advancePhase,
  createSession,
  getGraph,
  getRequirements,
  getSession,
  goBackPhase,
  resetSessionStore,
  setGraph,
  setRequirements,
} from './session-store';

const sampleGraph: ArchitectureGraph = {
  nodes: [
    {
      id: 'app-1',
      type: 'app_server',
      label: 'App',
      position: { x: 0, y: 0, z: 0 },
    },
  ],
  edges: [],
};

describe('phase navigation', () => {
  describe('phase machine back navigation', () => {
    it('getPreviousPhase walks result → canvas → requirements → briefing', () => {
      expect(getPreviousPhase('result')).toBe('canvas');
      expect(getPreviousPhase('canvas')).toBe('requirements');
      expect(getPreviousPhase('requirements')).toBe('briefing');
      expect(getPreviousPhase('briefing')).toBeNull();
    });

    it('canGoBackPhase is false only at briefing', () => {
      for (const phase of PHASE_ORDER) {
        expect(canGoBackPhase(phase)).toBe(phase !== 'briefing');
      }
    });

    it('retreatPhase throws at briefing', () => {
      expect(() => retreatPhase('briefing')).toThrow(/cannot go back/i);
    });
  });

  describe('session store back navigation', () => {
    beforeEach(() => {
      resetSessionStore();
    });

    it('goBackPhase walks result → canvas → requirements → briefing', () => {
      createSession('url-shortener', 'study');
      advancePhase();
      advancePhase();
      advancePhase();
      expect(getSession()?.phase).toBe('result');

      expect(goBackPhase().phase).toBe('canvas');
      expect(goBackPhase().phase).toBe('requirements');
      expect(goBackPhase().phase).toBe('briefing');
    });

    it('goBackPhase throws at briefing', () => {
      createSession('url-shortener', 'study');
      expect(() => goBackPhase()).toThrow(/cannot go back/i);
    });

    it('preserves requirements when going back from canvas', () => {
      createSession('url-shortener', 'study');
      setRequirements({
        functional: ['Gerar slug único para cada URL'],
        nonFunctional: ['Latência de redirect abaixo de 50ms'],
      });
      advancePhase();
      advancePhase();
      expect(getSession()?.phase).toBe('canvas');

      goBackPhase();

      expect(getSession()?.phase).toBe('requirements');
      expect(getRequirements()).toEqual({
        functional: ['Gerar slug único para cada URL'],
        nonFunctional: ['Latência de redirect abaixo de 50ms'],
      });
    });

    it('preserves graph when going back from canvas', () => {
      createSession('url-shortener', 'study');
      advancePhase();
      advancePhase();
      setGraph(sampleGraph);

      goBackPhase();

      expect(getSession()?.phase).toBe('requirements');
      expect(getGraph().nodes).toHaveLength(1);
    });
  });

  describe('phase layer visibility', () => {
    it('shows only briefing layer at start', () => {
      expect(getPhaseLayerVisibility('briefing')).toEqual({
        briefing: true,
        requirements: false,
        palette: false,
        submit: false,
        showBack: false,
      });
    });

    it('shows palette and submit on canvas, submit only on result', () => {
      expect(getPhaseLayerVisibility('canvas')).toMatchObject({
        palette: true,
        submit: true,
        showBack: true,
      });
      expect(getPhaseLayerVisibility('result')).toMatchObject({
        palette: false,
        submit: true,
        showBack: true,
      });
    });
  });

  describe('mounted phase navigation', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
      resetSessionStore();
      container = document.createElement('div');
      document.body.append(container);
    });

    afterEach(() => {
      container.remove();
    });

    it('starts at briefing and advances through requirements to canvas', () => {
      mountPhaseNavigation(container);

      expect(getSession()?.phase).toBe('briefing');
      expect(container.querySelector('[data-testid="briefing-panel"]')?.hasAttribute('hidden')).toBe(
        false,
      );
      expect(
        container.querySelector('[data-testid="requirements-panel"]')?.hasAttribute('hidden'),
      ).toBe(true);

      container.querySelector<HTMLButtonElement>('[data-testid="briefing-start"]')!.click();
      expect(getSession()?.phase).toBe('requirements');
      expect(
        container.querySelector('[data-testid="requirements-panel"]')?.hasAttribute('hidden'),
      ).toBe(false);

      container.querySelector<HTMLButtonElement>('[data-testid="requirements-advance"]')!.click();
      expect(getSession()?.phase).toBe('canvas');
      expect(container.querySelector('[data-testid="component-palette"]')?.hasAttribute('hidden')).toBe(
        false,
      );
      expect(window.__GAME_STATE__.phase).toBe('canvas');
    });

    it('restores requirements when going back from canvas', () => {
      mountPhaseNavigation(container);

      container.querySelector<HTMLButtonElement>('[data-testid="briefing-start"]')!.click();

      const frInput = container.querySelector<HTMLInputElement>(
        '[data-testid="requirements-input-functional"]',
      )!;
      frInput.value = 'Encurtar URLs longas com código curto';
      container.querySelector<HTMLButtonElement>('[data-testid="requirements-add-functional"]')!.click();

      const nfrInput = container.querySelector<HTMLInputElement>(
        '[data-testid="requirements-input-nonFunctional"]',
      )!;
      nfrInput.value = 'Suportar 100M leituras por dia';
      container
        .querySelector<HTMLButtonElement>('[data-testid="requirements-add-nonFunctional"]')!
        .click();

      container.querySelector<HTMLButtonElement>('[data-testid="requirements-advance"]')!.click();
      expect(getSession()?.phase).toBe('canvas');

      container.querySelector<HTMLButtonElement>('[data-testid="phase-back"]')!.click();

      expect(getSession()?.phase).toBe('requirements');
      expect(
        container.querySelector<HTMLTextAreaElement>('[data-testid="requirements-edit-functional-0"]')
          ?.value,
      ).toBe('Encurtar URLs longas com código curto');
      expect(
        container.querySelector<HTMLTextAreaElement>(
          '[data-testid="requirements-edit-nonFunctional-0"]',
        )?.value,
      ).toBe('Suportar 100M leituras por dia');
    });

    it('advances to result on valid submit and can go back to canvas', () => {
      mountPhaseNavigation(container);

      container.querySelector<HTMLButtonElement>('[data-testid="briefing-start"]')!.click();
      container.querySelector<HTMLButtonElement>('[data-testid="requirements-advance"]')!.click();

      setGraph(sampleGraph);
      container.querySelector<HTMLButtonElement>('[data-testid="submit-button"]')!.click();

      expect(getSession()?.phase).toBe('result');
      expect(
        container
          .querySelector('[data-testid="result-placeholder"]')
          ?.classList.contains('sdq-result-placeholder--visible'),
      ).toBe(true);

      container.querySelector<HTMLButtonElement>('[data-testid="phase-back"]')!.click();

      expect(getSession()?.phase).toBe('canvas');
      expect(getGraph().nodes).toHaveLength(1);
      expect(
        container
          .querySelector('[data-testid="result-placeholder"]')
          ?.classList.contains('sdq-result-placeholder--visible'),
      ).toBe(false);
    });
  });
});
