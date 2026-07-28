import type { AuthMeResponse } from '@sdq/shared';
import {
  analyzeTopology,
  DEFAULT_SIMULATION,
  getProblem,
  normalizeGraph,
  SANDBOX_PROBLEM_ID,
  URL_SHORTENER_ID,
  verdictToSessionStatus,
} from '@sdq/shared';
import type {
  ArchitectureFinding,
  DesignSessionRecord,
  DesignSessionStatus,
  DesignSessionUpsertInput,
} from '@sdq/shared';
import type { submitForJudging } from '../judge/judge-api';
import { fetchMe } from '../auth/auth-api';
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
import { mountFindingsPanel } from '../ui/findings-panel';
import { mountWorkloadPanel } from '../ui/workload-panel';
import { mountMentorPanel } from '../ui/mentor-panel';
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
  /** Auth check before speedrun leaderboard submit (defaults to fetchMe). */
  getAuth?: () => Promise<AuthMeResponse>;
  /** Non-blocking notice when speedrun qualify skips LB (guest / no nick). */
  onLeaderboardSkipped?: (reason: 'unauthenticated') => void;
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
  style.textContent = `
    /* phase-back styles live in theme/global.css */
    .sdq-phase-auth-notice {
      position: fixed;
      bottom: calc(16px + env(safe-area-inset-bottom));
      left: 50%;
      transform: translateX(-50%);
      z-index: 35;
      max-width: min(420px, calc(100vw - 24px));
      padding: 12px 16px;
      border-radius: var(--sdq-radius-sm, 6px);
      background: var(--sdq-bg-elevated, #1a1a1e);
      border: 1px solid var(--sdq-border, rgba(255,255,255,0.12));
      color: var(--sdq-text, #f4f4f5);
      font: 500 13px var(--sdq-font, system-ui, sans-serif);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    }
  `;
  document.head.append(style);
}

export function mountPhaseNavigation(
  container: HTMLElement,
  options: MountPhaseNavigationOptions = {},
): PhaseNavigation {
  const problemId = options.problemId ?? URL_SHORTENER_ID;
  const mode = options.mode ?? 'study';
  const isSandbox = mode === 'sandbox' || problemId === SANDBOX_PROBLEM_ID;
  const guidedMode = options.guidedMode ?? false;
  const experienceLevel = options.experienceLevel ?? null;
  const problem = getProblem(isSandbox ? SANDBOX_PROBLEM_ID : problemId);
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
  } else {
    createSession(
      isSandbox ? SANDBOX_PROBLEM_ID : problemId,
      isSandbox ? 'sandbox' : mode,
      { guidedMode, experienceLevel },
      now,
    );
  }

  let latestFindings: ArchitectureFinding[] = [];

  // Blueprint host survives library ↔ session transitions; always sync so a new
  // challenge never shows the previous problem's drawing.
  const bootBlueprint = (
    window as Window & { __BLUEPRINT__?: import('../blueprint/blueprint-canvas').BlueprintCanvas }
  ).__BLUEPRINT__;
  if (bootBlueprint) {
    bootBlueprint.setGraph(getGraph());
  }

  const submitScore = options.submitLeaderboardScoreFn ?? submitLeaderboardScore;
  const getNickname = options.getNickname ?? getOrCreateNickname;
  const getAuth = options.getAuth ?? (() => fetchMe());
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
  shareBtn.className = 'sdq-settings-btn--in-header sdq-phase-share';
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

  const findingsPanel = mountFindingsPanel(shell);
  let workloadPanel: ReturnType<typeof mountWorkloadPanel> | null = null;

  const refreshFindings = (): void => {
    const g = getGraph();
    // Always evaluate topology (structural + pressure) so Study Mode mentor works without Start.
    latestFindings = analyzeTopology(g);
    findingsPanel.sync(latestFindings);
  };

  const applySimPartial = (partial: Partial<import('@sdq/shared').SimulationSettings>): void => {
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
    workloadPanel?.sync(getGraph().simulation ?? DEFAULT_SIMULATION);
    refreshFindings();
  };

  const simControls = mountSimControls(sessionHeader.controlsSlot, {
    getSettings: () => getGraph().simulation ?? { ...DEFAULT_SIMULATION },
    onChange: applySimPartial,
  });
  simControlsRef.current = simControls;

  const problemDrawer = isSandbox ? null : mountProblemDrawer(shell, problem);

  workloadPanel = isSandbox
    ? mountWorkloadPanel(shell, {
        getSettings: () => getGraph().simulation ?? { ...DEFAULT_SIMULATION },
        onChange: applySimPartial,
      })
    : null;

  const mentorPanel = isSandbox
    ? mountMentorPanel(shell, {
        getFindings: () => latestFindings,
      })
    : null;

  const glossaryPanel = openGlossaryPanel(isSandbox ? URL_SHORTENER_ID : problemId, shell);
  const unbindGlossaryShortcut = bindGlossaryShortcut(glossaryPanel);

  const timerPanel = mountTimerPanel(shell, {
    getMode: () => getSession()?.mode ?? mode,
    now,
  });

  const submitPanel = isSandbox
    ? null
    : mountSubmitPanel(shell, {
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

  unsubscribeGraphChanges = subscribeGraphChanges(() => {
    refreshFindings();
    if (guidedMode) {
      sync();
    }
  });

  if (guidedMode) {
    guidedOverlay = mountGuidedOverlay(shell, problemId, {
      onComplete: () => {
        unlockProblemLibrary();
      },
      onStepChange: (stepId) => {
        setGuidedStep(stepId);
      },
    });
  }

  let leaderboardSubmitAttempted = false;

  const showLeaderboardSkipNotice = (): void => {
    options.onLeaderboardSkipped?.('unauthenticated');
    if (shell.querySelector('[data-testid="speedrun-auth-notice"]')) {
      return;
    }
    const notice = document.createElement('div');
    notice.className = 'sdq-phase-auth-notice';
    notice.setAttribute('data-testid', 'speedrun-auth-notice');
    notice.setAttribute('role', 'status');
    notice.textContent = t('speedrun.signInToRank');
    shell.append(notice);
    window.setTimeout(() => {
      notice.remove();
    }, 4500);
  };

  const trySubmitLeaderboard = async (): Promise<void> => {
    const judgeResult = getJudgeResult();
    const active = getSession();
    if (!judgeResult || !active) {
      return;
    }
    if (!isQualifyingCompletion(judgeResult.verdict, judgeResult.score)) {
      return;
    }
    let me: AuthMeResponse;
    try {
      me = await getAuth();
    } catch {
      showLeaderboardSkipNotice();
      return;
    }
    if (!me.authenticated || !me.publicNickname) {
      showLeaderboardSkipNotice();
      return;
    }
    try {
      await submitScore({
        problemId,
        playerNickname: me.publicNickname,
        elapsedMs: getElapsedMs(active, now),
        score: judgeResult.score,
        verdict: judgeResult.verdict,
      });
    } catch {
      // Non-blocking — ranking submit must not break result UI
    }
  };

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

    briefingPanel.root.hidden = !visibility.briefing || isSandbox;
    requirementsPanel.root.hidden = !visibility.requirements || isSandbox;
    palette.setVisible(visibility.palette);
    if (submitPanel) {
      submitPanel.root.hidden = !visibility.submit;
    }
    if (findingsPanel.root) {
      findingsPanel.root.hidden = phase !== 'canvas';
      if (phase === 'canvas') {
        refreshFindings();
      }
    }
    if (workloadPanel) {
      workloadPanel.root.hidden = phase !== 'canvas';
    }
    if (mentorPanel) {
      mentorPanel.root.hidden = phase !== 'canvas';
    }
    backButton.hidden = !visibility.showBack;
    placeBackButton(visibility.palette);
    sessionHeader.setVisible(phase === 'canvas');
    settingsPanel.setVisible(phase === 'canvas');
    if (phase !== 'canvas') {
      problemDrawer?.close();
    }

    if (phase === 'requirements') {
      requirementsPanel.setRequirements(getRequirements());
    }

    const judgeResult = getJudgeResult();
    if (phase === 'result' && judgeResult) {
      if (isQualifyingCompletion(judgeResult.verdict, judgeResult.score)) {
        recordCompletion(problemId, judgeResult.verdict, judgeResult.score);
      }
      if (
        mode === 'speedrun' &&
        !leaderboardSubmitAttempted &&
        isQualifyingCompletion(judgeResult.verdict, judgeResult.score)
      ) {
        leaderboardSubmitAttempted = true;
        void trySubmitLeaderboard();
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
      problemDrawer?.destroy();
      findingsPanel.destroy();
      workloadPanel?.destroy();
      mentorPanel?.destroy();
      submitPanel?.root.remove();
      destroyConfirmModal();
    },
  };
}
