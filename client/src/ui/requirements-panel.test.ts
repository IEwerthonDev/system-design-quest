import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { advancePhase, createSession, getSession, resetSessionStore } from '../session/session-store';
import {
  EMPTY_REQUIREMENTS_WARNING,
  MIN_REQUIREMENT_LENGTH,
  mountRequirementsPanel,
  shouldWarnEmptyRequirements,
  SHORT_REQUIREMENT_MESSAGE,
  validateRequirementText,
} from './requirements-panel';

describe('requirements panel', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    resetSessionStore();
    container = document.createElement('div');
    document.body.append(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('validateRequirementText rejects text shorter than minimum length', () => {
    expect(validateRequirementText('curto')).toEqual({
      valid: false,
      error: SHORT_REQUIREMENT_MESSAGE,
    });
    expect(validateRequirementText('a'.repeat(MIN_REQUIREMENT_LENGTH))).toEqual({ valid: true });
  });

  it('shouldWarnEmptyRequirements is true when either list is empty', () => {
    expect(shouldWarnEmptyRequirements({ functional: [], nonFunctional: [] })).toBe(true);
    expect(shouldWarnEmptyRequirements({ functional: ['FR válido aqui'], nonFunctional: [] })).toBe(
      true,
    );
    expect(
      shouldWarnEmptyRequirements({
        functional: ['FR válido aqui'],
        nonFunctional: ['NFR válido aqui'],
      }),
    ).toBe(false);
  });

  it('renders separate FR and NFR sections', () => {
    mountRequirementsPanel(container, { onAdvance: () => undefined });

    expect(container.querySelector('[data-testid="requirements-section-functional"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="requirements-section-nonFunctional"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="requirements-list-functional"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="requirements-list-nonFunctional"]')).toBeTruthy();
  });

  it('adds FR and NFR items when text meets minimum length', () => {
    const panel = mountRequirementsPanel(container, { onAdvance: () => undefined });

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

    expect(panel.getRequirements()).toEqual({
      functional: ['Encurtar URLs longas com código curto'],
      nonFunctional: ['Suportar 100M leituras por dia'],
    });
    expect(container.querySelectorAll('[data-testid^="requirements-item-functional-"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-testid^="requirements-item-nonFunctional-"]')).toHaveLength(1);
  });

  it('shows validation error and does not add short requirement text', () => {
    const panel = mountRequirementsPanel(container, { onAdvance: () => undefined });

    const frInput = container.querySelector<HTMLInputElement>(
      '[data-testid="requirements-input-functional"]',
    )!;
    frInput.value = 'curto';
    container.querySelector<HTMLButtonElement>('[data-testid="requirements-add-functional"]')!.click();

    expect(panel.getRequirements().functional).toEqual([]);
    expect(container.querySelector('[data-testid="requirements-error-functional"]')?.textContent).toBe(
      SHORT_REQUIREMENT_MESSAGE,
    );
  });

  it('edits and removes requirement items', () => {
    const panel = mountRequirementsPanel(container, { onAdvance: () => undefined });

    const frInput = container.querySelector<HTMLInputElement>(
      '[data-testid="requirements-input-functional"]',
    )!;
    frInput.value = 'Redirecionar para URL original';
    container.querySelector<HTMLButtonElement>('[data-testid="requirements-add-functional"]')!.click();

    const edit = container.querySelector<HTMLTextAreaElement>(
      '[data-testid="requirements-edit-functional-0"]',
    )!;
    edit.value = 'Redirecionar usuário para URL original';
    edit.dispatchEvent(new Event('change'));

    expect(panel.getRequirements().functional).toEqual(['Redirecionar usuário para URL original']);

    container.querySelector<HTMLButtonElement>('[data-testid="requirements-remove-functional-0"]')!.click();
    expect(panel.getRequirements().functional).toEqual([]);
  });

  it('shows warning but still advances when lists are empty', () => {
    const onAdvance = vi.fn();
    mountRequirementsPanel(container, { onAdvance });

    container.querySelector<HTMLButtonElement>('[data-testid="requirements-advance"]')!.click();

    const warning = container.querySelector('[data-testid="requirements-warning"]');
    expect(warning?.textContent).toBe(EMPTY_REQUIREMENTS_WARNING);
    expect(warning?.hasAttribute('hidden')).toBe(false);
    expect(onAdvance).toHaveBeenCalledWith({ functional: [], nonFunctional: [] });
  });

  it('advances without warning when both lists have items', () => {
    const onAdvance = vi.fn();
    mountRequirementsPanel(container, { onAdvance });

    const frInput = container.querySelector<HTMLInputElement>(
      '[data-testid="requirements-input-functional"]',
    )!;
    frInput.value = 'Gerar slug único para cada URL';
    container.querySelector<HTMLButtonElement>('[data-testid="requirements-add-functional"]')!.click();

    const nfrInput = container.querySelector<HTMLInputElement>(
      '[data-testid="requirements-input-nonFunctional"]',
    )!;
    nfrInput.value = 'Latência de redirect abaixo de 50ms';
    container
      .querySelector<HTMLButtonElement>('[data-testid="requirements-add-nonFunctional"]')!
      .click();

    container.querySelector<HTMLButtonElement>('[data-testid="requirements-advance"]')!.click();

    expect(container.querySelector('[data-testid="requirements-warning"]')?.hasAttribute('hidden')).toBe(
      true,
    );
    expect(onAdvance).toHaveBeenCalledWith({
      functional: ['Gerar slug único para cada URL'],
      nonFunctional: ['Latência de redirect abaixo de 50ms'],
    });
  });

  it('setRequirements restores lists for re-entry', () => {
    const panel = mountRequirementsPanel(container, { onAdvance: () => undefined });

    panel.setRequirements({
      functional: ['Persistir mapeamento curto → longo'],
      nonFunctional: ['Disponibilidade de 99.9% no redirect'],
    });

    expect(panel.getRequirements()).toEqual({
      functional: ['Persistir mapeamento curto → longo'],
      nonFunctional: ['Disponibilidade de 99.9% no redirect'],
    });
    expect(
      container.querySelector<HTMLTextAreaElement>('[data-testid="requirements-edit-functional-0"]')
        ?.value,
    ).toBe('Persistir mapeamento curto → longo');
  });

  it('advances session to canvas phase when wired to advancePhase', () => {
    createSession('url-shortener', 'study');
    advancePhase();
    expect(getSession()?.phase).toBe('requirements');

    mountRequirementsPanel(container, {
      onAdvance: () => {
        advancePhase();
      },
    });

    container.querySelector<HTMLButtonElement>('[data-testid="requirements-advance"]')!.click();

    expect(getSession()?.phase).toBe('canvas');
    expect(window.__GAME_STATE__.phase).toBe('canvas');
  });
});
