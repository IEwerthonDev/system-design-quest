import type { Difficulty, Problem, ProblemMetrics } from '@sdq/shared';
import { getMetricExplanation } from './glossary';

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
};

export interface BriefingPanelCallbacks {
  onStart: () => void;
}

export interface BriefingPanel {
  root: HTMLElement;
  render(problem: Problem): void;
}

export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000_000) {
    return `${value / 1_000_000_000}B`;
  }
  if (value >= 1_000_000) {
    return `${value / 1_000_000}M`;
  }
  if (value >= 1_000) {
    return `${value / 1_000}k`;
  }
  return String(value);
}

export function buildMetricEntries(metrics: ProblemMetrics): Array<{ label: string; value: string }> {
  const entries: Array<{ label: string; value: string }> = [];

  if (metrics.dau !== undefined) {
    entries.push({ label: 'DAU', value: formatCompactNumber(metrics.dau) });
  }
  if (metrics.readRps !== undefined) {
    entries.push({ label: 'Read RPS (pico)', value: formatCompactNumber(metrics.readRps) });
  }
  if (metrics.writeRps !== undefined) {
    entries.push({ label: 'Write RPS (pico)', value: formatCompactNumber(metrics.writeRps) });
  }
  if (metrics.rps !== undefined) {
    entries.push({ label: 'RPS (pico)', value: formatCompactNumber(metrics.rps) });
  }
  if (metrics.readWriteRatio) {
    entries.push({ label: 'Read/Write', value: metrics.readWriteRatio });
  }
  if (metrics.storageGb !== undefined) {
    entries.push({ label: 'Storage', value: `${formatCompactNumber(metrics.storageGb)} GB` });
  }

  return entries;
}

export function metricLabelToTestId(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function createMetricCard(entry: { label: string; value: string }): HTMLElement {
  const metric = document.createElement('div');
  metric.className = 'sdq-briefing__metric';
  metric.setAttribute('data-testid', `briefing-metric-${metricLabelToTestId(entry.label)}`);

  const labelRow = document.createElement('div');
  labelRow.className = 'sdq-briefing__metric-label-row';

  const label = document.createElement('span');
  label.className = 'sdq-briefing__metric-label';
  label.textContent = entry.label;
  labelRow.append(label);

  const explanation = getMetricExplanation(entry.label);
  if (explanation) {
    const helpButton = document.createElement('button');
    helpButton.type = 'button';
    helpButton.className = 'sdq-briefing__metric-help';
    helpButton.setAttribute('data-testid', `briefing-metric-help-${metricLabelToTestId(entry.label)}`);
    helpButton.setAttribute('aria-label', `Explicação de ${entry.label}`);
    helpButton.setAttribute('aria-expanded', 'false');
    helpButton.textContent = '?';

    const explanationEl = document.createElement('p');
    explanationEl.className = 'sdq-briefing__metric-explanation';
    explanationEl.setAttribute(
      'data-testid',
      `briefing-metric-explanation-${metricLabelToTestId(entry.label)}`,
    );
    explanationEl.hidden = true;
    explanationEl.textContent = explanation;

    helpButton.addEventListener('click', () => {
      const isVisible = !explanationEl.hidden;
      explanationEl.hidden = isVisible;
      helpButton.setAttribute('aria-expanded', String(!isVisible));
    });

    labelRow.append(helpButton);
    metric.append(labelRow, explanationEl);
  } else {
    metric.append(labelRow);
  }

  const value = document.createElement('span');
  value.className = 'sdq-briefing__metric-value';
  value.textContent = entry.value;
  metric.append(value);

  return metric;
}

function injectBriefingStyles(root: HTMLElement): void {
  if (document.getElementById('sdq-briefing-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'sdq-briefing-styles';
  style.textContent = `
    .sdq-briefing {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: max(16px, env(safe-area-inset-top)) 16px 24px;
      background: var(--sdq-bg-overlay, rgba(12,12,14,0.94));
      z-index: 15;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }
    .sdq-briefing__card {
      width: min(560px, 100%);
      background: var(--sdq-bg-elevated, #141416);
      border: 1px solid var(--sdq-border, rgba(255,255,255,0.08));
      border-radius: var(--sdq-radius-lg, 14px);
      padding: 24px 22px 28px;
      color: var(--sdq-text, #f4f4f5);
      font-family: var(--sdq-font, system-ui, sans-serif);
      box-shadow: var(--sdq-shadow);
    }
    .sdq-briefing__company {
      font: 500 11px var(--sdq-font-mono, monospace);
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--sdq-accent, #c9a962);
      margin: 0 0 8px;
    }
    .sdq-briefing__badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 4px 10px;
      border-radius: 999px;
      margin-bottom: 12px;
    }
    .sdq-briefing__badge--easy {
      background: rgba(34, 197, 94, 0.2);
      color: #86efac;
      border: 1px solid rgba(34, 197, 94, 0.45);
    }
    .sdq-briefing__badge--medium {
      background: rgba(234, 179, 8, 0.2);
      color: #fde047;
      border: 1px solid rgba(234, 179, 8, 0.45);
    }
    .sdq-briefing__badge--hard {
      background: rgba(248, 113, 113, 0.2);
      color: #fecaca;
      border: 1px solid rgba(248, 113, 113, 0.45);
    }
    .sdq-briefing__title {
      font-size: clamp(1.35rem, 4vw, 1.65rem);
      font-weight: 600;
      margin: 0 0 12px;
      line-height: 1.2;
      letter-spacing: -0.02em;
    }
    .sdq-briefing__description {
      font-size: 15px;
      line-height: 1.6;
      color: var(--sdq-text-muted, #a1a1aa);
      margin: 0 0 18px;
    }
    .sdq-briefing__section-title {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 10px;
    }
    .sdq-briefing__metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 10px;
      margin-bottom: 18px;
    }
    .sdq-briefing__metric {
      background: rgba(15, 20, 25, 0.65);
      border: 1px solid rgba(148, 163, 184, 0.15);
      border-radius: 8px;
      padding: 10px 12px;
    }
    .sdq-briefing__metric-label-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    }
    .sdq-briefing__metric-label {
      font-size: 11px;
      color: #94a3b8;
    }
    .sdq-briefing__metric-help {
      width: 18px;
      height: 18px;
      padding: 0;
      border-radius: 999px;
      border: 1px solid rgba(148, 163, 184, 0.35);
      background: rgba(30, 41, 59, 0.9);
      color: #7dd3fc;
      font: 700 11px system-ui, sans-serif;
      line-height: 1;
      cursor: pointer;
    }
    .sdq-briefing__metric-help:hover {
      background: rgba(51, 65, 85, 0.95);
      border-color: rgba(56, 189, 248, 0.55);
    }
    .sdq-briefing__metric-explanation {
      margin: 0 0 8px;
      font-size: 11px;
      line-height: 1.45;
      color: #cbd5e1;
    }
    .sdq-briefing__metric-value {
      font-size: 15px;
      font-weight: 600;
    }
    .sdq-briefing__tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 22px;
    }
    .sdq-briefing__tag {
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(96, 165, 250, 0.15);
      color: #93c5fd;
      border: 1px solid rgba(96, 165, 250, 0.35);
    }
    .sdq-briefing__start {
      width: 100%;
      border: 1px solid var(--sdq-accent-border);
      background: var(--sdq-accent-muted);
      color: var(--sdq-accent);
      border-radius: var(--sdq-radius-sm, 6px);
      padding: 14px 16px;
      font: 600 15px var(--sdq-font);
      cursor: pointer;
      min-height: 48px;
      touch-action: manipulation;
    }
    .sdq-briefing__start:hover {
      background: rgba(201, 169, 98, 0.22);
    }
  `;
  root.append(style);
}

export function mountBriefingPanel(
  container: HTMLElement,
  callbacks: BriefingPanelCallbacks,
): BriefingPanel {
  injectBriefingStyles(document.head);

  const panel = document.createElement('aside');
  panel.className = 'sdq-briefing';
  panel.setAttribute('data-testid', 'briefing-panel');

  const card = document.createElement('div');
  card.className = 'sdq-briefing__card';

  const badge = document.createElement('span');
  badge.className = 'sdq-briefing__badge';
  badge.setAttribute('data-testid', 'briefing-badge');

  const company = document.createElement('p');
  company.className = 'sdq-briefing__company';
  company.setAttribute('data-testid', 'briefing-company');

  const title = document.createElement('h1');
  title.className = 'sdq-briefing__title';
  title.setAttribute('data-testid', 'briefing-title');

  const description = document.createElement('p');
  description.className = 'sdq-briefing__description';
  description.setAttribute('data-testid', 'briefing-description');

  const metricsTitle = document.createElement('div');
  metricsTitle.className = 'sdq-briefing__section-title';
  metricsTitle.textContent = 'Métricas de escala';

  const metricsGrid = document.createElement('div');
  metricsGrid.className = 'sdq-briefing__metrics';
  metricsGrid.setAttribute('data-testid', 'briefing-metrics');

  const tagsTitle = document.createElement('div');
  tagsTitle.className = 'sdq-briefing__section-title';
  tagsTitle.textContent = 'Domínios técnicos';

  const tagsContainer = document.createElement('div');
  tagsContainer.className = 'sdq-briefing__tags';
  tagsContainer.setAttribute('data-testid', 'briefing-tags');

  const startButton = document.createElement('button');
  startButton.type = 'button';
  startButton.className = 'sdq-briefing__start';
  startButton.setAttribute('data-testid', 'briefing-start');
  startButton.textContent = 'Começar';

  card.append(
    badge,
    company,
    title,
    description,
    metricsTitle,
    metricsGrid,
    tagsTitle,
    tagsContainer,
    startButton,
  );
  panel.append(card);
  container.append(panel);

  startButton.addEventListener('click', () => {
    callbacks.onStart();
  });

  const render = (problem: Problem): void => {
    badge.className = `sdq-briefing__badge sdq-briefing__badge--${problem.difficulty}`;
    badge.textContent = DIFFICULTY_LABELS[problem.difficulty];
    company.textContent = problem.company;
    title.textContent = problem.title;
    description.textContent = problem.description;

    metricsGrid.replaceChildren();
    for (const entry of buildMetricEntries(problem.metrics)) {
      metricsGrid.append(createMetricCard(entry));
    }

    tagsContainer.replaceChildren();
    for (const tag of problem.tags) {
      const tagEl = document.createElement('span');
      tagEl.className = 'sdq-briefing__tag';
      tagEl.textContent = tag;
      tagsContainer.append(tagEl);
    }
  };

  return { root: panel, render };
}
