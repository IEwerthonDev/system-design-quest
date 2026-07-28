import {
  countByDifficulty,
  filterProblems,
  listProblemsByDifficulty,
  type Difficulty,
  type Problem,
} from '@sdq/shared';
import type { LeaderboardEntry } from '@sdq/shared';
import type { GameMode } from '../test-hook';
import { DIFFICULTY_LABELS } from './briefing-panel';
import {
  countCompletedByDifficulty,
  isProblemCompleted,
  loadProgress,
} from '../storage/progress';
import { mountLeaderboardPanel } from './leaderboard-panel';

export type LibraryFilter = Difficulty | 'all';

export interface LibrarySelection {
  problemId: string;
  mode: GameMode;
}

export interface ProblemLibraryCallbacks {
  onSelect: (selection: LibrarySelection) => void;
  onOpenSessions?: () => void;
  fetchLeaderboard?: (
    problemId: string,
  ) => Promise<{ problemId: string; entries: LeaderboardEntry[] }>;
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
  title.textContent = 'Problemas';

  headerText.append(eyebrow, title);

  const sessionsButton = document.createElement('button');
  sessionsButton.type = 'button';
  sessionsButton.className = 'sdq-library__sessions';
  sessionsButton.setAttribute('data-testid', 'library-open-sessions');
  sessionsButton.textContent = 'Minhas sessões';
  sessionsButton.addEventListener('click', () => {
    callbacks.onOpenSessions?.();
  });

  header.append(headerText, sessionsButton);

  const subtitle = document.createElement('p');
  subtitle.className = 'sdq-library__subtitle';
  subtitle.textContent =
    'Desenhe o system design de features reais de empresas conhecidas — Bit.ly, Uber, Netflix, WhatsApp e mais.';

  const warning = document.createElement('div');
  warning.className = 'sdq-library__warning';
  warning.setAttribute('data-testid', 'library-warning');
  warning.hidden = true;

  const filters = document.createElement('div');
  filters.className = 'sdq-library__filters';

  const progressRow = document.createElement('div');
  progressRow.className = 'sdq-library__progress';
  progressRow.setAttribute('data-testid', 'library-progress');

  const grid = document.createElement('div');
  grid.className = 'sdq-library__grid';
  grid.setAttribute('data-testid', 'library-grid');

  inner.append(header, subtitle, warning, filters, progressRow, grid);
  scroll.append(inner);
  panel.append(scroll);
  container.append(panel);

  const leaderboardPanel = mountLeaderboardPanel(container, {
    fetchLeaderboard: callbacks.fetchLeaderboard,
  });

  const filterOptions: Array<{ id: LibraryFilter; label: string }> = [
    { id: 'all', label: 'Todos' },
    { id: 'easy', label: '🟢 Fácil' },
    { id: 'medium', label: '🟡 Médio' },
    { id: 'hard', label: '🔴 Difícil' },
  ];

  const idsForDifficulty = (difficulty: Difficulty) =>
    listProblemsByDifficulty(difficulty).map((problem) => problem.id);

  const getCompletedEasyCount = (): number =>
    countCompletedByDifficulty('easy', idsForDifficulty, storage).completed;

  const renderProgress = (): void => {
    progressRow.replaceChildren();
    const tiers = countByDifficulty();

    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      const { completed, total } = countCompletedByDifficulty(
        difficulty,
        idsForDifficulty,
        storage,
      );
      const item = document.createElement('span');
      item.className = 'sdq-library__progress-item';
      item.setAttribute('data-testid', `library-progress-${difficulty}`);
      item.textContent = `${DIFFICULTY_BADGES[difficulty]} ${completed}/${total} ${DIFFICULTY_LABELS[difficulty]}`;
      progressRow.append(item);
      void tiers[difficulty];
    }
  };

  const renderFilters = (): void => {
    filters.replaceChildren();

    for (const option of filterOptions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `sdq-library__filter${
        currentFilter === option.id ? ' sdq-library__filter--active' : ''
      }`;
      button.setAttribute('data-testid', `library-filter-${option.id}`);
      button.textContent = option.label;
      button.addEventListener('click', () => {
        currentFilter = option.id;
        warningMessage = null;
        syncWarning();
        renderFilters();
        renderGrid();
      });
      filters.append(button);
    }
  };

  const syncWarning = (): void => {
    if (warningMessage) {
      warning.textContent = warningMessage;
      warning.hidden = false;
    } else {
      warning.hidden = true;
      warning.textContent = '';
    }
  };

  const handleSelect = (problem: Problem, mode: GameMode): void => {
    const completedEasy = getCompletedEasyCount();

    if (shouldWarnHardSelection(problem, completedEasy)) {
      warningMessage =
        'Este é um problema difícil — recomendamos completar pelo menos um 🟢 Fácil antes. Você pode continuar mesmo assim.';
      syncWarning();
    } else if (shouldWarnSpeedrunMedium(mode, problem, completedEasy)) {
      warningMessage =
        'Speedrun em problemas Médios funciona melhor após concluir 2 Easy em Study. Timer completo chega na Fase 4.';
      syncWarning();
    } else {
      warningMessage = null;
      syncWarning();
    }

    callbacks.onSelect({ problemId: problem.id, mode });
  };

  const renderProblemCard = (problem: Problem): HTMLElement => {
    const completed = isProblemCompleted(problem.id, storage);
    const cardEl = document.createElement('article');
    cardEl.className = `sdq-library__problem${completed ? ' sdq-library__problem--completed' : ''}`;
    cardEl.setAttribute('data-testid', `problem-card-${problem.id}`);

    const header = document.createElement('div');
    header.className = 'sdq-library__problem-header';

    const titleBlock = document.createElement('div');

    const company = document.createElement('p');
    company.className = 'sdq-library__company';
    company.textContent = problem.company;

    const problemTitle = document.createElement('h2');
    problemTitle.className = 'sdq-library__problem-title';
    problemTitle.textContent = problem.title;

    titleBlock.append(company, problemTitle);

    const difficultyBadge = document.createElement('span');
    difficultyBadge.className = 'sdq-library__difficulty';
    difficultyBadge.textContent = DIFFICULTY_BADGES[problem.difficulty];
    difficultyBadge.setAttribute('aria-label', DIFFICULTY_LABELS[problem.difficulty]);

    header.append(titleBlock, difficultyBadge);

    const badges = document.createElement('div');
    badges.className = 'sdq-library__badges';

    if (problem.isRecommended) {
      const recommended = document.createElement('span');
      recommended.className = 'sdq-library__badge sdq-library__badge--recommended';
      recommended.textContent = 'Recomendado';
      badges.append(recommended);
    }

    if (problem.isTutorial) {
      const tutorial = document.createElement('span');
      tutorial.className = 'sdq-library__badge sdq-library__badge--tutorial';
      tutorial.textContent = 'Tutorial';
      badges.append(tutorial);
    }

    if (completed) {
      const done = document.createElement('span');
      done.className = 'sdq-library__badge sdq-library__badge--completed';
      done.textContent = 'Concluído';
      badges.append(done);
    }

    const tags = document.createElement('p');
    tags.className = 'sdq-library__tags';
    tags.textContent = problem.tags.slice(0, 3).join(' · ');

    const meta = document.createElement('p');
    meta.className = 'sdq-library__meta';
    meta.textContent = `~${problem.estimatedMinutes.study} min Study`;

    const actions = document.createElement('div');
    actions.className = 'sdq-library__actions';

    const studyButton = document.createElement('button');
    studyButton.type = 'button';
    studyButton.className = 'sdq-library__action sdq-library__action--primary';
    studyButton.setAttribute('data-testid', `problem-study-${problem.id}`);
    studyButton.textContent = 'Study';
    studyButton.addEventListener('click', () => handleSelect(problem, 'study'));

    const speedrunButton = document.createElement('button');
    speedrunButton.type = 'button';
    speedrunButton.className = 'sdq-library__action';
    speedrunButton.setAttribute('data-testid', `problem-speedrun-${problem.id}`);
    speedrunButton.textContent = 'Speedrun';
    speedrunButton.addEventListener('click', () => handleSelect(problem, 'speedrun'));

    const rankingButton = document.createElement('button');
    rankingButton.type = 'button';
    rankingButton.className = 'sdq-library__action';
    rankingButton.setAttribute('data-testid', `problem-ranking-${problem.id}`);
    rankingButton.textContent = 'Ranking';
    rankingButton.addEventListener('click', () => {
      void leaderboardPanel.show(problem.id, problem.title);
    });

    actions.append(studyButton, speedrunButton, rankingButton);
    cardEl.append(header, badges, tags, meta, actions);

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

  renderFilters();
  renderProgress();
  renderGrid();
  void loadProgress(storage);

  return {
    root: panel,
    setFilter(filter: LibraryFilter) {
      currentFilter = filter;
      renderFilters();
      renderGrid();
    },
    getFilter() {
      return currentFilter;
    },
  };
}
