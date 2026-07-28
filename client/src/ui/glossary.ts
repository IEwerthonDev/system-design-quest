import { getComponentMeta, getProblem, type ComponentType } from '@sdq/shared';

export interface TooltipContent {
  name: string;
  description: string;
  whenToUse: string;
}

export interface GlossaryTerm {
  term: string;
  explanation: string;
}

const PROBLEM_GLOSSARY: Record<string, readonly GlossaryTerm[]> = {
  'url-shortener': [
    {
      term: 'Read-heavy',
      explanation:
        'Sistema com muito mais leituras que escritas. Cada link criado gera muitos redirects — otimize o caminho de leitura.',
    },
    {
      term: 'Hashing / Base62',
      explanation:
        'Técnica para gerar códigos curtos únicos a partir de URLs longas. Base62 usa letras e números para URLs compactas.',
    },
    {
      term: 'Cache',
      explanation:
        'Armazenamento temporário em memória que acelera redirects frequentes sem consultar o banco a cada clique.',
    },
    {
      term: 'Key-Value (KV)',
      explanation:
        'Banco simples que mapeia uma chave (código curto) para um valor (URL longa). Ideal para lookups rápidos.',
    },
    {
      term: 'HTTP 302 Redirect',
      explanation:
        'Resposta temporária que envia o navegador para a URL original. É o coração do fluxo de leitura do encurtador.',
    },
  ],
};

const TAG_GLOSSARY: Record<string, GlossaryTerm> = {
  hashing: {
    term: 'Hashing',
    explanation:
      'Transforma dados em um identificador fixo. No encurtador, gera códigos curtos únicos para cada URL.',
  },
  cache: {
    term: 'Cache',
    explanation:
      'Camada rápida que guarda resultados recentes para evitar consultas repetidas ao banco de dados.',
  },
  kv: {
    term: 'Key-Value Store',
    explanation: 'Banco que busca por chave — perfeito para mapear código curto → URL longa.',
  },
  'read-heavy': {
    term: 'Read-heavy',
    explanation:
      'Proporção de leituras muito maior que escritas. Exige otimizar redirects e cache.',
  },
};

const METRIC_EXPLANATIONS: Record<string, string> = {
  DAU: 'DAU (Daily Active Users) — quantos usuários únicos usam o sistema por dia.',
  'Read RPS (pico)':
    'RPS (Requests Per Second) de leitura — quantas consultas o sistema recebe por segundo no pico.',
  'Write RPS (pico)':
    'RPS de escrita — quantas gravações ou atualizações o sistema recebe por segundo no pico.',
  'RPS (pico)': 'RPS — requisições por segundo no horário de maior tráfego.',
  'Read/Write': 'Proporção entre leituras e escritas — ajuda a decidir cache e réplicas.',
  Storage: 'Volume estimado de dados persistidos ao longo do tempo.',
};

export function countSentences(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }

  return trimmed.split(/[.!?]+/).filter((part) => part.trim().length > 0).length;
}

export function getComponentTooltip(type: ComponentType): TooltipContent {
  const meta = getComponentMeta(type);
  return {
    name: meta.label,
    description: meta.description,
    whenToUse: meta.whenToUse,
  };
}

export function getMetricExplanation(metric: string): string | null {
  return METRIC_EXPLANATIONS[metric] ?? null;
}

export function getProblemGlossaryTerms(problemId: string): GlossaryTerm[] {
  const explicit = PROBLEM_GLOSSARY[problemId];
  if (explicit) {
    return [...explicit];
  }

  const problem = getProblem(problemId);
  if (!problem) {
    return [];
  }

  const seen = new Set<string>();
  const terms: GlossaryTerm[] = [];

  for (const tag of problem.tags) {
    const entry = TAG_GLOSSARY[tag];
    if (entry && !seen.has(entry.term)) {
      seen.add(entry.term);
      terms.push(entry);
    }
  }

  return terms;
}

export interface GlossaryPanel {
  root: HTMLElement;
  open(): void;
  close(): void;
  toggle(): void;
  isOpen(): boolean;
  destroy(): void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  const candidate =
    target instanceof HTMLElement ? target : document.activeElement;
  if (!(candidate instanceof HTMLElement)) {
    return false;
  }

  const tag = candidate.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || candidate.isContentEditable;
}

function injectGlossaryPanelStyles(root: HTMLElement): void {
  if (document.getElementById('sdq-glossary-panel-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'sdq-glossary-panel-styles';
  style.textContent = `
    .sdq-glossary-panel {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 40;
      width: min(360px, calc(100vw - 32px));
      max-height: calc(100vh - 32px);
      display: flex;
      flex-direction: column;
      border-radius: var(--sdq-radius-lg);
      border: 1px solid rgba(56, 189, 248, 0.35);
      background: var(--sdq-bg-elevated);
      color: var(--sdq-text);
      font-family: var(--sdq-font);
      box-shadow: 0 16px 40px rgba(2, 6, 23, 0.55);
    }
    .sdq-glossary-panel[hidden] {
      display: none;
    }
    .sdq-glossary-panel__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--sdq-border);
    }
    .sdq-glossary-panel__title {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      color: var(--sdq-accent);
    }
    .sdq-glossary-panel__shortcut {
      font-size: 11px;
      color: var(--sdq-text-muted);
    }
    .sdq-glossary-panel__close {
      border: none;
      background: transparent;
      color: var(--sdq-text-muted);
      font-size: 20px;
      line-height: 1;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: var(--sdq-radius-sm);
    }
    .sdq-glossary-panel__close:hover {
      color: var(--sdq-text);
      background: rgba(51, 65, 85, 0.6);
    }
    .sdq-glossary-panel__body {
      overflow-y: auto;
      padding: 12px 16px 16px;
    }
    .sdq-glossary-panel__term {
      margin-bottom: 14px;
    }
    .sdq-glossary-panel__term:last-child {
      margin-bottom: 0;
    }
    .sdq-glossary-panel__term-name {
      margin: 0 0 4px;
      font-size: 13px;
      font-weight: 700;
      color: #bae6fd;
    }
    .sdq-glossary-panel__term-text {
      margin: 0;
      font-size: 12px;
      line-height: 1.5;
      color: var(--sdq-text-muted);
    }
    .sdq-glossary-panel__empty {
      margin: 0;
      font-size: 12px;
      color: var(--sdq-text-muted);
    }
  `;
  root.append(style);
}

export function openGlossaryPanel(problemId: string, container: HTMLElement = document.body): GlossaryPanel {
  injectGlossaryPanelStyles(document.head);
  injectGlossaryStyles(document.head);

  const terms = getProblemGlossaryTerms(problemId);
  const problem = getProblem(problemId);

  const panel = document.createElement('aside');
  panel.className = 'sdq-glossary-panel';
  panel.setAttribute('data-testid', 'glossary-panel');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Glossário');
  panel.hidden = true;

  const header = document.createElement('header');
  header.className = 'sdq-glossary-panel__header';

  const titleWrap = document.createElement('div');
  const title = document.createElement('h2');
  title.className = 'sdq-glossary-panel__title';
  title.textContent = 'Glossário';
  const shortcut = document.createElement('p');
  shortcut.className = 'sdq-glossary-panel__shortcut';
  shortcut.textContent = problem ? `${problem.title} · atalho G` : 'Atalho G';
  titleWrap.append(title, shortcut);

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'sdq-glossary-panel__close';
  closeButton.setAttribute('data-testid', 'glossary-panel-close');
  closeButton.setAttribute('aria-label', 'Fechar glossário');
  closeButton.textContent = '×';

  header.append(titleWrap, closeButton);

  const body = document.createElement('div');
  body.className = 'sdq-glossary-panel__body';

  if (terms.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'sdq-glossary-panel__empty';
    empty.textContent = 'Nenhum termo disponível para este problema.';
    body.append(empty);
  } else {
    for (const entry of terms) {
      const termBlock = document.createElement('article');
      termBlock.className = 'sdq-glossary-panel__term';
      termBlock.setAttribute('data-testid', `glossary-term-${entry.term.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);

      const termName = document.createElement('h3');
      termName.className = 'sdq-glossary-panel__term-name';
      termName.textContent = entry.term;

      const termText = document.createElement('p');
      termText.className = 'sdq-glossary-panel__term-text';
      termText.textContent = entry.explanation;

      termBlock.append(termName, termText);
      body.append(termBlock);
    }
  }

  panel.append(header, body);
  container.append(panel);

  const open = (): void => {
    panel.hidden = false;
  };

  const close = (): void => {
    panel.hidden = true;
  };

  const toggle = (): void => {
    panel.hidden = !panel.hidden;
  };

  closeButton.addEventListener('click', close);

  return {
    root: panel,
    open,
    close,
    toggle,
    isOpen: () => !panel.hidden,
    destroy: () => {
      panel.remove();
    },
  };
}

export function bindGlossaryShortcut(panel: Pick<GlossaryPanel, 'toggle' | 'close' | 'isOpen'>): () => void {
  const onKeyDown = (event: KeyboardEvent): void => {
    if (isEditableTarget(event.target)) {
      return;
    }

    if (event.key === 'g' || event.key === 'G') {
      event.preventDefault();
      panel.toggle();
      return;
    }

    if (event.key === 'Escape' && panel.isOpen()) {
      event.preventDefault();
      panel.close();
    }
  };

  window.addEventListener('keydown', onKeyDown);

  return () => {
    window.removeEventListener('keydown', onKeyDown);
  };
}

function injectGlossaryStyles(root: HTMLElement): void {
  if (document.getElementById('sdq-glossary-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'sdq-glossary-styles';
  style.textContent = `
    .sdq-component-tooltip {
      position: fixed;
      z-index: 50;
      width: min(280px, calc(100vw - 24px));
      padding: 12px 14px;
      border-radius: var(--sdq-radius);
      border: 1px solid rgba(56, 189, 248, 0.35);
      background: var(--sdq-bg-elevated);
      color: var(--sdq-text);
      font-family: var(--sdq-font);
      font-size: 12px;
      line-height: 1.45;
      box-shadow: 0 10px 30px rgba(2, 6, 23, 0.45);
      pointer-events: none;
    }
    .sdq-component-tooltip__name {
      margin: 0 0 6px;
      font-size: 13px;
      font-weight: 700;
      color: var(--sdq-accent);
    }
    .sdq-component-tooltip__description {
      margin: 0 0 8px;
      color: var(--sdq-text-muted);
    }
    .sdq-component-tooltip__when {
      margin: 0;
      color: var(--sdq-text-muted);
      font-size: 11px;
    }
    .sdq-component-tooltip__when strong {
      color: #bae6fd;
      font-weight: 600;
    }
    .sdq-palette__item--tooltip-active {
      border-color: rgba(56, 189, 248, 0.55);
      background: var(--sdq-bg-elevated);
    }
  `;
  root.append(style);
}

let sharedTooltip: HTMLElement | null = null;

function getSharedTooltip(): HTMLElement {
  if (!sharedTooltip) {
    sharedTooltip = document.createElement('div');
    sharedTooltip.className = 'sdq-component-tooltip';
    sharedTooltip.setAttribute('role', 'tooltip');
    sharedTooltip.setAttribute('data-testid', 'component-tooltip');
    sharedTooltip.hidden = true;
    document.body.append(sharedTooltip);
  }
  return sharedTooltip;
}

function renderTooltipContent(tooltip: HTMLElement, content: TooltipContent): void {
  tooltip.replaceChildren();

  const name = document.createElement('p');
  name.className = 'sdq-component-tooltip__name';
  name.setAttribute('data-testid', 'component-tooltip-name');
  name.textContent = content.name;

  const description = document.createElement('p');
  description.className = 'sdq-component-tooltip__description';
  description.setAttribute('data-testid', 'component-tooltip-description');
  description.textContent = content.description;

  const when = document.createElement('p');
  when.className = 'sdq-component-tooltip__when';
  when.setAttribute('data-testid', 'component-tooltip-when');
  when.innerHTML = `<strong>Quando usar:</strong> ${content.whenToUse}`;

  tooltip.append(name, description, when);
}

function positionTooltip(tooltip: HTMLElement, anchor: HTMLElement): void {
  const rect = anchor.getBoundingClientRect();
  const margin = 10;
  let left = rect.right + margin;
  let top = rect.top;

  const tooltipWidth = 280;
  if (left + tooltipWidth > window.innerWidth - margin) {
    left = Math.max(margin, rect.left);
    top = rect.bottom + margin;
  }

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${Math.max(margin, top)}px`;
}

export function bindComponentTooltip(item: HTMLElement, type: ComponentType): () => void {
  injectGlossaryStyles(document.head);
  const content = getComponentTooltip(type);
  const tooltipId = `sdq-component-tooltip-${type}`;
  item.setAttribute('aria-describedby', tooltipId);

  const show = (): void => {
    const tooltip = getSharedTooltip();
    tooltip.id = tooltipId;
    renderTooltipContent(tooltip, content);
    positionTooltip(tooltip, item);
    tooltip.hidden = false;
    item.classList.add('sdq-palette__item--tooltip-active');
  };

  const hide = (): void => {
    const tooltip = getSharedTooltip();
    tooltip.hidden = true;
    item.classList.remove('sdq-palette__item--tooltip-active');
  };

  item.addEventListener('mouseenter', show);
  item.addEventListener('mouseleave', hide);
  item.addEventListener('focus', show);
  item.addEventListener('blur', hide);

  return () => {
    hide();
    item.removeEventListener('mouseenter', show);
    item.removeEventListener('mouseleave', hide);
    item.removeEventListener('focus', show);
    item.removeEventListener('blur', hide);
    item.classList.remove('sdq-palette__item--tooltip-active');
    item.removeAttribute('aria-describedby');
  };
}

/** Test helper — removes shared tooltip between tests */
export function resetComponentTooltip(): void {
  sharedTooltip?.remove();
  sharedTooltip = null;
}
