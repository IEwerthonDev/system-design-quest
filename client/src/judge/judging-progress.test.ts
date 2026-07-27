import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  JUDGING_STEP_LABELS,
  JUDGING_STEP_ORDER,
  mountJudgingProgress,
} from './judging-progress';

describe('judging progress overlay', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
  });

  afterEach(() => {
    container.remove();
    document.getElementById('sdq-judging-styles')?.remove();
  });

  it('renders all four dual-judge progress steps with PT-BR labels', () => {
    const progress = mountJudgingProgress(container);

    for (const step of JUDGING_STEP_ORDER) {
      const element = container.querySelector(`[data-testid="judging-step-${step}"]`);
      expect(element?.textContent).toContain(JUDGING_STEP_LABELS[step]);
    }

    expect(progress.root.getAttribute('data-testid')).toBe('judging-progress');
  });

  it('highlights the active step and marks previous steps as done', () => {
    const progress = mountJudgingProgress(container);
    progress.show();
    progress.setStep('pragmatic');

    expect(
      container
        .querySelector('[data-testid="judging-step-analyzing"]')
        ?.classList.contains('sdq-judging-step--done'),
    ).toBe(true);
    expect(
      container
        .querySelector('[data-testid="judging-step-rigorous"]')
        ?.classList.contains('sdq-judging-step--done'),
    ).toBe(true);
    expect(
      container
        .querySelector('[data-testid="judging-step-pragmatic"]')
        ?.classList.contains('sdq-judging-step--active'),
    ).toBe(true);
    expect(
      container
        .querySelector('[data-testid="judging-step-consensus"]')
        ?.classList.contains('sdq-judging-step--active'),
    ).toBe(false);
  });

  it('shows error message and retry button that invokes callback', () => {
    const progress = mountJudgingProgress(container);
    const onRetry = vi.fn();

    progress.show();
    progress.showError('Falha ao julgar. Tente novamente.', onRetry);

    const error = container.querySelector('[data-testid="judging-error"]');
    expect(error?.classList.contains('sdq-judging-error--visible')).toBe(true);
    expect(error?.textContent).toContain('Falha ao julgar. Tente novamente.');

    container.querySelector<HTMLButtonElement>('[data-testid="judging-retry-button"]')?.click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('hides overlay and clears error state', () => {
    const progress = mountJudgingProgress(container);
    progress.show();
    progress.showError('Erro temporário', () => undefined);

    progress.hide();

    expect(progress.root.classList.contains('sdq-judging-overlay--visible')).toBe(false);
    expect(
      container.querySelector('[data-testid="judging-error"]')?.classList.contains(
        'sdq-judging-error--visible',
      ),
    ).toBe(false);
  });
});
