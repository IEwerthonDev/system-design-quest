import type { ArchitectureGraph } from '@sdq/shared';
import type { GamePhase } from '../test-hook';
import {
  advanceHint,
  getCurrentHint,
  getCurrentStep,
  startGuidedSession,
  syncGuidedStateFromSession,
  type GuidedHint,
  type GuidedState,
} from './guided-mode';

export interface GuidedOverlayCallbacks {
  onComplete?: () => void;
  onStepChange?: (stepId: string | null) => void;
}

export interface GuidedOverlay {
  root: HTMLElement;
  getState(): GuidedState;
  sync(phase: GamePhase, graph: ArchitectureGraph): void;
  destroy(): void;
}

function injectGuidedStyles(root: HTMLElement): void {
  if (document.getElementById('sdq-guided-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'sdq-guided-styles';
  style.textContent = `
    .sdq-guided-overlay {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 35;
    }
    .sdq-guided-spotlight {
      position: fixed;
      border-radius: var(--sdq-radius);
      box-shadow: 0 0 0 9999px rgba(2, 6, 23, 0.62);
      outline: 2px solid rgba(56, 189, 248, 0.95);
      outline-offset: 2px;
      transition: top 120ms ease, left 120ms ease, width 120ms ease, height 120ms ease;
      pointer-events: none;
    }
    .sdq-guided-hint {
      position: fixed;
      left: 50%;
      bottom: 24px;
      transform: translateX(-50%);
      width: min(520px, calc(100% - 32px));
      background: var(--sdq-bg-overlay);
      border: 1px solid rgba(56, 189, 248, 0.35);
      border-radius: var(--sdq-radius-lg);
      padding: 16px 18px 14px;
      color: var(--sdq-text);
      font-family: var(--sdq-font);
      pointer-events: auto;
      box-shadow: 0 12px 40px rgba(2, 6, 23, 0.45);
    }
    .sdq-guided-hint__title {
      margin: 0 0 8px;
      font-size: 15px;
      font-weight: 700;
      color: var(--sdq-accent);
    }
    .sdq-guided-hint__body {
      margin: 0 0 14px;
      font-size: 13px;
      line-height: 1.5;
      color: var(--sdq-text-muted);
      white-space: pre-line;
    }
    .sdq-guided-hint__actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .sdq-guided-hint__dismiss {
      border: 1px solid var(--sdq-border-strong);
      background: var(--sdq-bg-elevated);
      color: var(--sdq-text);
      border-radius: var(--sdq-radius-sm);
      padding: 7px 12px;
      font: 600 12px var(--sdq-font);
      cursor: pointer;
    }
    .sdq-guided-hint__dismiss:hover {
      background: rgba(51, 65, 85, 0.95);
    }
    .sdq-guided-target {
      position: relative;
      z-index: 36;
    }
  `;
  root.append(style);
}

function positionSpotlight(spotlight: HTMLElement, target: Element | null): void {
  if (!target) {
    spotlight.hidden = true;
    return;
  }

  const rect = target.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) {
    spotlight.hidden = true;
    return;
  }

  spotlight.hidden = false;
  spotlight.style.top = `${Math.max(8, rect.top - 4)}px`;
  spotlight.style.left = `${Math.max(8, rect.left - 4)}px`;
  spotlight.style.width = `${rect.width + 8}px`;
  spotlight.style.height = `${rect.height + 8}px`;
}

function findHintTarget(root: ParentNode, hint: GuidedHint): Element | null {
  const target = root.querySelector(hint.targetSelector);
  if (!target) {
    return null;
  }

  const htmlTarget = target as HTMLElement;
  if (htmlTarget.hidden || htmlTarget.closest('[hidden]')) {
    return null;
  }

  return target;
}

export function mountGuidedOverlay(
  container: HTMLElement,
  problemId: string,
  callbacks: GuidedOverlayCallbacks = {},
): GuidedOverlay {
  injectGuidedStyles(document.head);

  let state = startGuidedSession(problemId);
  let previousPhase: GamePhase = 'briefing';
  let previousGraph: ArchitectureGraph = { nodes: [], edges: [] };
  let highlightedTarget: Element | null = null;

  const overlay = document.createElement('div');
  overlay.className = 'sdq-guided-overlay';
  overlay.setAttribute('data-testid', 'guided-overlay');

  const spotlight = document.createElement('div');
  spotlight.className = 'sdq-guided-spotlight';
  spotlight.setAttribute('data-testid', 'guided-spotlight');
  spotlight.hidden = true;

  const hintCard = document.createElement('div');
  hintCard.className = 'sdq-guided-hint';
  hintCard.setAttribute('data-testid', 'guided-hint');
  hintCard.hidden = true;

  const hintTitle = document.createElement('h3');
  hintTitle.className = 'sdq-guided-hint__title';
  hintTitle.setAttribute('data-testid', 'guided-hint-title');

  const hintBody = document.createElement('p');
  hintBody.className = 'sdq-guided-hint__body';
  hintBody.setAttribute('data-testid', 'guided-hint-body');

  const hintActions = document.createElement('div');
  hintActions.className = 'sdq-guided-hint__actions';

  const dismissButton = document.createElement('button');
  dismissButton.type = 'button';
  dismissButton.className = 'sdq-guided-hint__dismiss';
  dismissButton.setAttribute('data-testid', 'guided-hint-dismiss');
  dismissButton.textContent = 'Pular dica';

  hintActions.append(dismissButton);
  hintCard.append(hintTitle, hintBody, hintActions);
  overlay.append(spotlight, hintCard);
  container.append(overlay);

  const clearHighlight = (): void => {
    if (highlightedTarget) {
      highlightedTarget.classList.remove('sdq-guided-target');
      highlightedTarget = null;
    }
  };

  const renderHint = (hint: GuidedHint | null): void => {
    clearHighlight();

    if (!hint) {
      hintCard.hidden = true;
      spotlight.hidden = true;
      return;
    }

    hintTitle.textContent = hint.title;
    hintBody.textContent = hint.body;
    hintCard.hidden = false;
    hintCard.setAttribute('data-guided-step', hint.stepId);

    const target = findHintTarget(document, hint);
    if (target) {
      target.classList.add('sdq-guided-target');
      highlightedTarget = target;
    }
    positionSpotlight(spotlight, target);
  };

  const applyState = (nextState: GuidedState): void => {
    const previousStepId = getCurrentStep(state)?.id;
    state = nextState;
    const currentStepId = getCurrentStep(state)?.id ?? null;
    renderHint(getCurrentHint(state));
    callbacks.onStepChange?.(currentStepId);

    if (previousStepId !== 'complete' && currentStepId === 'complete') {
      callbacks.onComplete?.();
    }
  };

  const sync = (phase: GamePhase, graph: ArchitectureGraph): void => {
    const next = syncGuidedStateFromSession(
      state,
      phase,
      graph,
      previousGraph,
      previousPhase,
    );
    previousPhase = phase;
    previousGraph = {
      nodes: graph.nodes.map((node) => ({ ...node, position: { ...node.position } })),
      edges: graph.edges.map((edge) => ({ ...edge })),
    };
    applyState(next);
  };

  dismissButton.addEventListener('click', () => {
    applyState(advanceHint(state, { type: 'dismiss_hint' }));
  });

  return {
    root: overlay,
    getState: () => state,
    sync,
    destroy: () => {
      clearHighlight();
      overlay.remove();
    },
  };
}
