import type { ArchitectureGraph, JudgeInput, JudgeResult } from '@sdq/shared';
import { validateGraph } from '@sdq/shared';
import {
  retryLastJudging as defaultRetryLastJudging,
  JudgeApiError,
  submitForJudging as defaultSubmitForJudging,
} from '../judge/judge-api';
import { mountJudgingProgress } from '../judge/judging-progress';

export const EMPTY_GRAPH_MESSAGE = 'Adicione pelo menos um componente';

export interface LocalSubmitResult {
  success: boolean;
  error?: string;
  graph?: ArchitectureGraph;
}

export interface SubmitPanelCallbacks {
  getGraph: () => ArchitectureGraph;
  buildJudgeInput: (graph: ArchitectureGraph) => JudgeInput;
  onJudgeSuccess: (result: JudgeResult) => void;
  onSubmitStart?: () => void;
  submitForJudging?: typeof defaultSubmitForJudging;
  retryLastJudging?: typeof defaultRetryLastJudging;
}

export interface SubmitPanel {
  root: HTMLElement;
  submit(): Promise<LocalSubmitResult>;
  isJudging(): boolean;
}

export function validateLocalSubmit(graph: ArchitectureGraph): LocalSubmitResult {
  const validation = validateGraph(graph);

  if (validation.valid) {
    return { success: true, graph };
  }

  const emptyGraph = validation.errors.find((error) => error.code === 'EMPTY_GRAPH');
  if (emptyGraph) {
    return { success: false, error: EMPTY_GRAPH_MESSAGE };
  }

  return {
    success: false,
    error: validation.errors[0]?.message ?? 'Grafo inválido',
  };
}

function injectSubmitStyles(root: HTMLElement): void {
  if (document.getElementById('sdq-submit-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'sdq-submit-styles';
  style.textContent = `
    .sdq-submit-bar {
      position: fixed;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      z-index: 10;
    }
    .sdq-submit-bar__button {
      border: 1px solid rgba(96, 165, 250, 0.5);
      background: rgba(30, 64, 175, 0.85);
      color: #e2e8f0;
      border-radius: 8px;
      padding: 10px 20px;
      font: 600 14px system-ui, sans-serif;
      cursor: pointer;
    }
    .sdq-submit-bar__button:hover:not(:disabled) {
      background: rgba(37, 99, 235, 0.95);
    }
    .sdq-submit-bar__button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .sdq-submit-bar__error {
      max-width: 320px;
      text-align: center;
      color: #fecaca;
      background: rgba(127, 29, 29, 0.85);
      border: 1px solid rgba(248, 113, 113, 0.45);
      border-radius: 6px;
      padding: 8px 12px;
      font: 13px system-ui, sans-serif;
    }
  `;
  root.append(style);
}

export function mountSubmitPanel(
  container: HTMLElement,
  callbacks: SubmitPanelCallbacks,
): SubmitPanel {
  injectSubmitStyles(document.head);

  const judgeSubmit = callbacks.submitForJudging ?? defaultSubmitForJudging;
  const judgeRetry = callbacks.retryLastJudging ?? defaultRetryLastJudging;
  const progress = mountJudgingProgress(container);

  const bar = document.createElement('div');
  bar.className = 'sdq-submit-bar';
  bar.setAttribute('data-testid', 'submit-bar');

  const errorEl = document.createElement('div');
  errorEl.className = 'sdq-submit-bar__error';
  errorEl.hidden = true;
  errorEl.setAttribute('data-testid', 'submit-error');

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sdq-submit-bar__button';
  button.setAttribute('data-testid', 'submit-button');
  button.textContent = 'Submeter';

  bar.append(errorEl, button);
  container.append(bar);

  let judging = false;

  const showError = (message: string): void => {
    errorEl.textContent = message;
    errorEl.hidden = false;
  };

  const clearError = (): void => {
    errorEl.hidden = true;
    errorEl.textContent = '';
  };

  const setJudgingState = (active: boolean): void => {
    judging = active;
    button.disabled = active;
  };

  const runJudging = async (
    submitFn: (
      graph: ArchitectureGraph,
      onProgress: (step: Parameters<typeof defaultSubmitForJudging>[1]) => void,
    ) => Promise<JudgeResult>,
  ): Promise<LocalSubmitResult> => {
    const graph = callbacks.getGraph();
    const validation = validateLocalSubmit(graph);

    if (!validation.success || !validation.graph) {
      showError(validation.error ?? EMPTY_GRAPH_MESSAGE);
      return validation;
    }

    clearError();
    setJudgingState(true);
    progress.show();
    progress.clearError();
    callbacks.onSubmitStart?.();

    try {
      const result = await submitFn(validation.graph, (step) => {
        progress.setStep(step);
      });

      progress.hide();
      setJudgingState(false);
      callbacks.onJudgeSuccess(result);
      return { success: true, graph: validation.graph };
    } catch (error) {
      const message =
        error instanceof JudgeApiError
          ? error.message
          : 'Não foi possível julgar sua arquitetura. Tente novamente.';

      progress.showError(message, () => {
        progress.clearError();
        void runJudging((_graph, onProgress) => judgeRetry(onProgress));
      });
      setJudgingState(false);
      return { success: false, error: message };
    }
  };

  const submit = async (): Promise<LocalSubmitResult> =>
    runJudging((graph, onProgress) =>
      judgeSubmit(callbacks.buildJudgeInput(graph), onProgress),
    );

  button.addEventListener('click', () => {
    void submit();
  });

  return {
    root: bar,
    submit,
    isJudging: () => judging,
  };
}
