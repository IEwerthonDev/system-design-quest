import { getComponentMeta, type ComponentType } from '@sdq/shared';

export interface TooltipContent {
  name: string;
  description: string;
  whenToUse: string;
}

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
      border-radius: 10px;
      border: 1px solid rgba(56, 189, 248, 0.35);
      background: rgba(15, 23, 42, 0.98);
      color: #e2e8f0;
      font-family: system-ui, sans-serif;
      font-size: 12px;
      line-height: 1.45;
      box-shadow: 0 10px 30px rgba(2, 6, 23, 0.45);
      pointer-events: none;
    }
    .sdq-component-tooltip__name {
      margin: 0 0 6px;
      font-size: 13px;
      font-weight: 700;
      color: #7dd3fc;
    }
    .sdq-component-tooltip__description {
      margin: 0 0 8px;
      color: #cbd5e1;
    }
    .sdq-component-tooltip__when {
      margin: 0;
      color: #94a3b8;
      font-size: 11px;
    }
    .sdq-component-tooltip__when strong {
      color: #bae6fd;
      font-weight: 600;
    }
    .sdq-palette__item--tooltip-active {
      border-color: rgba(56, 189, 248, 0.55);
      background: rgba(30, 41, 59, 0.95);
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
