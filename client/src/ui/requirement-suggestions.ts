import { getProblem, type SuggestedRequirements } from '@sdq/shared';
import type { RequirementKind } from './requirements-panel';

export type SuggestionKind = RequirementKind;

export interface RequirementSuggestions {
  functional: string[];
  nonFunctional: string[];
}

export interface MountSuggestionCardsOptions {
  problemId: string;
  onAdd: (text: string, kind: SuggestionKind) => void;
}

export interface SuggestionCards {
  root: HTMLElement;
}

export function getSuggestions(problemId: string): RequirementSuggestions {
  const problem = getProblem(problemId);
  if (!problem) {
    return { functional: [], nonFunctional: [] };
  }

  return cloneSuggestions(problem.suggestedRequirements);
}

function cloneSuggestions(suggestions: SuggestedRequirements): RequirementSuggestions {
  return {
    functional: [...suggestions.functional],
    nonFunctional: [...suggestions.nonFunctional],
  };
}

function injectSuggestionStyles(root: HTMLElement): void {
  if (document.getElementById('sdq-suggestion-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'sdq-suggestion-styles';
  style.textContent = `
    .sdq-suggestions {
      margin-bottom: 18px;
    }
    .sdq-suggestions__title {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 10px;
    }
    .sdq-suggestions__group {
      margin-bottom: 12px;
    }
    .sdq-suggestions__group-label {
      font-size: 12px;
      font-weight: 600;
      color: #cbd5e1;
      margin-bottom: 8px;
    }
    .sdq-suggestions__cards {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .sdq-suggestions__card {
      border: 1px solid rgba(96, 165, 250, 0.35);
      background: rgba(30, 64, 175, 0.25);
      color: #bfdbfe;
      border-radius: 999px;
      padding: 6px 12px;
      font: 12px/1.4 system-ui, sans-serif;
      cursor: pointer;
      text-align: left;
      max-width: 100%;
    }
    .sdq-suggestions__card:hover:not(:disabled) {
      background: rgba(37, 99, 235, 0.45);
      color: #e2e8f0;
    }
    .sdq-suggestions__card--used,
    .sdq-suggestions__card:disabled {
      opacity: 0.45;
      cursor: default;
      border-color: rgba(148, 163, 184, 0.25);
      background: rgba(51, 65, 85, 0.35);
      color: #94a3b8;
    }
  `;
  root.append(style);
}

function createSuggestionCard(
  text: string,
  kind: SuggestionKind,
  index: number,
  onAdd: MountSuggestionCardsOptions['onAdd'],
): HTMLButtonElement {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'sdq-suggestions__card';
  card.textContent = text;
  card.setAttribute('data-testid', `suggestion-card-${kind}-${index}`);
  card.setAttribute('data-suggestion-kind', kind);
  card.setAttribute('data-suggestion-text', text);

  card.addEventListener('click', () => {
    onAdd(text, kind);
    card.disabled = true;
    card.classList.add('sdq-suggestions__card--used');
  });

  return card;
}

function renderSuggestionGroup(
  container: HTMLElement,
  label: string,
  kind: SuggestionKind,
  items: string[],
  onAdd: MountSuggestionCardsOptions['onAdd'],
): void {
  const group = document.createElement('div');
  group.className = 'sdq-suggestions__group';
  group.setAttribute('data-testid', `suggestion-group-${kind}`);

  const groupLabel = document.createElement('div');
  groupLabel.className = 'sdq-suggestions__group-label';
  groupLabel.textContent = label;

  const cards = document.createElement('div');
  cards.className = 'sdq-suggestions__cards';
  cards.setAttribute('data-testid', `suggestion-cards-${kind}`);

  for (let index = 0; index < items.length; index += 1) {
    cards.append(createSuggestionCard(items[index], kind, index, onAdd));
  }

  group.append(groupLabel, cards);
  container.append(group);
}

export function mountSuggestionCards(
  container: HTMLElement,
  options: MountSuggestionCardsOptions,
): SuggestionCards {
  injectSuggestionStyles(document.head);

  const suggestions = getSuggestions(options.problemId);
  const root = document.createElement('section');
  root.className = 'sdq-suggestions';
  root.setAttribute('data-testid', 'requirement-suggestions');

  const title = document.createElement('div');
  title.className = 'sdq-suggestions__title';
  title.textContent = 'Sugestões';

  root.append(title);
  renderSuggestionGroup(root, 'Funcionais', 'functional', suggestions.functional, options.onAdd);
  renderSuggestionGroup(
    root,
    'Não-funcionais',
    'nonFunctional',
    suggestions.nonFunctional,
    options.onAdd,
  );

  const columns = container.querySelector('.sdq-requirements__columns');
  if (columns) {
    container.insertBefore(root, columns);
  } else {
    container.append(root);
  }

  return { root };
}
