import type { ResilienceResult } from '@sdq/shared';
import { getLocale, LOCALE_CHANGE_EVENT } from '../i18n/locale';
import { t } from '../i18n/t';

export interface ResilienceReportView {
  root: HTMLElement;
  sync(rows: ResilienceResult[]): void;
  destroy(): void;
}

export interface MountResilienceReportOptions {
  onClear(): void;
}

function injectStyles(): void {
  if (document.getElementById('sdq-resilience-report-styles')) return;
  const style = document.createElement('style');
  style.id = 'sdq-resilience-report-styles';
  style.textContent = `
    .sdq-resilience-report {
      margin-top: 10px;
    }
    .sdq-resilience-report__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }
    .sdq-resilience-report__title {
      margin: 0;
      font: 700 10px var(--sdq-font-mono);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--sdq-text-subtle);
    }
    .sdq-resilience-report__clear {
      min-height: 44px;
      min-width: 44px;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--sdq-border);
      background: var(--sdq-bg);
      color: var(--sdq-text);
      font: 600 11px var(--sdq-font-mono);
      cursor: pointer;
      touch-action: manipulation;
    }
    .sdq-resilience-report__table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    .sdq-resilience-report__table th,
    .sdq-resilience-report__table td {
      text-align: left;
      padding: 6px 4px;
      border-bottom: 1px solid var(--sdq-border);
    }
    .sdq-resilience-report__verdict[data-verdict="SURVIVED"] { color: #4ade80; font-weight: 700; }
    .sdq-resilience-report__verdict[data-verdict="FAILED"] { color: #f87171; font-weight: 700; }
    .sdq-resilience-report__cards { display: none; }
    .sdq-resilience-report__card {
      border: 1px solid var(--sdq-border);
      border-radius: 8px;
      padding: 10px;
      margin: 0 0 8px;
      background: var(--sdq-bg);
    }
    .sdq-resilience-report__empty {
      color: var(--sdq-text-subtle);
      margin: 0;
    }
    @media (max-width: 768px) {
      .sdq-resilience-report__table { display: none; }
      .sdq-resilience-report__cards { display: block; }
    }
  `;
  document.head.append(style);
}

export function mountResilienceReport(
  parent: HTMLElement,
  options: MountResilienceReportOptions,
): ResilienceReportView {
  injectStyles();
  const root = document.createElement('section');
  root.className = 'sdq-resilience-report';
  root.setAttribute('data-testid', 'resilience-report');

  const header = document.createElement('div');
  header.className = 'sdq-resilience-report__header';
  const title = document.createElement('h3');
  title.className = 'sdq-resilience-report__title';
  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'sdq-resilience-report__clear';
  clearBtn.setAttribute('data-testid', 'resilience-report-clear');
  clearBtn.addEventListener('click', () => options.onClear());
  header.append(title, clearBtn);

  const table = document.createElement('table');
  table.className = 'sdq-resilience-report__table';
  table.setAttribute('data-testid', 'resilience-report-table');
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const key of ['chaos.colEvent', 'chaos.colMetrics', 'chaos.colStatus'] as const) {
    const th = document.createElement('th');
    th.dataset.labelKey = key;
    headRow.append(th);
  }
  thead.append(headRow);
  const tbody = document.createElement('tbody');
  table.append(thead, tbody);

  const cards = document.createElement('div');
  cards.className = 'sdq-resilience-report__cards';
  cards.setAttribute('data-testid', 'resilience-report-cards');

  const empty = document.createElement('p');
  empty.className = 'sdq-resilience-report__empty';
  empty.setAttribute('data-testid', 'resilience-report-empty');

  root.append(header, empty, table, cards);
  parent.append(root);

  let rows: ResilienceResult[] = [];

  const refresh = (): void => {
    const locale = getLocale();
    title.textContent = t('chaos.reportTitle');
    clearBtn.textContent = t('chaos.clear');
    empty.textContent = t('chaos.reportEmpty');
    for (const th of headRow.querySelectorAll('th')) {
      const key = (th as HTMLElement).dataset.labelKey as 'chaos.colEvent' | 'chaos.colMetrics' | 'chaos.colStatus';
      th.textContent = t(key);
    }

    tbody.replaceChildren();
    cards.replaceChildren();
    empty.hidden = rows.length > 0;
    table.hidden = rows.length === 0;
    cards.hidden = rows.length === 0;

    for (const row of rows) {
      const label = locale === 'pt-BR' ? row.eventLabelPt : row.eventLabelEn;
      const metrics = `min avail ${row.minAvailability.toFixed(1)}% · p99 ${row.p99Ms}ms`;

      const tr = document.createElement('tr');
      tr.setAttribute('data-testid', `resilience-row-${row.eventId}`);
      const tdEvent = document.createElement('td');
      tdEvent.textContent = label;
      const tdMetrics = document.createElement('td');
      tdMetrics.textContent = metrics;
      const tdStatus = document.createElement('td');
      tdStatus.className = 'sdq-resilience-report__verdict';
      tdStatus.dataset.verdict = row.verdict;
      tdStatus.textContent = row.verdict;
      tr.append(tdEvent, tdMetrics, tdStatus);
      tbody.append(tr);

      const card = document.createElement('article');
      card.className = 'sdq-resilience-report__card';
      card.setAttribute('data-testid', `resilience-card-${row.eventId}`);
      card.innerHTML = `<strong>${label}</strong><div>${metrics}</div><div class="sdq-resilience-report__verdict" data-verdict="${row.verdict}">${row.verdict}</div>`;
      cards.append(card);
    }
  };

  const onLocale = (): void => refresh();
  window.addEventListener(LOCALE_CHANGE_EVENT, onLocale);
  refresh();

  return {
    root,
    sync(next) {
      rows = [...next];
      refresh();
    },
    destroy() {
      window.removeEventListener(LOCALE_CHANGE_EVENT, onLocale);
      root.remove();
    },
  };
}
