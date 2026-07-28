import type { JudgingStep } from '../test-hook';

export const JUDGING_STEP_LABELS: Record<JudgingStep, string> = {
  analyzing: 'Analisando arquitetura…',
  rigorous: 'Juiz rigoroso avaliando…',
  pragmatic: 'Juiz pragmático avaliando…',
  consensus: 'Chegando ao consenso…',
};

export const JUDGING_STEP_ORDER: JudgingStep[] = [
  'analyzing',
  'rigorous',
  'pragmatic',
  'consensus',
];

export interface JudgingProgress {
  root: HTMLElement;
  show(): void;
  hide(): void;
  setStep(step: JudgingStep): void;
  showError(message: string, onRetry: () => void): void;
  clearError(): void;
}

function injectJudgingStyles(root: HTMLElement): void {
  if (document.getElementById('sdq-judging-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'sdq-judging-styles';
  style.textContent = `
    .sdq-judging-overlay {
      position: fixed;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      background: var(--sdq-bg-overlay);
      z-index: 30;
      padding: 24px;
    }
    .sdq-judging-overlay--visible {
      display: flex;
    }
    .sdq-judging-card {
      width: min(440px, 100%);
      background: var(--sdq-bg-overlay);
      border: 1px solid var(--sdq-accent-border);
      border-radius: var(--sdq-radius-lg);
      padding: 24px;
      color: var(--sdq-text);
      font-family: var(--sdq-font);
      box-shadow: 0 12px 40px rgba(2, 6, 23, 0.45);
    }
    .sdq-judging-card__title {
      margin: 0 0 16px;
      font-size: 18px;
      font-weight: 700;
      text-align: center;
    }
    .sdq-judging-steps {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .sdq-judging-step {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      color: var(--sdq-text-subtle);
    }
    .sdq-judging-step--active {
      color: var(--sdq-text);
      font-weight: 600;
    }
    .sdq-judging-step--done {
      color: var(--sdq-success);
    }
    .sdq-judging-step__marker {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 2px solid currentColor;
      flex-shrink: 0;
    }
    .sdq-judging-step--active .sdq-judging-step__marker {
      background: var(--sdq-accent);
      border-color: var(--sdq-accent);
      box-shadow: 0 0 0 3px var(--sdq-accent-muted);
    }
    .sdq-judging-step--done .sdq-judging-step__marker {
      background: #22c55e;
      border-color: #22c55e;
    }
    .sdq-judging-error {
      display: none;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(248, 113, 113, 0.35);
      text-align: center;
    }
    .sdq-judging-error--visible {
      display: block;
    }
    .sdq-judging-error__message {
      margin: 0 0 12px;
      font-size: 14px;
      line-height: 1.5;
      color: var(--sdq-danger);
    }
    .sdq-judging-error__retry {
      border: 1px solid rgba(248, 113, 113, 0.5);
      background: rgba(127, 29, 29, 0.85);
      color: #fee2e2;
      border-radius: var(--sdq-radius-sm);
      padding: 8px 16px;
      font: 600 13px var(--sdq-font);
      cursor: pointer;
    }
    .sdq-judging-error__retry:hover {
      background: rgba(153, 27, 27, 0.95);
    }
  `;
  root.append(style);
}

export function mountJudgingProgress(container: HTMLElement): JudgingProgress {
  injectJudgingStyles(document.head);

  const overlay = document.createElement('div');
  overlay.className = 'sdq-judging-overlay';
  overlay.setAttribute('data-testid', 'judging-progress');

  const card = document.createElement('div');
  card.className = 'sdq-judging-card';

  const title = document.createElement('h2');
  title.className = 'sdq-judging-card__title';
  title.textContent = 'Julgando sua arquitetura';

  const stepsList = document.createElement('ul');
  stepsList.className = 'sdq-judging-steps';

  const stepElements = new Map<JudgingStep, HTMLLIElement>();

  for (const step of JUDGING_STEP_ORDER) {
    const item = document.createElement('li');
    item.className = 'sdq-judging-step';
    item.setAttribute('data-testid', `judging-step-${step}`);

    const marker = document.createElement('span');
    marker.className = 'sdq-judging-step__marker';

    const label = document.createElement('span');
    label.textContent = JUDGING_STEP_LABELS[step];

    item.append(marker, label);
    stepsList.append(item);
    stepElements.set(step, item);
  }

  const errorPanel = document.createElement('div');
  errorPanel.className = 'sdq-judging-error';
  errorPanel.setAttribute('data-testid', 'judging-error');

  const errorMessage = document.createElement('p');
  errorMessage.className = 'sdq-judging-error__message';

  const retryButton = document.createElement('button');
  retryButton.type = 'button';
  retryButton.className = 'sdq-judging-error__retry';
  retryButton.setAttribute('data-testid', 'judging-retry-button');
  retryButton.textContent = 'Tentar novamente';

  errorPanel.append(errorMessage, retryButton);
  card.append(title, stepsList, errorPanel);
  overlay.append(card);
  container.append(overlay);

  let retryHandler: (() => void) | null = null;

  retryButton.addEventListener('click', () => {
    retryHandler?.();
  });

  const updateStepVisuals = (activeStep: JudgingStep): void => {
    const activeIndex = JUDGING_STEP_ORDER.indexOf(activeStep);

    for (const [step, element] of stepElements) {
      const stepIndex = JUDGING_STEP_ORDER.indexOf(step);
      element.classList.remove('sdq-judging-step--active', 'sdq-judging-step--done');

      if (stepIndex < activeIndex) {
        element.classList.add('sdq-judging-step--done');
      } else if (stepIndex === activeIndex) {
        element.classList.add('sdq-judging-step--active');
      }
    }
  };

  return {
    root: overlay,
    show() {
      overlay.classList.add('sdq-judging-overlay--visible');
    },
    hide() {
      overlay.classList.remove('sdq-judging-overlay--visible');
      this.clearError();
    },
    setStep(step: JudgingStep) {
      updateStepVisuals(step);
    },
    showError(message: string, onRetry: () => void) {
      errorMessage.textContent = message;
      retryHandler = onRetry;
      errorPanel.classList.add('sdq-judging-error--visible');
    },
    clearError() {
      errorMessage.textContent = '';
      retryHandler = null;
      errorPanel.classList.remove('sdq-judging-error--visible');
    },
  };
}
