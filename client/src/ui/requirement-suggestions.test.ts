import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { URL_SHORTENER, URL_SHORTENER_ID } from '@sdq/shared';
import { mountRequirementsPanel } from './requirements-panel';
import { getSuggestions, mountSuggestionCards } from './requirement-suggestions';

describe('requirement suggestion cards', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('getSuggestions returns FR and NFR lists for a known problem', () => {
    const suggestions = getSuggestions(URL_SHORTENER_ID);

    expect(suggestions.functional.length).toBeGreaterThanOrEqual(3);
    expect(suggestions.nonFunctional.length).toBeGreaterThanOrEqual(2);
    expect(suggestions.functional).toEqual(URL_SHORTENER.suggestedRequirements.functional);
    expect(suggestions.nonFunctional).toEqual(URL_SHORTENER.suggestedRequirements.nonFunctional);
  });

  it('getSuggestions returns empty lists for unknown problems', () => {
    expect(getSuggestions('unknown-problem')).toEqual({
      functional: [],
      nonFunctional: [],
    });
  });

  it('renders clickable FR and NFR cards for URL Shortener', () => {
    const panelShell = document.createElement('div');
    panelShell.className = 'sdq-requirements__card';
    panelShell.innerHTML = '<div class="sdq-requirements__columns"></div>';
    container.append(panelShell);

    mountSuggestionCards(panelShell, {
      problemId: URL_SHORTENER_ID,
      onAdd: () => undefined,
    });

    expect(container.querySelector('[data-testid="requirement-suggestions"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-testid^="suggestion-card-functional-"]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-testid^="suggestion-card-nonFunctional-"]')).toHaveLength(3);
  });

  it('calls onAdd with text and kind when a suggestion card is clicked', () => {
    const onAdd = vi.fn();
    const panelShell = document.createElement('div');
    panelShell.className = 'sdq-requirements__card';
    container.append(panelShell);

    mountSuggestionCards(panelShell, {
      problemId: URL_SHORTENER_ID,
      onAdd,
    });

    const firstFr = container.querySelector<HTMLButtonElement>(
      '[data-testid="suggestion-card-functional-0"]',
    )!;
    firstFr.click();

    expect(onAdd).toHaveBeenCalledWith(URL_SHORTENER.suggestedRequirements.functional[0], 'functional');
    expect(firstFr.disabled).toBe(true);
  });

  it('adds three FR suggestions to the requirements list and allows editing', () => {
    const requirementsPanel = mountRequirementsPanel(container, { onAdvance: () => undefined });
    const card = requirementsPanel.root.querySelector('.sdq-requirements__card')!;

    mountSuggestionCards(card, {
      problemId: URL_SHORTENER_ID,
      onAdd: (text, kind) => {
        requirementsPanel.addRequirement(kind, text);
      },
    });

    for (let index = 0; index < 3; index += 1) {
      container
        .querySelector<HTMLButtonElement>(`[data-testid="suggestion-card-functional-${index}"]`)!
        .click();
    }

    expect(requirementsPanel.getRequirements().functional).toHaveLength(3);

    const edit = container.querySelector<HTMLTextAreaElement>(
      '[data-testid="requirements-edit-functional-0"]',
    )!;
    edit.value = `${edit.value} (editado)`;
    edit.dispatchEvent(new Event('change'));

    expect(requirementsPanel.getRequirements().functional[0]).toContain('(editado)');
  });

  it('adds NFR suggestions to the non-functional list', () => {
    const requirementsPanel = mountRequirementsPanel(container, { onAdvance: () => undefined });
    const card = requirementsPanel.root.querySelector('.sdq-requirements__card')!;

    mountSuggestionCards(card, {
      problemId: URL_SHORTENER_ID,
      onAdd: (text, kind) => {
        requirementsPanel.addRequirement(kind, text);
      },
    });

    container.querySelector<HTMLButtonElement>('[data-testid="suggestion-card-nonFunctional-0"]')!.click();
    container.querySelector<HTMLButtonElement>('[data-testid="suggestion-card-nonFunctional-1"]')!.click();

    expect(requirementsPanel.getRequirements().nonFunctional).toHaveLength(2);
    expect(requirementsPanel.getRequirements().nonFunctional[0]).toBe(
      URL_SHORTENER.suggestedRequirements.nonFunctional[0],
    );
  });
});
