import { DEFAULT_SIMULATION, getProblem, normalizeGraph, URL_SHORTENER_ID } from '@sdq/shared';
import type { submitForJudging } from '../judge/judge-api';
import { getCurrentStep } from '../guided/guided-mode';
import { mountGuidedOverlay } from '../guided/guided-overlay';
import type { ExperienceLevel } from '../storage/preferences';
import { unlockProblemLibrary } from '../storage/preferences';
import { isQualifyingCompletion, recordCompletion } from '../storage/progress';
import { getOrCreateNickname } from '../storage/nickname';
import { submitLeaderboardScore } from '../leaderboard/leaderboard-api';
import type { GameMode, GamePhase } from '../test-hook';
import { setGuidedStep } from '../test-hook';
import { mountBriefingPanel } from '../ui/briefing-panel';
import { bindGlossaryShortcut, openGlossaryPanel } from '../ui/glossary';
import { mountPalette } from '../ui/palette';
import { mountRequirementsPanel } from '../ui/requirements-panel';
import { mountSuggestionCards } from '../ui/requirement-suggestions';
import { mountResultPanel, type ResultPanel } from '../ui/result-panel';
import { mountSubmitPanel } from '../ui/submit-panel';
import { mountTimerPanel } from '../ui/timer-panel';
import { mountSessionHeader } from '../ui/session-header';
import { mountSimControls } from '../ui/sim-controls';
import { mountProblemDrawer } from '../ui/problem-drawer';
import { canGoBackPhase } from './phase-machine';
import {
  advancePhase,
  createSession,
  getElapsedMs,
  getGraph,
  getJudgeResult,
  getRequirements,
  getSession,
  goBackPhase,
  markSubmitted,
  setGraph,
  setJudgeResult,
  setRequirements,
  subscribeGraphChanges,
} from './session-store';

export interface PhaseLayerVisibility {
  briefing: boolean;
  requirements: boolean;
  palette: boolean;
  submit: boolean;
  result: boolean;
  showBack: boolean;
}

export interface MountPhaseNavigationOptions {
  problemId?: string;
  mode?: GameMode;
  canvas?: HTMLElement | null;
  guidedMode?: boolean;
  experienceLevel?: ExperienceLevel | null;
  submitForJudging?: typeof submitForJudging;
  retryLastJudging?: typeof import('../judge/judge-api').retryLastJudging;
  submitLeaderboardScoreFn?: typeof submitLeaderboardScore;
  getNickname?: () => string;
  now?: () => number;
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
    submit: phase === 'canvas',
    result: phase === 'result',
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
    .sdq-phase-back--with-palette {
      left: 236px;
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
  const now = options.now ?? Date.now;
  createSession(problemId, mode, { guidedMode, experienceLevel }, now);

  const submitScore = options.submitLeaderboardScoreFn ?? submitLeaderboardScore;
  const getNickname = options.getNickname ?? getOrCreateNickname;

  let beginnerMode = experienceLevel === 'beginner';

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

  const resultHost = document.createElement('div');
  resultHost.setAttribute('data-testid', 'result-panel-host');
  shell.append(resultHost);

  let resultPanel: ResultPanel | null = null;

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
    tier: 2,
    dropTarget: options.canvas ?? undefined,
  });

  const sessionHeader = mountSessionHeader(shell, problem.title);
  const blueprint = (
    window as Window & { __BLUEPRINT__?: import('../blueprint/blueprint-canvas').BlueprintCanvas }
  ).__BLUEPRINT__;

  const simControlsRef: { current: ReturnType<typeof mountSimControls> | null } = { current: null };
  const simControls = mountSimControls(sessionHeader.controlsSlot, {
    getSettings: () => getGraph().simulation ?? { ...DEFAULT_SIMULATION },
    onChange: (partial) => {
      if (blueprint) {
        blueprint.updateSimulation(partial);
      } else {
        const g = getGraph();
        setGraph({
          ...g,
          simulation: { ...(g.simulation ?? DEFAULT_SIMULATION), ...partial },
        });
      }
      simControlsRef.current?.sync(getGraph().simulation ?? DEFAULT_SIMULATION);
    },
  });
  simControlsRef.current = simControls;

  const problemDrawer = mountProblemDrawer(shell, problem);

  const glossaryPanel = openGlossaryPanel(problemId, shell);
  const unbindGlossaryShortcut = bindGlossaryShortcut(glossaryPanel);

  const timerPanel = mountTimerPanel(shell, {
    getMode: () => getSession()?.mode ?? mode,
    now,
  });

  const submitPanel = mountSubmitPanel(shell, {
    getGraph,
    buildJudgeInput: (graph) => ({
      problemId,
      requirements: getRequirements(),
      graph: normalizeGraph(graph),
      mode,
    }),
    onSubmitStart: () => {
      if (mode === 'speedrun') {
        markSubmitted(now);
        timerPanel.sync();
      }
    },
    onJudgeSuccess: (result) => {
      setGraph(getGraph());
      setJudgeResult(result);
      advancePhase();
      sync();
    },
    submitForJudging: options.submitForJudging,
    retryLastJudging: options.retryLastJudging,
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
    backButton.classList.toggle('sdq-phase-back--with-palette', visibility.palette);
    sessionHeader.setVisible(phase === 'canvas');
    if (phase !== 'canvas') {
      problemDrawer.close();
    }

    if (phase === 'requirements') {
      requirementsPanel.setRequirements(getRequirements());
    }

    const judgeResult = getJudgeResult();
    if (phase === 'result' && judgeResult) {
      if (isQualifyingCompletion(judgeResult.verdict, judgeResult.score)) {
        recordCompletion(problemId, judgeResult.verdict, judgeResult.score);
      }
      if (mode === 'speedrun' && isQualifyingCompletion(judgeResult.verdict, judgeResult.score)) {
        const active = getSession();
        if (active) {
          void submitScore({
            problemId,
            playerNickname: getNickname(),
            elapsedMs: getElapsedMs(active, now),
            score: judgeResult.score,
            verdict: judgeResult.verdict,
          });
        }
      }
      if (!resultPanel) {
        resultPanel = mountResultPanel(resultHost, judgeResult, {
          beginnerMode,
          onToggleBeginner: (enabled) => {
            beginnerMode = enabled;
          },
        });
      } else {
        resultPanel.render(judgeResult);
        resultPanel.setBeginnerMode(beginnerMode);
      }
      resultHost.hidden = false;
    } else {
      resultHost.hidden = true;
    }

    if (guidedOverlay && session) {
      guidedOverlay.sync(phase, session.graph);
      setGuidedStep(getCurrentStep(guidedOverlay.getState())?.id ?? null);
    }

    timerPanel.sync();
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
      simControls.destroy();
      sessionHeader.destroy();
      problemDrawer.destroy();
    },
  };
}
