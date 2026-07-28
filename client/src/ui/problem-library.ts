import {
  countByDifficulty,
  filterProblems,
  listProblemsByDifficulty,
  localizeProblem,
  type Difficulty,
  type Problem,
} from '@sdq/shared';
import type { LeaderboardEntry, DesignSessionRecord } from '@sdq/shared';
import { getLocale, setLocale, type Locale } from '../i18n/locale';
import { t } from '../i18n/t';
import type { GameMode } from '../test-hook';
import { SANDBOX_PROBLEM_ID } from '@sdq/shared';
import { DIFFICULTY_LABELS } from './briefing-panel';
import {
  completionPercentByDifficulty,
  countCompletedByDifficulty,
  isProblemCompleted,
  loadProgress,
} from '../storage/progress';
import { loadNickname } from '../storage/nickname';
import { listSessions, type ListSessionsQuery, type SessionsApiOptions } from '../sessions/sessions-api';
import {
  DEFAULT_EDGE_FLAGS,
  loadEdgeFlags,
  type EdgeFlags,
} from '../config/edge-flags';
import { mountAuthUi, type AuthUi } from '../auth/auth-ui';
import { mountLeaderboardPanel } from './leaderboard-panel';

export type LibraryFilter = Difficulty | 'all';

export interface LibrarySelection {
  problemId: string;
  mode: GameMode;
}

export interface ProblemLibraryCallbacks {
  onSelect: (selection: LibrarySelection) => void;
  onOpenSessions?: () => void;
  /** Resume latest in_progress session (same path as dashboard reopen). */
  onContinueSession?: (session: DesignSessionRecord) => void;
  listSessionsFn?: (
    query: ListSessionsQuery,
    options?: SessionsApiOptions,
  ) => Promise<DesignSessionRecord[]>;
  /** Return null/empty to hide continue shortcut without remote calls. */
  getNickname?: () => string | null;
  fetchLeaderboard?: (
    problemId: string,
  ) => Promise<{ problemId: string; entries: LeaderboardEntry[] }>;
  /** Preloaded Edge Config flags (tests / bootstrap). */
  edgeFlags?: EdgeFlags;
  /** Injectable Edge Config loader; defaults to loadEdgeFlags. */
  loadEdgeFlagsFn?: () => Promise<EdgeFlags>;
  /** Skip mounting auth UI (tests that only exercise library chrome). */
  skipAuthUi?: boolean;
}

export interface ProblemLibraryPanel {
  root: HTMLElement;
  setFilter(filter: LibraryFilter): void;
  getFilter(): LibraryFilter;
}

export const DIFFICULTY_BADGES: Record<Difficulty, string> = {
  easy: '🟢',
  medium: '🟡',
  hard: '🔴',
};

export function shouldWarnHardSelection(
  problem: Problem,
  completedEasyCount: number,
): boolean {
  return problem.difficulty === 'hard' && completedEasyCount === 0;
}

export function shouldWarnSpeedrunMedium(
  mode: GameMode,
  problem: Problem,
  completedEasyCount: number,
): boolean {
  return (
    mode === 'speedrun' &&
    problem.difficulty === 'medium' &&
    completedEasyCount < 2
  );
}

function injectLibraryStyles(root: HTMLElement): void {
  if (document.getElementById('sdq-library-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'sdq-library-styles';
  style.textContent = `
    .sdq-library {
      position: fixed;
      inset: 0;
      display: flex;
      flex-direction: column;
      background: var(--sdq-bg, #0c0c0e);
      z-index: 20;
      overflow: hidden;
      font-family: var(--sdq-font, system-ui, sans-serif);
      color: var(--sdq-text, #f4f4f5);
    }
    .sdq-library__scroll {
      flex: 1;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      padding: max(20px, env(safe-area-inset-top)) 16px calc(24px + env(safe-area-inset-bottom));
    }
    .sdq-library__inner {
      width: min(1040px, 100%);
      margin: 0 auto;
    }
    .sdq-library__header {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 28px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--sdq-border, rgba(255,255,255,0.08));
    }
    .sdq-library__eyebrow {
      font: 500 11px var(--sdq-font-mono, monospace);
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--sdq-accent, #c9a962);
      margin: 0 0 6px;
    }
    .sdq-library__title {
      margin: 0;
      font-size: clamp(1.5rem, 4vw, 2rem);
      font-weight: 600;
      letter-spacing: -0.02em;
      color: var(--sdq-text);
      line-height: 1.15;
    }
    .sdq-library__header-actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
    }
    .sdq-library__locale {
      display: inline-flex;
      gap: 4px;
      padding: 4px;
      border: 1px solid var(--sdq-border);
      border-radius: var(--sdq-radius-sm, 6px);
    }
    .sdq-library__locale-btn {
      border: 1px solid transparent;
      background: transparent;
      color: var(--sdq-text-muted);
      border-radius: 4px;
      padding: 8px 12px;
      font: 600 12px var(--sdq-font-mono, monospace);
      letter-spacing: 0.04em;
      cursor: pointer;
      min-height: 36px;
      touch-action: manipulation;
    }
    .sdq-library__locale-btn--active {
      background: var(--sdq-accent-muted, rgba(201,169,98,0.15));
      border-color: var(--sdq-accent-border);
      color: var(--sdq-accent);
    }
    .sdq-library__sessions {
      border: 1px solid var(--sdq-border);
      background: transparent;
      color: var(--sdq-text-muted);
      border-radius: var(--sdq-radius-sm, 6px);
      padding: 10px 16px;
      font: 500 13px var(--sdq-font);
      cursor: pointer;
      white-space: nowrap;
      min-height: 44px;
      touch-action: manipulation;
    }
    .sdq-library__sessions:hover {
      border-color: var(--sdq-border-strong);
      color: var(--sdq-text);
    }
    .sdq-library__subtitle {
      margin: 0 0 20px;
      font-size: 15px;
      color: var(--sdq-text-muted);
      line-height: 1.55;
      max-width: 56ch;
    }
    .sdq-library__filters {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }
    .sdq-library__filter {
      border: 1px solid var(--sdq-border);
      background: transparent;
      color: var(--sdq-text-muted);
      border-radius: 999px;
      padding: 8px 16px;
      font: 500 13px var(--sdq-font);
      cursor: pointer;
      min-height: 40px;
      touch-action: manipulation;
      transition: border-color 0.15s, color 0.15s;
    }
    .sdq-library__filter--active {
      background: var(--sdq-accent-muted, rgba(201,169,98,0.15));
      border-color: var(--sdq-accent-border);
      color: var(--sdq-accent);
    }
    .sdq-library__filter-percent {
      display: inline-block;
      margin-left: 4px;
      font-size: 11px;
      font-weight: 700;
      opacity: 0.9;
    }
    .sdq-library__progress {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 24px;
      font-size: 12px;
      color: var(--sdq-text-subtle);
    }
    .sdq-library__progress-item {
      padding: 6px 12px;
      border-radius: 999px;
      background: var(--sdq-bg-surface);
      border: 1px solid var(--sdq-border);
    }
    .sdq-library__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 14px;
    }
    @media (max-width: 480px) {
      .sdq-library__grid {
        grid-template-columns: 1fr;
      }
      .sdq-library__header {
        flex-direction: column;
        align-items: stretch;
      }
      .sdq-library__sessions {
        width: 100%;
        text-align: center;
      }
    }
    .sdq-library__problem {
      border: 1px solid var(--sdq-border);
      border-radius: var(--sdq-radius, 10px);
      padding: 18px 16px 16px;
      background: var(--sdq-bg-elevated);
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: border-color 0.15s;
    }
    .sdq-library__problem:hover {
      border-color: var(--sdq-border-strong);
    }
    .sdq-library__problem--completed {
      border-color: rgba(74, 222, 128, 0.25);
    }
    .sdq-library__problem-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
    }
    .sdq-library__company {
      font: 500 10px var(--sdq-font-mono);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--sdq-accent);
      margin: 0 0 4px;
    }
    .sdq-library__problem-title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--sdq-text);
      line-height: 1.3;
      letter-spacing: -0.01em;
    }
    .sdq-library__difficulty {
      font-size: 16px;
      flex-shrink: 0;
      line-height: 1;
    }
    .sdq-library__badges {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .sdq-library__badge {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 3px 9px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      border: 1px solid var(--sdq-border);
      color: var(--sdq-text-muted);
    }
    .sdq-library__badge--recommended {
      border-color: var(--sdq-accent-border);
      color: var(--sdq-accent);
    }
    .sdq-library__badge--tutorial {
      border-color: rgba(168, 85, 247, 0.35);
      color: #d8b4fe;
    }
    .sdq-library__badge--completed {
      border-color: rgba(74, 222, 128, 0.35);
      color: var(--sdq-success);
    }
    .sdq-library__tags {
      margin: 0;
      font-size: 12px;
      color: var(--sdq-text-subtle);
      line-height: 1.4;
    }
    .sdq-library__meta {
      margin: 0;
      font-size: 11px;
      color: var(--sdq-text-subtle);
    }
    .sdq-library__actions {
      display: flex;
      gap: 8px;
      margin-top: auto;
      padding-top: 4px;
    }
    .sdq-library__action {
      flex: 1;
      border: 1px solid var(--sdq-border);
      background: var(--sdq-bg-surface);
      color: var(--sdq-text-muted);
      border-radius: var(--sdq-radius-sm);
      padding: 10px 8px;
      font: 500 12px var(--sdq-font);
      cursor: pointer;
      min-height: 44px;
      touch-action: manipulation;
    }
    .sdq-library__action--primary {
      background: var(--sdq-accent-muted);
      border-color: var(--sdq-accent-border);
      color: var(--sdq-accent);
    }
    .sdq-library__action:hover {
      border-color: var(--sdq-border-strong);
      color: var(--sdq-text);
    }
    .sdq-library__warning {
      margin: 0 0 16px;
      padding: 12px 14px;
      border-radius: var(--sdq-radius-sm);
      background: rgba(251, 191, 36, 0.08);
      border: 1px solid rgba(251, 191, 36, 0.25);
      color: var(--sdq-warning);
      font-size: 13px;
      line-height: 1.45;
    }
    .sdq-library__warning[hidden] {
      display: none;
    }
    .sdq-library__continue {
      width: 100%;
      margin: 0 0 8px;
      border: 1px solid var(--sdq-accent-border);
      background: var(--sdq-accent-muted, rgba(201,169,98,0.15));
      color: var(--sdq-accent);
      border-radius: var(--sdq-radius-sm);
      padding: 12px 14px;
      font: 600 14px var(--sdq-font);
      cursor: pointer;
      touch-action: manipulation;
      text-align: left;
    }
    .sdq-library__continue[hidden] {
      display: none !important;
    }
    .sdq-library__edge-banner {
      margin: 0 0 0.75rem;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      background: rgba(234, 179, 8, 0.15);
      border: 1px solid rgba(234, 179, 8, 0.45);
      color: #fde68a;
      font-size: 0.9rem;
      line-height: 1.4;
    }
    .sdq-library__edge-banner[hidden] {
      display: none !important;
    }
    .sdq-library__edge-banner--maintenance {
      background: rgba(239, 68, 68, 0.15);
      border-color: rgba(239, 68, 68, 0.45);
      color: #fecaca;
    }
    .sdq-library__badge--new {
      background: rgba(56, 189, 248, 0.2);
      color: #7dd3fc;
    }
    .sdq-library__action:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .sdq-library__sandbox {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin: 0 0 16px;
      padding: 14px 16px;
      border-radius: 12px;
      border: 1px solid var(--sdq-accent-border, rgba(56, 189, 248, 0.35));
      background: rgba(56, 189, 248, 0.08);
    }
    .sdq-library__sandbox-blurb {
      margin: 0;
      flex: 1 1 220px;
      font-size: 0.9rem;
      line-height: 1.4;
      color: var(--sdq-text-subtle, #a1a1aa);
    }
    .sdq-library__sandbox-btn {
      flex: 0 0 auto;
    }
  `;
  root.append(style);
}

export function mountProblemLibrary(
  container: HTMLElement,
  callbacks: ProblemLibraryCallbacks,
  storage?: Storage,
): ProblemLibraryPanel {
  injectLibraryStyles(document.head);

  let currentFilter: LibraryFilter = 'all';
  let warningMessage: string | null = null;
  let warningKind: 'hard' | 'speedrunMedium' | null = null;
  let currentLocale: Locale = getLocale(storage);
  let edgeFlags: EdgeFlags = callbacks.edgeFlags
    ? { ...callbacks.edgeFlags }
    : { ...DEFAULT_EDGE_FLAGS };

  const panel = document.createElement('div');
  panel.className = 'sdq-library';
  panel.setAttribute('data-testid', 'problem-library');

  const scroll = document.createElement('div');
  scroll.className = 'sdq-library__scroll';

  const inner = document.createElement('div');
  inner.className = 'sdq-library__inner';

  const header = document.createElement('div');
  header.className = 'sdq-library__header';

  const headerText = document.createElement('div');

  const eyebrow = document.createElement('p');
  eyebrow.className = 'sdq-library__eyebrow';
  eyebrow.textContent = 'System Design Quest';

  const title = document.createElement('h1');
  title.className = 'sdq-library__title';

  headerText.append(eyebrow, title);

  const headerActions = document.createElement('div');
  headerActions.className = 'sdq-library__header-actions';

  const localeGroup = document.createElement('div');
  localeGroup.className = 'sdq-library__locale';
  localeGroup.setAttribute('role', 'group');
  localeGroup.setAttribute('aria-label', 'Language');

  const localeEnButton = document.createElement('button');
  localeEnButton.type = 'button';
  localeEnButton.className = 'sdq-library__locale-btn';
  localeEnButton.setAttribute('data-testid', 'locale-en');
  localeEnButton.textContent = t('library.locale.en', currentLocale, storage);

  const localePtButton = document.createElement('button');
  localePtButton.type = 'button';
  localePtButton.className = 'sdq-library__locale-btn';
  localePtButton.setAttribute('data-testid', 'locale-pt-BR');
  localePtButton.textContent = t('library.locale.ptBR', currentLocale, storage);

  localeGroup.append(localeEnButton, localePtButton);

  const sessionsButton = document.createElement('button');
  sessionsButton.type = 'button';
  sessionsButton.className = 'sdq-library__sessions';
  sessionsButton.setAttribute('data-testid', 'library-open-sessions');
  sessionsButton.addEventListener('click', () => {
    callbacks.onOpenSessions?.();
  });

  const authHost = document.createElement('div');
  authHost.className = 'sdq-library__auth';
  authHost.setAttribute('data-testid', 'library-auth');

  headerActions.append(authHost, localeGroup, sessionsButton);
  header.append(headerText, headerActions);

  let authUi: AuthUi | null = null;
  if (!callbacks.skipAuthUi) {
    authUi = mountAuthUi(authHost, { storage });
  }

  const subtitle = document.createElement('p');
  subtitle.className = 'sdq-library__subtitle';

  const warning = document.createElement('div');
  warning.className = 'sdq-library__warning';
  warning.setAttribute('data-testid', 'library-warning');
  warning.hidden = true;

  const edgeBanner = document.createElement('div');
  edgeBanner.className = 'sdq-library__edge-banner';
  edgeBanner.setAttribute('data-testid', 'library-edge-banner');
  edgeBanner.hidden = true;

  const continueBtn = document.createElement('button');
  continueBtn.type = 'button';
  continueBtn.className = 'sdq-library__continue';
  continueBtn.setAttribute('data-testid', 'continue-session');
  continueBtn.hidden = true;
  let continueSession: DesignSessionRecord | null = null;
  continueBtn.addEventListener('click', () => {
    if (continueSession) {
      callbacks.onContinueSession?.(continueSession);
    }
  });

  const sandboxHero = document.createElement('div');
  sandboxHero.className = 'sdq-library__sandbox';
  sandboxHero.setAttribute('data-testid', 'library-sandbox');

  const sandboxBlurb = document.createElement('p');
  sandboxBlurb.className = 'sdq-library__sandbox-blurb';
  sandboxBlurb.setAttribute('data-testid', 'library-sandbox-blurb');

  const sandboxBtn = document.createElement('button');
  sandboxBtn.type = 'button';
  sandboxBtn.className = 'sdq-library__action sdq-library__action--primary sdq-library__sandbox-btn';
  sandboxBtn.setAttribute('data-testid', 'library-sandbox-cta');
  sandboxBtn.addEventListener('click', () => {
    if (edgeFlags.maintenance) {
      syncEdgeBanner();
      return;
    }
    callbacks.onSelect({ problemId: SANDBOX_PROBLEM_ID, mode: 'sandbox' });
  });

  sandboxHero.append(sandboxBlurb, sandboxBtn);

  const filters = document.createElement('div');
  filters.className = 'sdq-library__filters';

  const progressRow = document.createElement('div');
  progressRow.className = 'sdq-library__progress';
  progressRow.setAttribute('data-testid', 'library-progress');

  const grid = document.createElement('div');
  grid.className = 'sdq-library__grid';
  grid.setAttribute('data-testid', 'library-grid');

  inner.append(
    header,
    subtitle,
    sandboxHero,
    edgeBanner,
    warning,
    continueBtn,
    filters,
    progressRow,
    grid,
  );
  scroll.append(inner);
  panel.append(scroll);
  container.append(panel);

  const leaderboardPanel = mountLeaderboardPanel(container, {
    fetchLeaderboard: callbacks.fetchLeaderboard,
  });

  const filterOptions = (): Array<{ id: LibraryFilter; label: string }> => [
    { id: 'all', label: t('library.filter.all', currentLocale, storage) },
    { id: 'easy', label: t('library.filter.easy', currentLocale, storage) },
    { id: 'medium', label: t('library.filter.medium', currentLocale, storage) },
    { id: 'hard', label: t('library.filter.hard', currentLocale, storage) },
  ];

  const idsForDifficulty = (difficulty: Difficulty) =>
    listProblemsByDifficulty(difficulty).map((problem) => problem.id);

  const getCompletedEasyCount = (): number =>
    countCompletedByDifficulty('easy', idsForDifficulty, storage).completed;

  const localized = (problem: Problem): Problem => localizeProblem(problem, currentLocale);

  const renderLocaleButtons = (): void => {
    localeEnButton.className = `sdq-library__locale-btn${
      currentLocale === 'en' ? ' sdq-library__locale-btn--active' : ''
    }`;
    localePtButton.className = `sdq-library__locale-btn${
      currentLocale === 'pt-BR' ? ' sdq-library__locale-btn--active' : ''
    }`;
    localeEnButton.setAttribute('aria-pressed', currentLocale === 'en' ? 'true' : 'false');
    localePtButton.setAttribute('aria-pressed', currentLocale === 'pt-BR' ? 'true' : 'false');
  };

  const renderChrome = (): void => {
    title.textContent = t('library.title', currentLocale, storage);
    subtitle.textContent = t('library.subtitle', currentLocale, storage);
    sessionsButton.textContent = t('library.sessions', currentLocale, storage);
    continueBtn.textContent = t('continue.cta', currentLocale, storage);
    sandboxBlurb.textContent = t('library.sandbox.blurb', currentLocale, storage);
    sandboxBtn.textContent = t('library.action.sandbox', currentLocale, storage);
    sandboxBtn.disabled = edgeFlags.maintenance;
    renderLocaleButtons();
  };

  const renderProgress = (): void => {
    progressRow.replaceChildren();
    const tiers = countByDifficulty();

    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      const { completed, total } = countCompletedByDifficulty(
        difficulty,
        idsForDifficulty,
        storage,
      );
      const percent = completionPercentByDifficulty(difficulty, idsForDifficulty, storage);
      const item = document.createElement('span');
      item.className = 'sdq-library__progress-item';
      item.setAttribute('data-testid', `library-progress-${difficulty}`);
      item.setAttribute('data-progress-percent', String(percent));
      const difficultyLabel =
        currentLocale === 'en'
          ? difficulty === 'easy'
            ? 'Easy'
            : difficulty === 'medium'
              ? 'Medium'
              : 'Hard'
          : DIFFICULTY_LABELS[difficulty];
      item.textContent = `${DIFFICULTY_BADGES[difficulty]} ${completed}/${total} (${percent}%) ${difficultyLabel}`;
      progressRow.append(item);
      void tiers[difficulty];
    }
  };

  const renderFilters = (): void => {
    filters.replaceChildren();

    for (const option of filterOptions()) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `sdq-library__filter${
        currentFilter === option.id ? ' sdq-library__filter--active' : ''
      }`;
      button.setAttribute('data-testid', `library-filter-${option.id}`);

      if (option.id === 'all') {
        button.textContent = option.label;
      } else {
        const percent = completionPercentByDifficulty(option.id, idsForDifficulty, storage);
        const badge = document.createElement('span');
        badge.className = 'sdq-library__filter-percent';
        badge.setAttribute('data-testid', `library-filter-percent-${option.id}`);
        badge.textContent = `${percent}%`;
        button.append(document.createTextNode(`${option.label} `), badge);
      }

      button.addEventListener('click', () => {
        currentFilter = option.id;
        warningMessage = null;
        warningKind = null;
        syncWarning();
        renderFilters();
        renderGrid();
      });
      filters.append(button);
    }
  };

  const syncWarning = (): void => {
    if (warningKind === 'hard') {
      warningMessage = t('library.warn.hard', currentLocale, storage);
    } else if (warningKind === 'speedrunMedium') {
      warningMessage = t('library.warn.speedrunMedium', currentLocale, storage);
    }

    if (warningMessage) {
      warning.textContent = warningMessage;
      warning.hidden = false;
    } else {
      warning.hidden = true;
      warning.textContent = '';
    }
  };

  const handleSelect = (problem: Problem, mode: GameMode): void => {
    if (edgeFlags.maintenance) {
      syncEdgeBanner();
      return;
    }

    const completedEasy = getCompletedEasyCount();

    if (shouldWarnHardSelection(problem, completedEasy)) {
      warningKind = 'hard';
      warningMessage = t('library.warn.hard', currentLocale, storage);
      syncWarning();
    } else if (shouldWarnSpeedrunMedium(mode, problem, completedEasy)) {
      warningKind = 'speedrunMedium';
      warningMessage = t('library.warn.speedrunMedium', currentLocale, storage);
      syncWarning();
    } else {
      warningKind = null;
      warningMessage = null;
      syncWarning();
    }

    callbacks.onSelect({ problemId: problem.id, mode });
  };

  const syncEdgeBanner = (): void => {
    const parts: string[] = [];
    if (edgeFlags.maintenance) {
      parts.push(
        edgeFlags.bannerText.trim() ||
          t('library.maintenance', currentLocale, storage),
      );
    } else if (edgeFlags.bannerText.trim()) {
      parts.push(edgeFlags.bannerText.trim());
    }
    if (parts.length === 0) {
      edgeBanner.hidden = true;
      edgeBanner.textContent = '';
      edgeBanner.classList.remove('sdq-library__edge-banner--maintenance');
      return;
    }
    edgeBanner.hidden = false;
    edgeBanner.textContent = parts.join(' ');
    edgeBanner.classList.toggle(
      'sdq-library__edge-banner--maintenance',
      edgeFlags.maintenance,
    );
  };

  const renderProblemCard = (problem: Problem): HTMLElement => {
    const view = localized(problem);
    const completed = isProblemCompleted(problem.id, storage);
    const cardEl = document.createElement('article');
    cardEl.className = `sdq-library__problem${completed ? ' sdq-library__problem--completed' : ''}`;
    cardEl.setAttribute('data-testid', `problem-card-${problem.id}`);

    const cardHeader = document.createElement('div');
    cardHeader.className = 'sdq-library__problem-header';

    const titleBlock = document.createElement('div');

    const company = document.createElement('p');
    company.className = 'sdq-library__company';
    company.textContent = view.company;

    const problemTitle = document.createElement('h2');
    problemTitle.className = 'sdq-library__problem-title';
    problemTitle.setAttribute('data-testid', `problem-title-${problem.id}`);
    problemTitle.textContent = view.title;

    titleBlock.append(company, problemTitle);

    const difficultyBadge = document.createElement('span');
    difficultyBadge.className = 'sdq-library__difficulty';
    difficultyBadge.textContent = DIFFICULTY_BADGES[problem.difficulty];
    difficultyBadge.setAttribute('aria-label', DIFFICULTY_LABELS[problem.difficulty]);

    cardHeader.append(titleBlock, difficultyBadge);

    const badges = document.createElement('div');
    badges.className = 'sdq-library__badges';

    if (problem.isRecommended) {
      const recommended = document.createElement('span');
      recommended.className = 'sdq-library__badge sdq-library__badge--recommended';
      recommended.textContent = t('library.badge.recommended', currentLocale, storage);
      badges.append(recommended);
    }

    if (problem.isTutorial) {
      const tutorial = document.createElement('span');
      tutorial.className = 'sdq-library__badge sdq-library__badge--tutorial';
      tutorial.textContent = t('library.badge.tutorial', currentLocale, storage);
      badges.append(tutorial);
    }

    if (edgeFlags.newProblemIds.includes(problem.id)) {
      const neu = document.createElement('span');
      neu.className = 'sdq-library__badge sdq-library__badge--new';
      neu.setAttribute('data-testid', `library-new-badge-${problem.id}`);
      neu.textContent = t('library.badge.new', currentLocale, storage);
      badges.append(neu);
    }

    if (completed) {
      const done = document.createElement('span');
      done.className = 'sdq-library__badge sdq-library__badge--completed';
      done.textContent = t('library.badge.completed', currentLocale, storage);
      badges.append(done);
    }

    const tags = document.createElement('p');
    tags.className = 'sdq-library__tags';
    tags.textContent = problem.tags.slice(0, 3).join(' · ');

    const meta = document.createElement('p');
    meta.className = 'sdq-library__meta';
    meta.textContent = `~${problem.estimatedMinutes.study} min`;

    const actions = document.createElement('div');
    actions.className = 'sdq-library__actions';

    const studyButton = document.createElement('button');
    studyButton.type = 'button';
    studyButton.className = 'sdq-library__action sdq-library__action--primary';
    studyButton.setAttribute('data-testid', `problem-study-${problem.id}`);
    studyButton.textContent = t('library.action.study', currentLocale, storage);
    studyButton.disabled = edgeFlags.maintenance;
    studyButton.addEventListener('click', () => handleSelect(problem, 'study'));

    const speedrunButton = document.createElement('button');
    speedrunButton.type = 'button';
    speedrunButton.className = 'sdq-library__action';
    speedrunButton.setAttribute('data-testid', `problem-speedrun-${problem.id}`);
    speedrunButton.textContent = t('library.action.speedrun', currentLocale, storage);
    speedrunButton.disabled = edgeFlags.maintenance;
    speedrunButton.addEventListener('click', () => handleSelect(problem, 'speedrun'));

    const rankingButton = document.createElement('button');
    rankingButton.type = 'button';
    rankingButton.className = 'sdq-library__action';
    rankingButton.setAttribute('data-testid', `problem-ranking-${problem.id}`);
    rankingButton.textContent = t('library.action.ranking', currentLocale, storage);
    rankingButton.addEventListener('click', () => {
      void leaderboardPanel.show(problem.id, view.title);
    });

    actions.append(studyButton, speedrunButton, rankingButton);
    cardEl.append(cardHeader, badges, tags, meta, actions);

    return cardEl;
  };

  const renderGrid = (): void => {
    grid.replaceChildren();
    const problems =
      currentFilter === 'all'
        ? filterProblems({ difficulty: 'all' })
        : filterProblems({ difficulty: currentFilter });

    for (const problem of problems) {
      grid.append(renderProblemCard(problem));
    }
  };

  const refreshLocale = (): void => {
    currentLocale = getLocale(storage);
    renderChrome();
    syncEdgeBanner();
    renderFilters();
    renderProgress();
    syncWarning();
    renderGrid();
  };

  localeEnButton.addEventListener('click', () => {
    setLocale('en', storage);
    refreshLocale();
  });

  localePtButton.addEventListener('click', () => {
    setLocale('pt-BR', storage);
    refreshLocale();
  });

  refreshLocale();
  void loadProgress(storage);

  const applyEdgeFlags = (flags: EdgeFlags): void => {
    edgeFlags = { ...flags };
    syncEdgeBanner();
    renderGrid();
  };

  if (!callbacks.edgeFlags) {
    const loader = callbacks.loadEdgeFlagsFn ?? (() => loadEdgeFlags());
    void loader()
      .then(applyEdgeFlags)
      .catch(() => {
        applyEdgeFlags({ ...DEFAULT_EDGE_FLAGS });
      });
  }

  const resolveContinueSession = async (): Promise<void> => {
    continueSession = null;
    continueBtn.hidden = true;

    const nickname =
      callbacks.getNickname?.() ?? loadNickname(storage);
    if (!nickname || nickname.trim() === '') {
      return;
    }

    const listFn = callbacks.listSessionsFn ?? listSessions;
    try {
      const sessions = await listFn(
        { nickname, status: 'in_progress' },
        { storage },
      );
      const latest = [...sessions].sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      )[0];
      if (!latest || !callbacks.onContinueSession) {
        return;
      }
      continueSession = latest;
      continueBtn.hidden = false;
      continueBtn.textContent = t('continue.cta', currentLocale, storage);
    } catch {
      continueSession = null;
      continueBtn.hidden = true;
    }
  };

  void resolveContinueSession();

  return {
    root: panel,
    setFilter(filter) {
      currentFilter = filter;
      renderFilters();
      renderGrid();
    },
    getFilter() {
      return currentFilter;
    },
  };
}
