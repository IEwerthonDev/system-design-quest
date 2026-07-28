import { DEFAULT_SIMULATION, getProblem, normalizeGraph, URL_SHORTENER_ID, verdictToSessionStatus } from '@sdq/shared';
import type { DesignSessionRecord, DesignSessionStatus, DesignSessionUpsertInput } from '@sdq/shared';
import type { submitForJudging } from '../judge/judge-api';
import { getLocale } from '../i18n/locale';
import { getCurrentStep } from '../guided/guided-mode';
import { mountGuidedOverlay } from '../guided/guided-overlay';
import type { ExperienceLevel } from '../storage/preferences';
import { unlockProblemLibrary } from '../storage/preferences';
import { isQualifyingCompletion, recordCompletion } from '../storage/progress';
import { getOrCreateNickname } from '../storage/nickname';
import { submitLeaderboardScore } from '../leaderboard/leaderboard-api';
import { SessionsApiError, upsertSession } from '../sessions/sessions-api';
import type { GameMode, GamePhase } from '../test-hook';
import { setGuidedStep } from '../test-hook';
import { mountBriefingPanel } from '../ui/briefing-panel';
import { bindGlossaryShortcut, openGlossaryPanel } from '../ui/glossary';
import { mountPalette } from '../ui/palette';
import { mountRequirementsPanel } from '../ui/requirements-panel';
import { mountSuggestionCards } from '../ui/requirement-suggestions';
import { mountResultPanel, type ResultPanel } from '../ui/result-panel';
import {
  mountSessionConfirmModal,
  type SessionConfirmModal,
} from '../ui/session-confirm-modal';
import { mountSubmitPanel } from '../ui/submit-panel';
import { mountTimerPanel } from '../ui/timer-panel';
import { mountSessionHeader } from '../ui/session-header';
import { mountSettingsPanel } from '../ui/settings-panel';
import { mountSimControls } from '../ui/sim-controls';
import { mountProblemDrawer } from '../ui/problem-drawer';
import { t } from '../i18n/t';
import { shareDesign } from '../share/share-design';
import { bindAbandonTracking, track } from '../analytics/track';
import {
  advancePhase,
  createSession,
  getElapsedMs,
  getGraph,
  getJudgeResult,
  getRequirements,
  getSession,
  goBackPhase,
  hydrateFromDesignSession,
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
  /** When set, hydrate this persisted session instead of creating a new one (PP-08). */
  designSession?: DesignSessionRecord;
  /** Exit session and return to problem library (home). */
  onExitToLibrary?: () => void;
  /** Open sessions dashboard after saving the judged session. */
  onOpenSessions?: (status: DesignSessionStatus) => void;
  storage?: Storage;
  submitForJudging?: typeof submitForJudging;
  retryLastJudging?: typeof import('../judge/judge-api').retryLastJudging;
  submitLeaderboardScoreFn?: typeof submitLeaderboardScore;
  upsertSessionFn?: typeof upsertSession;
  getNickname?: () => string;
  /** Injectable analytics emitter (tests). */
  trackFn?: typeof track;
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
    showBack: phase !== 'result',
  };
}

function injectPhaseNavigationStyles(): void {
  if (document.getElementById('sdq-phase-nav-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'sdq-phase-nav-styles';
  style.textContent = `/* phase-back styles live in theme/global.css */`;
  document.head.append(style);
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

  injectPhaseNavigationStyles();
  const now = options.now ?? Date.now;
  if (options.designSession) {
    hydrateFromDesignSession(
      options.designSession,
      { guidedMode, experienceLevel },
      now,
    );
    const blueprint = (
      window as Window & { __BLUEPRINT__?: import('../blueprint/blueprint-canvas').BlueprintCanvas }
    ).__BLUEPRINT__;
    if (blueprint) {
      blueprint.setGraph(getGraph());
    }
  } else {
    createSession(problemId, mode, { guidedMode, experienceLevel }, now);
  }

  const submitScore = options.submitLeaderboardScoreFn ?? submitLeaderboardScore;
  const getNickname = options.getNickname ?? getOrCreateNickname;
  const upsertSessionFn = options.upsertSessionFn ?? upsertSession;
  const emitTrack = options.trackFn ?? track;

  let beginnerMode = experienceLevel === 'beginner';
  let lastTrackedPhase: GamePhase | null = null;
  let reachedResult = false;

  emitTrack('problem_start', { problemId, mode });

  const unbindAbandon = bindAbandonTracking({
    getProblemId: () => problemId,
    getPhase: () => getSession()?.phase ?? lastTrackedPhase,
    hasReachedResult: () => reachedResult,
    trackFn: emitTrack,
  });

  const shell = document.createElement('div');
  shell.className = 'sdq-phase-shell';
  shell.setAttribute('data-testid', 'phase-shell');
  container.append(shell);

  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'sdq-phase-back';
  backButton.setAttribute('data-testid', 'phase-back');
  backButton.textContent = 'Início';
  shell.append(backButton);

  const resultHost = document.createElement('div');
  resultHost.setAttribute('data-testid', 'result-panel-host');
  shell.append(resultHost);

  let resultPanel: ResultPanel | null = null;
  let confirmModal: SessionConfirmModal | null = null;

  const destroyConfirmModal = (): void => {
    confirmModal?.destroy();
    confirmModal = null;
  };

  const persistDesignSession = async (status: DesignSessionStatus): Promise<boolean> => {
    const session = getSession();
    if (!session) {
      return false;
    }
    const input: DesignSessionUpsertInput = {
      id: session.id,
      problemId: session.problemId,
      playerNickname: getNickname(),
      status,
      graph: getGraph(),
      requirements: getRequirements(),
      judgeResult: getJudgeResult(),
      mode: session.mode,
    };
    try {
      await upsertSessionFn(input);
      confirmModal?.setError(null);
      return true;
    } catch (err) {
      const message =
        err instanceof SessionsApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Falha ao salvar sessão';
      confirmModal?.setError(message);
      return false;
    }
  };

  const handleResultBack = async (): Promise<void> => {
    const ok = await persistDesignSession('in_progress');
    if (!ok) {
      return;
    }
    destroyConfirmModal();
    goBackPhase();
    sync();
  };

  const handleResultConfirm = async (): Promise<void> => {
    const judgeResult = getJudgeResult();
    if (!judgeResult) {
      return;
    }
    const status = verdictToSessionStatus(judgeResult.verdict);
    const ok = await persistDesignSession(status);
    if (!ok) {
      return;
    }
    destroyConfirmModal();
  };

  const handleOpenSessions = async (): Promise<void> => {
    const judgeResult = getJudgeResult();
    if (!judgeResult) {
      return;
    }
    const status = verdictToSessionStatus(judgeResult.verdict);
    // Pending confirm → same upsert as Confirmar, then open; already confirmed → open only
    if (confirmModal) {
      const ok = await persistDesignSession(status);
      if (!ok) {
        return;
      }
      destroyConfirmModal();
    }
    options.onOpenSessions?.(status);
  };

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
    onTapPlace: () => palette.close(),
  });

  const sessionHeader = mountSessionHeader(shell, problem.title);

  const shareBtn = document.createElement('button');
  shareBtn.type = 'button';
  shareBtn.className = 'sdq-phase-share';
  shareBtn.setAttribute('data-testid', 'share-design');
  shareBtn.textContent = t('share.cta');
  shareBtn.addEventListener('click', () => {
    void shareDesign({
      problemId,
      graph: getGraph(),
      onCopied: (message) => {
        shareBtn.textContent = message;
        window.setTimeout(() => {
          shareBtn.textContent = t('share.cta');
        }, 1600);
      },
      onOversized: (_json, message) => {
        shareBtn.textContent = message;
        window.setTimeout(() => {
          shareBtn.textContent = t('share.cta');
        }, 2800);
      },
    });
  });
  sessionHeader.trailingSlot.append(shareBtn);

  const settingsPanel = mountSettingsPanel(shell, {
    anchor: sessionHeader.trailingSlot,
    storage: options.storage,
  });
  settingsPanel.setVisible(false);

  const placeBackButton = (inHeader: boolean): void => {
    backButton.classList.toggle('sdq-phase-back--in-header', inHeader);
    if (inHeader) {
      sessionHeader.leadingSlot.append(backButton);
    } else if (backButton.parentElement !== shell) {
      shell.append(backButton);
    }
  };

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
      locale: getLocale(),
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

    if (phase !== lastTrackedPhase) {
      lastTrackedPhase = phase;
      if (phase === 'requirements') {
        emitTrack('phase_requirements', { problemId });
      } else if (phase === 'canvas') {
        emitTrack('phase_canvas', { problemId });
      } else if (phase === 'result') {
        reachedResult = true;
        emitTrack('phase_result', { problemId });
      }
    }

    briefingPanel.root.hidden = !visibility.briefing;
    requirementsPanel.root.hidden = !visibility.requirements;
    palette.setVisible(visibility.palette);
    submitPanel.root.hidden = !visibility.submit;
    backButton.hidden = !visibility.showBack;
    placeBackButton(visibility.palette);
    sessionHeader.setVisible(phase === 'canvas');
    settingsPanel.setVisible(phase === 'canvas');
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
          onOpenSessions: options.onOpenSessions ? () => handleOpenSessions() : undefined,
        });
      } else {
        resultPanel.render(judgeResult);
        resultPanel.setBeginnerMode(beginnerMode);
      }
      resultHost.hidden = false;

      if (!confirmModal) {
        const status = verdictToSessionStatus(judgeResult.verdict);
        confirmModal = mountSessionConfirmModal(shell, {
          status,
          onConfirm: () => {
            void handleResultConfirm();
          },
          onBack: () => {
            void handleResultBack();
          },
        });
      }
    } else {
      resultHost.hidden = true;
      destroyConfirmModal();
    }

    if (guidedOverlay && session) {
      guidedOverlay.sync(phase, session.graph);
      setGuidedStep(getCurrentStep(guidedOverlay.getState())?.id ?? null);
    }

    timerPanel.sync();
  };

  backButton.addEventListener('click', () => {
    const phase = getSession()?.phase;
    if (phase === 'result') {
      void handleResultBack();
      return;
    }
    options.onExitToLibrary?.();
  });

  sync();

  return {
    root: shell,
    sync,
    destroy: () => {
      unbindAbandon();
      unbindGlossaryShortcut();
      glossaryPanel.destroy();
      unsubscribeGraphChanges?.();
      guidedOverlay?.destroy();
      simControls.destroy();
      settingsPanel.root.remove();
      sessionHeader.destroy();
      problemDrawer.destroy();
      destroyConfirmModal();
    },
  };
}
