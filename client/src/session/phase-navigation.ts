import { getProblem, URL_SHORTENER_ID } from '@sdq/shared';
import { getCurrentStep } from '../guided/guided-mode';
import { mountGuidedOverlay } from '../guided/guided-overlay';
import type { ExperienceLevel } from '../storage/preferences';
import { unlockProblemLibrary } from '../storage/preferences';
import type { GameMode, GamePhase } from '../test-hook';
import { setGuidedStep } from '../test-hook';
import { mountBriefingPanel } from '../ui/briefing-panel';
import { bindGlossaryShortcut, openGlossaryPanel } from '../ui/glossary';
import { mountPalette } from '../ui/palette';
import { mountRequirementsPanel } from '../ui/requirements-panel';
import { mountSuggestionCards } from '../ui/requirement-suggestions';
import { mountSubmitPanel } from '../ui/submit-panel';
import { canGoBackPhase } from './phase-machine';
import {
  advancePhase,
  createSession,
  getGraph,
  getRequirements,
  getSession,
  goBackPhase,
  setGraph,
  setRequirements,
  subscribeGraphChanges,
} from './session-store';

export interface PhaseLayerVisibility {
  briefing: boolean;
  requirements: boolean;
  palette: boolean;
  submit: boolean;
  showBack: boolean;
}

export interface MountPhaseNavigationOptions {
  problemId?: string;
  mode?: GameMode;
  canvas?: HTMLElement | null;
  guidedMode?: boolean;
  experienceLevel?: ExperienceLevel | null;
}

export interface PhaseNavigation {
  root: HTMLElement;
  sync(): void;
  destroy(): void;
}

export function getPhaseLayerVisibility(phase: GamePhase): PhaseLayerVisibility {
  return {
    briefing: phase === 'briefing',
    requirements: phase === 'requirements',
    palette: phase === 'canvas',
    submit: phase === 'canvas' || phase === 'result',
    showBack: canGoBackPhase(phase),
  };
}

function injectPhaseNavigationStyles(root: HTMLElement): void {
  if (document.getElementById('sdq-phase-nav-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'sdq-phase-nav-styles';
  style.textContent = `
    .sdq-phase-back {
      position: fixed;
      top: 16px;
      left: 16px;
      z-index: 25;
      border: 1px solid rgba(148, 163, 184, 0.35);
      background: rgba(30, 41, 59, 0.92);
      color: #e2e8f0;
      border-radius: 8px;
      padding: 8px 14px;
      font: 600 13px system-ui, sans-serif;
      cursor: pointer;
    }
    .sdq-phase-back:hover {
      background: rgba(51, 65, 85, 0.95);
    }
  `;
  root.append(style);
}

export function mountPhaseNavigation(
  container: HTMLElement,
  options: MountPhaseNavigationOptions = {},
): PhaseNavigation {
  const problemId = options.problemId ?? URL_SHORTENER_ID;
  const mode = options.mode ?? 'study';
  const guidedMode = options.guidedMode ?? false;
  const experienceLevel = options.experienceLevel ?? null;
  const problem = getProblem(problemId);
  if (!problem) {
    throw new Error(`Unknown problem: ${problemId}`);
  }

  injectPhaseNavigationStyles(document.head);
  createSession(problemId, mode, { guidedMode, experienceLevel });

  const shell = document.createElement('div');
  shell.className = 'sdq-phase-shell';
  shell.setAttribute('data-testid', 'phase-shell');
  container.append(shell);

  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'sdq-phase-back';
  backButton.setAttribute('data-testid', 'phase-back');
  backButton.textContent = 'Voltar';
  shell.append(backButton);

  const briefingPanel = mountBriefingPanel(shell, {
    onStart: () => {
      advancePhase();
      sync();
    },
  });
  briefingPanel.render(problem);

  const requirementsPanel = mountRequirementsPanel(
    shell,
    {
      onAdvance: (requirements) => {
        setRequirements(requirements);
        advancePhase();
        sync();
      },
    },
    getRequirements(),
  );

  const requirementsCard = requirementsPanel.root.querySelector('.sdq-requirements__card');
  if (requirementsCard) {
    mountSuggestionCards(requirementsCard, {
      problemId,
      onAdd: (text, kind) => {
        requirementsPanel.addRequirement(kind, text);
      },
    });
  }

  const palette = mountPalette(shell, {
    tier: 1,
    dropTarget: options.canvas ?? undefined,
  });

  const glossaryPanel = openGlossaryPanel(problemId, shell);
  const unbindGlossaryShortcut = bindGlossaryShortcut(glossaryPanel);

  const submitPanel = mountSubmitPanel(shell, {
    getGraph,
    onSubmitSuccess: (graph) => {
      setGraph(graph);
      advancePhase();
      sync();
    },
  });

  let guidedOverlay: ReturnType<typeof mountGuidedOverlay> | null = null;
  let unsubscribeGraphChanges: (() => void) | null = null;

  if (guidedMode) {
    guidedOverlay = mountGuidedOverlay(shell, problemId, {
      onComplete: () => {
        unlockProblemLibrary();
      },
      onStepChange: (stepId) => {
        setGuidedStep(stepId);
      },
    });
    unsubscribeGraphChanges = subscribeGraphChanges(() => {
      sync();
    });
  }

  const sync = (): void => {
    const session = getSession();
    const phase = session?.phase ?? 'briefing';
    const visibility = getPhaseLayerVisibility(phase);

    briefingPanel.root.hidden = !visibility.briefing;
    requirementsPanel.root.hidden = !visibility.requirements;
    palette.hidden = !visibility.palette;
    submitPanel.root.hidden = !visibility.submit;
    backButton.hidden = !visibility.showBack;

    if (phase === 'requirements') {
      requirementsPanel.setRequirements(getRequirements());
    }

    const resultPlaceholder = shell.querySelector('[data-testid="result-placeholder"]');
    if (phase === 'result') {
      resultPlaceholder?.classList.add('sdq-result-placeholder--visible');
    } else {
      resultPlaceholder?.classList.remove('sdq-result-placeholder--visible');
    }

    if (guidedOverlay && session) {
      guidedOverlay.sync(phase, session.graph);
      setGuidedStep(getCurrentStep(guidedOverlay.getState())?.id ?? null);
    }
  };

  backButton.addEventListener('click', () => {
    goBackPhase();
    sync();
  });

  sync();

  return {
    root: shell,
    sync,
    destroy: () => {
      unbindGlossaryShortcut();
      glossaryPanel.destroy();
      unsubscribeGraphChanges?.();
      guidedOverlay?.destroy();
    },
  };
}
