import { getProblem, type DesignSessionRecord, type DesignSessionStatus } from '@sdq/shared';
import { getOrCreateNickname } from '../storage/nickname';
import {
  listSessions,
  type ListSessionsQuery,
  type SessionsApiOptions,
} from '../sessions/sessions-api';

export const SESSION_STATUS_LABELS: Record<DesignSessionStatus, string> = {
  approved: 'Aprovadas',
  rejected: 'Reprovadas',
  partial: 'Parcial',
  in_progress: 'Em progresso',
};

const STATUS_TABS: DesignSessionStatus[] = [
  'approved',
  'rejected',
  'partial',
  'in_progress',
];

export interface SessionsDashboardOptions {
  storage?: Storage;
  listSessionsFn?: (
    query: ListSessionsQuery,
    options?: SessionsApiOptions,
  ) => Promise<DesignSessionRecord[]>;
  getNickname?: () => string;
  onBack?: () => void;
  onOpenSession?: (session: DesignSessionRecord) => void | Promise<void>;
}

export interface SessionsDashboard {
  root: HTMLElement;
  ready: Promise<void>;
  setFilter(status: DesignSessionStatus): void;
  getFilter(): DesignSessionStatus;
  destroy(): void;
}

function injectStyles(): void {
  if (document.getElementById('sdq-sessions-dashboard-styles')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'sdq-sessions-dashboard-styles';
  style.textContent = `
    .sdq-sessions {
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
    .sdq-sessions__card {
      width: min(840px, 100%);
      background: rgba(30, 41, 59, 0.95);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 12px;
      padding: 24px 26px 28px;
    }
    .sdq-sessions__header {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
    }
    .sdq-sessions__title {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      color: #f8fafc;
    }
    .sdq-sessions__nickname {
      margin: 4px 0 0;
      font-size: 13px;
      color: #94a3b8;
    }
    .sdq-sessions__back {
      border: 1px solid rgba(148, 163, 184, 0.35);
      background: rgba(51, 65, 85, 0.9);
      color: #e2e8f0;
      border-radius: 8px;
      padding: 6px 12px;
      cursor: pointer;
      font: 600 13px system-ui, sans-serif;
    }
    .sdq-sessions__tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 16px 0;
    }
    .sdq-sessions__tab {
      border: 1px solid rgba(148, 163, 184, 0.35);
      background: rgba(15, 23, 42, 0.65);
      color: #e2e8f0;
      border-radius: 999px;
      padding: 6px 14px;
      font: 600 13px system-ui, sans-serif;
      cursor: pointer;
    }
    .sdq-sessions__tab--active {
      background: rgba(56, 189, 248, 0.2);
      border-color: rgba(56, 189, 248, 0.55);
    }
    .sdq-sessions__list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .sdq-sessions__item {
      border: 1px solid rgba(148, 163, 184, 0.2);
      background: rgba(15, 23, 42, 0.55);
      border-radius: 10px;
      padding: 12px 14px;
      cursor: pointer;
      text-align: left;
      color: inherit;
      font: inherit;
      width: 100%;
    }
    .sdq-sessions__item:hover {
      border-color: rgba(56, 189, 248, 0.45);
    }
    .sdq-sessions__item-title {
      margin: 0 0 4px;
      font-size: 15px;
      font-weight: 600;
      color: #f8fafc;
    }
    .sdq-sessions__item-meta {
      margin: 0;
      font-size: 12px;
      color: #94a3b8;
    }
    .sdq-sessions__empty {
      margin: 8px 0 0;
      color: #94a3b8;
      font-size: 14px;
    }
    .sdq-sessions__error {
      margin: 8px 0 0;
      color: #fca5a5;
      font-size: 14px;
    }
  `;
  document.head.append(style);
}

function problemTitle(problemId: string): string {
  return getProblem(problemId)?.title ?? problemId;
}

function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toISOString().slice(0, 10);
}

function statusBadgeLabel(status: DesignSessionStatus): string {
  switch (status) {
    case 'approved':
      return 'Aprovada';
    case 'rejected':
      return 'Reprovada';
    case 'partial':
      return 'Parcial';
    case 'in_progress':
      return 'Em progresso';
  }
}

export function mountSessionsDashboard(
  container: HTMLElement,
  options: SessionsDashboardOptions = {},
): SessionsDashboard {
  injectStyles();

  const listSessionsFn = options.listSessionsFn ?? listSessions;
  const getNickname = options.getNickname ?? (() => getOrCreateNickname(options.storage));
  const nickname = getNickname();

  let currentFilter: DesignSessionStatus = 'approved';
  let sessions: DesignSessionRecord[] = [];

  const root = document.createElement('div');
  root.className = 'sdq-sessions';
  root.setAttribute('data-testid', 'sessions-dashboard');

  const card = document.createElement('div');
  card.className = 'sdq-sessions__card';

  const header = document.createElement('div');
  header.className = 'sdq-sessions__header';

  const heading = document.createElement('div');
  const title = document.createElement('h1');
  title.className = 'sdq-sessions__title';
  title.textContent = 'Minhas sessões';

  const nickEl = document.createElement('p');
  nickEl.className = 'sdq-sessions__nickname';
  nickEl.setAttribute('data-testid', 'sessions-nickname');
  nickEl.textContent = `Jogador: ${nickname}`;

  heading.append(title, nickEl);

  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'sdq-sessions__back';
  backButton.setAttribute('data-testid', 'sessions-back');
  backButton.textContent = 'Voltar';
  backButton.addEventListener('click', () => {
    options.onBack?.();
  });

  header.append(heading, backButton);

  const tabs = document.createElement('div');
  tabs.className = 'sdq-sessions__tabs';
  tabs.setAttribute('data-testid', 'sessions-tabs');

  const list = document.createElement('div');
  list.className = 'sdq-sessions__list';
  list.setAttribute('data-testid', 'sessions-list');

  const empty = document.createElement('p');
  empty.className = 'sdq-sessions__empty';
  empty.setAttribute('data-testid', 'sessions-empty');
  empty.hidden = true;

  const errorEl = document.createElement('p');
  errorEl.className = 'sdq-sessions__error';
  errorEl.setAttribute('data-testid', 'sessions-error');
  errorEl.hidden = true;

  card.append(header, tabs, list, empty, errorEl);
  root.append(card);
  container.append(root);

  const renderTabs = (): void => {
    tabs.replaceChildren();
    for (const status of STATUS_TABS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `sdq-sessions__tab${
        currentFilter === status ? ' sdq-sessions__tab--active' : ''
      }`;
      button.setAttribute('data-testid', `sessions-tab-${status}`);
      button.textContent = SESSION_STATUS_LABELS[status];
      button.addEventListener('click', () => {
        currentFilter = status;
        renderTabs();
        renderList();
      });
      tabs.append(button);
    }
  };

  const renderList = (): void => {
    list.replaceChildren();
    const filtered = sessions.filter((session) => session.status === currentFilter);

    if (filtered.length === 0) {
      empty.hidden = false;
      empty.textContent = 'Nenhuma sessão neste status.';
      return;
    }

    empty.hidden = true;
    empty.textContent = '';

    for (const session of filtered) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'sdq-sessions__item';
      item.setAttribute('data-testid', `session-card-${session.id}`);

      const itemTitle = document.createElement('h2');
      itemTitle.className = 'sdq-sessions__item-title';
      itemTitle.textContent = problemTitle(session.problemId);

      const meta = document.createElement('p');
      meta.className = 'sdq-sessions__item-meta';
      const parts = [
        statusBadgeLabel(session.status),
        formatUpdatedAt(session.updatedAt),
      ];
      if (session.score !== undefined) {
        parts.push(`Score ${session.score}`);
      }
      if (session.verdict) {
        parts.push(session.verdict);
      }
      meta.textContent = parts.join(' · ');

      item.append(itemTitle, meta);
      item.addEventListener('click', () => {
        void options.onOpenSession?.(session);
      });
      list.append(item);
    }
  };

  const ready = (async () => {
    try {
      sessions = await listSessionsFn({ nickname }, {});
      errorEl.hidden = true;
      errorEl.textContent = '';
    } catch (err) {
      sessions = [];
      errorEl.hidden = false;
      errorEl.textContent =
        err instanceof Error ? err.message : 'Não foi possível carregar as sessões.';
    }
    renderTabs();
    renderList();
  })();

  renderTabs();
  renderList();

  return {
    root,
    ready,
    setFilter(status) {
      currentFilter = status;
      renderTabs();
      renderList();
    },
    getFilter() {
      return currentFilter;
    },
    destroy() {
      root.remove();
    },
  };
}
