import type { ArchitectureGraph } from '@sdq/shared';
import { validateGraph } from '@sdq/shared';

export const EMPTY_GRAPH_MESSAGE = 'Adicione pelo menos um componente';

export interface LocalSubmitResult {
  success: boolean;
  error?: string;
  graph?: ArchitectureGraph;
}

export interface SubmitPanelCallbacks {
  getGraph: () => ArchitectureGraph;
  onSubmitSuccess: (graph: ArchitectureGraph) => void;
}

export interface SubmitPanel {
  root: HTMLElement;
  submit(): LocalSubmitResult;
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
    .sdq-submit-bar__button:hover {
      background: rgba(37, 99, 235, 0.95);
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
    .sdq-result-placeholder {
      position: fixed;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      background: rgba(15, 20, 25, 0.88);
      z-index: 20;
      color: #e2e8f0;
      font-family: system-ui, sans-serif;
      text-align: center;
      padding: 24px;
    }
    .sdq-result-placeholder--visible {
      display: flex;
    }
    .sdq-result-placeholder__title {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .sdq-result-placeholder__body {
      font-size: 14px;
      color: #94a3b8;
      max-width: 420px;
    }
  `;
  root.append(style);
}

export function mountSubmitPanel(
  container: HTMLElement,
  callbacks: SubmitPanelCallbacks,
): SubmitPanel {
  injectSubmitStyles(document.head);

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

  const resultOverlay = document.createElement('div');
  resultOverlay.className = 'sdq-result-placeholder';
  resultOverlay.setAttribute('data-testid', 'result-placeholder');
  resultOverlay.innerHTML = `
    <div>
      <div class="sdq-result-placeholder__title">Arquitetura enviada</div>
      <p class="sdq-result-placeholder__body">
        Julgamento por IA chegará na Fase 2. Por enquanto, sua solução foi registrada localmente.
      </p>
    </div>
  `;

  bar.append(errorEl, button);
  container.append(bar, resultOverlay);

  const showError = (message: string): void => {
    errorEl.textContent = message;
    errorEl.hidden = false;
  };

  const clearError = (): void => {
    errorEl.hidden = true;
    errorEl.textContent = '';
  };

  const showResultPlaceholder = (): void => {
    resultOverlay.classList.add('sdq-result-placeholder--visible');
  };

  const submit = (): LocalSubmitResult => {
    const graph = callbacks.getGraph();
    const result = validateLocalSubmit(graph);

    if (!result.success) {
      showError(result.error ?? EMPTY_GRAPH_MESSAGE);
      return result;
    }

    clearError();
    callbacks.onSubmitSuccess(result.graph!);
    showResultPlaceholder();
    return result;
  };

  button.addEventListener('click', submit);

  return { root: bar, submit };
}
