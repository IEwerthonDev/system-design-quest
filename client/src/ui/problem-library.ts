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
      align-items: flex-start;
      justify-content: center;
      padding: 24px;
      background: rgba(15, 20, 25, 0.96);
      z-index: 20;
      overflow-y: auto;
      font-family: system-ui, sans-serif;
      color: #e2e8f0;
    }
    .sdq-library__card {
      width: min(960px, 100%);
      background: rgba(30, 41, 59, 0.95);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 12px;
      padding: 24px 26px 28px;
    }
    .sdq-library__header {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 6px;
    }
    .sdq-library__title {
      margin: 0 0 6px;
      font-size: 24px;
      font-weight: 700;
      color: #f8fafc;
    }
    .sdq-library__sessions {
      border: 1px solid rgba(148, 163, 184, 0.35);
      background: rgba(56, 189, 248, 0.12);
      color: #7dd3fc;
      border-radius: 8px;
      padding: 8px 12px;
      font: 600 13px system-ui, sans-serif;
      cursor: pointer;
      white-space: nowrap;
    }
    .sdq-library__subtitle {
      margin: 0 0 18px;
      font-size: 14px;
      color: #94a3b8;
      line-height: 1.5;
    }
    .sdq-library__filters {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }
    .sdq-library__filter {
      border: 1px solid rgba(148, 163, 184, 0.35);
      background: rgba(15, 23, 42, 0.65);
      color: #e2e8f0;
      border-radius: 999px;
      padding: 6px 14px;
      font: 600 13px system-ui, sans-serif;
      cursor: pointer;
    }
    .sdq-library__filter--active {
      background: rgba(56, 189, 248, 0.2);
      border-color: rgba(56, 189, 248, 0.55);
      color: #7dd3fc;
    }
    .sdq-library__progress {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 18px;
      font-size: 13px;
      color: #cbd5e1;
    }
    .sdq-library__progress-item {
      padding: 6px 10px;
      border-radius: 8px;
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(148, 163, 184, 0.15);
    }
    .sdq-library__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
    }
    .sdq-library__problem {
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 10px;
      padding: 14px 14px 12px;
      background: rgba(15, 23, 42, 0.65);
    }
    .sdq-library__problem--completed {
      border-color: rgba(34, 197, 94, 0.35);
    }
    .sdq-library__problem-header {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 8px;
    }
    .sdq-library__problem-title {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
      color: #f8fafc;
      flex: 1;
    }
    .sdq-library__badges {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 8px;
    }
    .sdq-library__badge {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.03em;
    }
    .sdq-library__badge--recommended {
      background: rgba(56, 189, 248, 0.18);
      color: #7dd3fc;
      border: 1px solid rgba(56, 189, 248, 0.35);
    }
    .sdq-library__badge--tutorial {
      background: rgba(168, 85, 247, 0.18);
      color: #d8b4fe;
      border: 1px solid rgba(168, 85, 247, 0.35);
    }
    .sdq-library__badge--completed {
      background: rgba(34, 197, 94, 0.18);
      color: #86efac;
      border: 1px solid rgba(34, 197, 94, 0.35);
    }
    .sdq-library__tags {
      margin: 0 0 8px;
      font-size: 12px;
      color: #94a3b8;
    }
    .sdq-library__meta {
      margin: 0 0 12px;
      font-size: 12px;
      color: #64748b;
    }
    .sdq-library__actions {
      display: flex;
      gap: 8px;
    }
    .sdq-library__action {
      flex: 1;
      border: 1px solid rgba(148, 163, 184, 0.35);
      background: rgba(30, 41, 59, 0.9);
      color: #e2e8f0;
      border-radius: 8px;
      padding: 8px 10px;
      font: 600 12px system-ui, sans-serif;
      cursor: pointer;
    }
    .sdq-library__action--primary {
      background: rgba(56, 189, 248, 0.18);
      border-color: rgba(56, 189, 248, 0.45);
      color: #7dd3fc;
    }
    .sdq-library__action:hover {
      background: rgba(51, 65, 85, 0.95);
    }
    .sdq-library__warning {
      margin: 0 0 16px;
      padding: 12px 14px;
      border-radius: 8px;
      background: rgba(234, 179, 8, 0.12);
      border: 1px solid rgba(234, 179, 8, 0.35);
      color: #fde047;
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

  const card = document.createElement('div');
  card.className = 'sdq-library__card';

  const header = document.createElement('div');
  header.className = 'sdq-library__header';

  const title = document.createElement('h1');
  title.className = 'sdq-library__title';
  title.textContent = 'Biblioteca de Problemas';

  const sessionsButton = document.createElement('button');
  sessionsButton.type = 'button';
  sessionsButton.className = 'sdq-library__sessions';
  sessionsButton.setAttribute('data-testid', 'library-open-sessions');
  sessionsButton.textContent = 'Minhas sessões';
  sessionsButton.addEventListener('click', () => {
    callbacks.onOpenSessions?.();
  });

  header.append(title, sessionsButton);

  const subtitle = document.createElement('p');
  subtitle.className = 'sdq-library__subtitle';
  subtitle.textContent =
    'Escolha um sistema real para praticar. Comece pelos 🟢 Fáceis se você é iniciante.';

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

  card.append(header, subtitle, warning, filters, progressRow, grid);
  panel.append(card);
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

    const problemTitle = document.createElement('h2');
    problemTitle.className = 'sdq-library__problem-title';
    problemTitle.textContent = problem.title;

    const difficultyBadge = document.createElement('span');
    difficultyBadge.textContent = DIFFICULTY_BADGES[problem.difficulty];
    difficultyBadge.setAttribute('aria-label', DIFFICULTY_LABELS[problem.difficulty]);

    header.append(problemTitle, difficultyBadge);

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
