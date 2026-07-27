import type { LeaderboardEntry } from '@sdq/shared';
import { formatElapsedMs } from './timer-panel';

export interface LeaderboardPanelOptions {
  fetchLeaderboard?: (
    problemId: string,
  ) => Promise<{ problemId: string; entries: LeaderboardEntry[] }>;
}

export interface LeaderboardPanel {
  root: HTMLElement;
  show(problemId: string, problemTitle: string): Promise<void>;
  hide(): void;
}

function injectLeaderboardStyles(root: HTMLElement): void {
  if (document.getElementById('sdq-leaderboard-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'sdq-leaderboard-styles';
  style.textContent = `
    .sdq-leaderboard {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(15, 20, 25, 0.92);
      z-index: 30;
    }
    /* Author display:flex otherwise wins over the UA [hidden] rule. */
    .sdq-leaderboard[hidden] {
      display: none !important;
    }
    .sdq-leaderboard__card {
      width: min(640px, 100%);
      background: rgba(30, 41, 59, 0.96);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 12px;
      padding: 20px 22px 24px;
      color: #e2e8f0;
      font-family: system-ui, sans-serif;
    }
    .sdq-leaderboard__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .sdq-leaderboard__title {
      margin: 0;
      font-size: 20px;
    }
    .sdq-leaderboard__close {
      border: 1px solid rgba(148, 163, 184, 0.35);
      background: rgba(51, 65, 85, 0.9);
      color: #e2e8f0;
      border-radius: 8px;
      padding: 6px 12px;
      cursor: pointer;
      font: 600 13px system-ui, sans-serif;
    }
    .sdq-leaderboard__table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    .sdq-leaderboard__table th,
    .sdq-leaderboard__table td {
      padding: 8px 10px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.15);
      text-align: left;
    }
    .sdq-leaderboard__empty {
      color: #94a3b8;
      font-size: 14px;
      margin: 0;
    }
  `;
  root.append(style);
}

export function mountLeaderboardPanel(
  container: HTMLElement,
  options: LeaderboardPanelOptions = {},
): LeaderboardPanel {
  injectLeaderboardStyles(document.head);

  const overlay = document.createElement('div');
  overlay.className = 'sdq-leaderboard';
  overlay.setAttribute('data-testid', 'leaderboard-panel');
  overlay.hidden = true;

  const card = document.createElement('div');
  card.className = 'sdq-leaderboard__card';

  const header = document.createElement('div');
  header.className = 'sdq-leaderboard__header';

  const title = document.createElement('h2');
  title.className = 'sdq-leaderboard__title';

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'sdq-leaderboard__close';
  closeButton.setAttribute('data-testid', 'leaderboard-close');
  closeButton.textContent = 'Fechar';

  header.append(title, closeButton);

  const body = document.createElement('div');
  body.setAttribute('data-testid', 'leaderboard-body');

  card.append(header, body);
  overlay.append(card);
  container.append(overlay);

  const hide = (): void => {
    overlay.hidden = true;
    body.replaceChildren();
  };

  closeButton.addEventListener('click', hide);

  const show = async (problemId: string, problemTitle: string): Promise<void> => {
    title.textContent = `Ranking — ${problemTitle}`;
    overlay.hidden = false;
    body.textContent = 'Carregando...';

    if (!options.fetchLeaderboard) {
      body.innerHTML = '<p class="sdq-leaderboard__empty">Ranking indisponível.</p>';
      return;
    }

    try {
      const response = await options.fetchLeaderboard(problemId);
      body.replaceChildren();

      if (response.entries.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'sdq-leaderboard__empty';
        empty.textContent = 'Nenhum tempo registrado ainda. Seja o primeiro!';
        body.append(empty);
        return;
      }

      const table = document.createElement('table');
      table.className = 'sdq-leaderboard__table';
      table.innerHTML = `
        <thead>
          <tr>
            <th>#</th>
            <th>Jogador</th>
            <th>Tempo</th>
            <th>Score</th>
          </tr>
        </thead>
      `;

      const tbody = document.createElement('tbody');
      response.entries.forEach((entry, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${index + 1}</td>
          <td>${entry.playerNickname}</td>
          <td>${formatElapsedMs(entry.elapsedMs)}</td>
          <td>${entry.score}</td>
        `;
        tbody.append(row);
      });

      table.append(tbody);
      body.append(table);
    } catch {
      body.innerHTML =
        '<p class="sdq-leaderboard__empty">Não foi possível carregar o ranking.</p>';
    }
  };

  return { root: overlay, show, hide };
}
