import type { FeedbackItem, JudgeResult, ReqCoverageItem, Verdict } from '@sdq/shared';

export const VERDICT_LABELS: Record<Verdict, string> = {
  PASS: 'Aprovado',
  PARTIAL: 'Parcial',
  FAIL: 'Reprovado',
};

export const REQUIREMENT_STATUS_LABELS: Record<ReqCoverageItem['status'], string> = {
  covered: 'Coberto',
  partial: 'Parcial',
  missing: 'Faltando',
};

export const REQUIREMENT_TYPE_LABELS: Record<ReqCoverageItem['type'], string> = {
  functional: 'Funcional',
  nonFunctional: 'Não funcional',
};

export interface ResultPanelOptions {
  beginnerMode: boolean;
  onToggleBeginner: (enabled: boolean) => void;
}

export interface ResultPanel {
  root: HTMLElement;
  render(result: JudgeResult): void;
  setBeginnerMode(enabled: boolean): void;
  isDetailsExpanded(): boolean;
}

export function getCollapsedSummary(result: JudgeResult, beginnerMode: boolean): string {
  if (beginnerMode) {
    return result.summary;
  }

  return result.judgeDebate.consensus || result.summary;
}

function injectResultStyles(root: HTMLElement): void {
  if (document.getElementById('sdq-result-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'sdq-result-styles';
  style.textContent = `
    .sdq-result {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(15, 20, 25, 0.92);
      z-index: 15;
      overflow-y: auto;
    }
    .sdq-result__card {
      width: min(760px, 100%);
      background: rgba(30, 41, 59, 0.96);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 12px;
      padding: 24px 26px 28px;
      color: #e2e8f0;
      font-family: system-ui, sans-serif;
    }
    .sdq-result__header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .sdq-result__badge {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 4px 12px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .sdq-result__badge--pass {
      background: rgba(34, 197, 94, 0.18);
      color: #86efac;
      border: 1px solid rgba(34, 197, 94, 0.45);
    }
    .sdq-result__badge--partial {
      background: rgba(234, 179, 8, 0.18);
      color: #fde047;
      border: 1px solid rgba(234, 179, 8, 0.45);
    }
    .sdq-result__badge--fail {
      background: rgba(239, 68, 68, 0.18);
      color: #fca5a5;
      border: 1px solid rgba(239, 68, 68, 0.45);
    }
    .sdq-result__score {
      font-size: 28px;
      font-weight: 700;
      color: #f8fafc;
    }
    .sdq-result__score-label {
      font-size: 13px;
      color: #94a3b8;
      margin-left: 4px;
    }
    .sdq-result__controls {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #cbd5e1;
    }
    .sdq-result__toggle {
      accent-color: #38bdf8;
    }
    .sdq-result__summary {
      margin: 0 0 12px;
      font-size: 15px;
      line-height: 1.55;
      color: #e2e8f0;
    }
    .sdq-result__next-step {
      margin: 0 0 18px;
      padding: 12px 14px;
      border-radius: 8px;
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(56, 189, 248, 0.25);
      font-size: 14px;
      line-height: 1.5;
    }
    .sdq-result__next-step-label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #7dd3fc;
      margin-bottom: 6px;
    }
    .sdq-result__details-toggle {
      border: 1px solid rgba(148, 163, 184, 0.35);
      background: rgba(15, 23, 42, 0.65);
      color: #e2e8f0;
      border-radius: 8px;
      padding: 8px 14px;
      font: 600 13px system-ui, sans-serif;
      cursor: pointer;
      margin-bottom: 14px;
    }
    .sdq-result__details-toggle:hover {
      background: rgba(30, 41, 59, 0.95);
    }
    .sdq-result__details {
      display: none;
      border-top: 1px solid rgba(148, 163, 184, 0.2);
      padding-top: 16px;
    }
    .sdq-result__details--expanded {
      display: block;
    }
    .sdq-result__section {
      margin-bottom: 18px;
    }
    .sdq-result__section-title {
      margin: 0 0 10px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #94a3b8;
    }
    .sdq-result__item {
      margin-bottom: 10px;
      padding: 10px 12px;
      border-radius: 8px;
      background: rgba(15, 20, 25, 0.55);
      border: 1px solid rgba(148, 163, 184, 0.15);
    }
    .sdq-result__item-title {
      margin: 0 0 6px;
      font-size: 14px;
      font-weight: 600;
      color: #f8fafc;
    }
    .sdq-result__item-body {
      margin: 0;
      font-size: 13px;
      line-height: 1.45;
      color: #cbd5e1;
    }
    .sdq-result__item-meta {
      margin: 6px 0 0;
      font-size: 12px;
      line-height: 1.45;
      color: #94a3b8;
    }
    .sdq-result__coverage {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .sdq-result__coverage th,
    .sdq-result__coverage td {
      border: 1px solid rgba(148, 163, 184, 0.2);
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
    }
    .sdq-result__coverage th {
      background: rgba(15, 23, 42, 0.75);
      color: #94a3b8;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .sdq-result__debate-block {
      margin-bottom: 10px;
      padding: 10px 12px;
      border-radius: 8px;
      background: rgba(15, 20, 25, 0.55);
      border: 1px solid rgba(148, 163, 184, 0.15);
    }
    .sdq-result__debate-label {
      display: block;
      margin-bottom: 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: #7dd3fc;
    }
    .sdq-result__empty {
      margin: 0;
      font-size: 13px;
      color: #64748b;
      font-style: italic;
    }
  `;
  root.append(style);
}

function verdictBadgeClass(verdict: Verdict): string {
  return `sdq-result__badge sdq-result__badge--${verdict.toLowerCase()}`;
}

function createFeedbackItems(
  items: FeedbackItem[],
  sectionTestId: string,
): HTMLElement {
  const section = document.createElement('section');
  section.className = 'sdq-result__section';
  section.setAttribute('data-testid', sectionTestId);

  if (items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'sdq-result__empty';
    empty.textContent = 'Nenhum item nesta seção.';
    section.append(empty);
    return section;
  }

  for (const item of items) {
    const card = document.createElement('article');
    card.className = 'sdq-result__item';

    const title = document.createElement('h4');
    title.className = 'sdq-result__item-title';
    title.textContent = item.title;

    const explanation = document.createElement('p');
    explanation.className = 'sdq-result__item-body';
    explanation.textContent = item.explanation;

    card.append(title, explanation);

    if (item.howToImprove || item.whyItMatters) {
      if (item.howToImprove) {
        const how = document.createElement('p');
        how.className = 'sdq-result__item-meta';
        how.setAttribute('data-testid', 'result-improvement-how');
        how.textContent = `Como melhorar: ${item.howToImprove}`;
        card.append(how);
      }

      if (item.whyItMatters) {
        const why = document.createElement('p');
        why.className = 'sdq-result__item-meta';
        why.setAttribute('data-testid', 'result-improvement-why');
        why.textContent = `Por quê: ${item.whyItMatters}`;
        card.append(why);
      }
    }

    section.append(card);
  }

  return section;
}

function createRequirementCoverage(items: ReqCoverageItem[]): HTMLElement {
  const section = document.createElement('section');
  section.className = 'sdq-result__section';
  section.setAttribute('data-testid', 'result-requirement-coverage');

  if (items.length === 0) {
    return section;
  }

  const title = document.createElement('h3');
  title.className = 'sdq-result__section-title';
  title.textContent = 'Cobertura de requisitos';

  const table = document.createElement('table');
  table.className = 'sdq-result__coverage';

  table.innerHTML = `
    <thead>
      <tr>
        <th>Requisito</th>
        <th>Tipo</th>
        <th>Status</th>
        <th>Explicação</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector('tbody')!;

  for (const item of items) {
    const row = document.createElement('tr');

    const requirementCell = document.createElement('td');
    requirementCell.textContent = item.requirement;

    const typeCell = document.createElement('td');
    typeCell.textContent = REQUIREMENT_TYPE_LABELS[item.type];

    const statusCell = document.createElement('td');
    statusCell.textContent = REQUIREMENT_STATUS_LABELS[item.status];

    const explanationCell = document.createElement('td');
    explanationCell.textContent = item.explanation;

    row.append(requirementCell, typeCell, statusCell, explanationCell);
    tbody.append(row);
  }

  section.append(title, table);
  return section;
}

function createDebateSection(result: JudgeResult): HTMLElement {
  const section = document.createElement('section');
  section.className = 'sdq-result__section';
  section.setAttribute('data-testid', 'result-debate');

  const title = document.createElement('h3');
  title.className = 'sdq-result__section-title';
  title.textContent = 'Debate dos juízes';

  const blocks: Array<{ testId: string; label: string; text: string }> = [
    { testId: 'result-debate-rigorous', label: 'Juiz rigoroso', text: result.judgeDebate.rigorous },
    { testId: 'result-debate-pragmatic', label: 'Juiz pragmático', text: result.judgeDebate.pragmatic },
    { testId: 'result-debate-consensus', label: 'Consenso', text: result.judgeDebate.consensus },
  ];

  for (const block of blocks) {
    const wrapper = document.createElement('div');
    wrapper.className = 'sdq-result__debate-block';
    wrapper.setAttribute('data-testid', block.testId);

    const label = document.createElement('span');
    label.className = 'sdq-result__debate-label';
    label.textContent = block.label;

    const body = document.createElement('p');
    body.className = 'sdq-result__item-body';
    body.textContent = block.text;

    wrapper.append(label, body);
    section.append(wrapper);
  }

  return section;
}

export function mountResultPanel(
  container: HTMLElement,
  result: JudgeResult,
  options: ResultPanelOptions,
): ResultPanel {
  injectResultStyles(document.head);

  let beginnerMode = options.beginnerMode;
  let detailsExpanded = false;
  let currentResult = result;

  const panel = document.createElement('div');
  panel.className = 'sdq-result';
  panel.setAttribute('data-testid', 'result-panel');

  const card = document.createElement('div');
  card.className = 'sdq-result__card';

  const header = document.createElement('div');
  header.className = 'sdq-result__header';

  const badge = document.createElement('span');
  badge.setAttribute('data-testid', 'result-verdict-badge');

  const score = document.createElement('div');
  score.setAttribute('data-testid', 'result-score');

  const controls = document.createElement('div');
  controls.className = 'sdq-result__controls';

  const toggleLabel = document.createElement('label');
  const beginnerToggle = document.createElement('input');
  beginnerToggle.type = 'checkbox';
  beginnerToggle.className = 'sdq-result__toggle';
  beginnerToggle.setAttribute('data-testid', 'result-beginner-toggle');
  beginnerToggle.checked = beginnerMode;
  toggleLabel.append(beginnerToggle, document.createTextNode(' Modo iniciante'));
  controls.append(toggleLabel);

  header.append(badge, score, controls);

  const summary = document.createElement('p');
  summary.className = 'sdq-result__summary';
  summary.setAttribute('data-testid', 'result-summary');

  const nextStep = document.createElement('div');
  nextStep.className = 'sdq-result__next-step';
  nextStep.setAttribute('data-testid', 'result-next-step');

  const detailsToggle = document.createElement('button');
  detailsToggle.type = 'button';
  detailsToggle.className = 'sdq-result__details-toggle';
  detailsToggle.setAttribute('data-testid', 'result-details-toggle');
  detailsToggle.textContent = 'Detalhes técnicos';

  const details = document.createElement('div');
  details.className = 'sdq-result__details';
  details.setAttribute('data-testid', 'result-details');

  card.append(header, summary, nextStep, detailsToggle, details);
  panel.append(card);
  container.append(panel);

  const renderHeader = (): void => {
    badge.className = verdictBadgeClass(currentResult.verdict);
    badge.textContent = VERDICT_LABELS[currentResult.verdict];
    score.innerHTML = `<span>${currentResult.score}</span><span class="sdq-result__score-label">/ 100</span>`;
    summary.textContent = getCollapsedSummary(currentResult, beginnerMode);
    nextStep.innerHTML = `
      <span class="sdq-result__next-step-label">Próximo passo sugerido</span>
      ${currentResult.nextStep}
    `;
    beginnerToggle.checked = beginnerMode;
  };

  const renderDetails = (): void => {
    details.replaceChildren();

    const strengthsTitle = document.createElement('h3');
    strengthsTitle.className = 'sdq-result__section-title';
    strengthsTitle.textContent = 'Pontos fortes';

    const strengths = createFeedbackItems(currentResult.strengths, 'result-strengths');
    strengths.prepend(strengthsTitle);

    const criticalTitle = document.createElement('h3');
    criticalTitle.className = 'sdq-result__section-title';
    criticalTitle.textContent = 'Problemas críticos';

    const criticalIssues = createFeedbackItems(
      currentResult.criticalIssues,
      'result-critical-issues',
    );
    criticalIssues.prepend(criticalTitle);

    const improvementsTitle = document.createElement('h3');
    improvementsTitle.className = 'sdq-result__section-title';
    improvementsTitle.textContent = 'Melhorias sugeridas';

    const improvements = createFeedbackItems(currentResult.improvements, 'result-improvements');
    improvements.prepend(improvementsTitle);

    details.append(
      strengths,
      criticalIssues,
      improvements,
      createRequirementCoverage(currentResult.requirementCoverage),
      createDebateSection(currentResult),
    );
  };

  const syncDetailsVisibility = (): void => {
    details.classList.toggle('sdq-result__details--expanded', detailsExpanded);
    detailsToggle.textContent = detailsExpanded
      ? 'Ocultar detalhes técnicos'
      : 'Detalhes técnicos';
  };

  beginnerToggle.addEventListener('change', () => {
    beginnerMode = beginnerToggle.checked;
    renderHeader();
    options.onToggleBeginner(beginnerMode);
  });

  detailsToggle.addEventListener('click', () => {
    detailsExpanded = !detailsExpanded;
    syncDetailsVisibility();
  });

  renderHeader();
  renderDetails();
  syncDetailsVisibility();

  return {
    root: panel,
    render(nextResult: JudgeResult) {
      currentResult = nextResult;
      renderHeader();
      renderDetails();
    },
    setBeginnerMode(enabled: boolean) {
      beginnerMode = enabled;
      beginnerToggle.checked = enabled;
      renderHeader();
    },
    isDetailsExpanded() {
      return detailsExpanded;
    },
  };
}
