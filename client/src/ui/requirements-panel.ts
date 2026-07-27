export const MIN_REQUIREMENT_LENGTH = 10;

export const SHORT_REQUIREMENT_MESSAGE = `Digite pelo menos ${MIN_REQUIREMENT_LENGTH} caracteres`;

export const EMPTY_REQUIREMENTS_WARNING =
  'Você ainda não listou requisitos em uma ou ambas as listas. Recomendamos adicionar FRs e NFRs antes de desenhar.';

export type RequirementKind = 'functional' | 'nonFunctional';

export interface RequirementsState {
  functional: string[];
  nonFunctional: string[];
}

export interface RequirementsPanelCallbacks {
  onAdvance: (requirements: RequirementsState) => void;
}

export interface RequirementsPanel {
  root: HTMLElement;
  getRequirements(): RequirementsState;
  setRequirements(state: RequirementsState): void;
  addRequirement(kind: RequirementKind, text: string): boolean;
}

export function validateRequirementText(text: string): { valid: boolean; error?: string } {
  const trimmed = text.trim();
  if (trimmed.length < MIN_REQUIREMENT_LENGTH) {
    return { valid: false, error: SHORT_REQUIREMENT_MESSAGE };
  }
  return { valid: true };
}

export function shouldWarnEmptyRequirements(state: RequirementsState): boolean {
  return state.functional.length === 0 || state.nonFunctional.length === 0;
}

function cloneRequirements(state: RequirementsState): RequirementsState {
  return {
    functional: [...state.functional],
    nonFunctional: [...state.nonFunctional],
  };
}

function injectRequirementsStyles(root: HTMLElement): void {
  if (document.getElementById('sdq-requirements-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'sdq-requirements-styles';
  style.textContent = `
    .sdq-requirements {
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
    .sdq-requirements__card {
      width: min(720px, 100%);
      background: rgba(30, 41, 59, 0.95);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 12px;
      padding: 24px 26px 28px;
      color: #e2e8f0;
      font-family: system-ui, sans-serif;
    }
    .sdq-requirements__title {
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 8px;
    }
    .sdq-requirements__subtitle {
      font-size: 14px;
      line-height: 1.5;
      color: #94a3b8;
      margin: 0 0 20px;
    }
    .sdq-requirements__columns {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 18px;
      margin-bottom: 18px;
    }
    .sdq-requirements__section-title {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 10px;
    }
    .sdq-requirements__list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 12px;
      min-height: 40px;
    }
    .sdq-requirements__item {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      background: rgba(15, 20, 25, 0.65);
      border: 1px solid rgba(148, 163, 184, 0.15);
      border-radius: 8px;
      padding: 8px 10px;
    }
    .sdq-requirements__item-text {
      flex: 1;
      font-size: 13px;
      line-height: 1.45;
      color: #e2e8f0;
      border: none;
      background: transparent;
      resize: vertical;
      min-height: 36px;
      font-family: inherit;
    }
    .sdq-requirements__item-text:focus {
      outline: 1px solid rgba(96, 165, 250, 0.5);
      border-radius: 4px;
    }
    .sdq-requirements__remove {
      border: none;
      background: transparent;
      color: #f87171;
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
      padding: 2px 4px;
    }
    .sdq-requirements__add-row {
      display: flex;
      gap: 8px;
    }
    .sdq-requirements__input {
      flex: 1;
      border: 1px solid rgba(148, 163, 184, 0.25);
      background: rgba(15, 20, 25, 0.65);
      color: #e2e8f0;
      border-radius: 8px;
      padding: 8px 10px;
      font: 13px system-ui, sans-serif;
    }
    .sdq-requirements__add {
      border: 1px solid rgba(96, 165, 250, 0.45);
      background: rgba(30, 64, 175, 0.75);
      color: #e2e8f0;
      border-radius: 8px;
      padding: 8px 12px;
      font: 600 13px system-ui, sans-serif;
      cursor: pointer;
      white-space: nowrap;
    }
    .sdq-requirements__field-error {
      font-size: 12px;
      color: #fecaca;
      margin-top: 6px;
    }
    .sdq-requirements__warning {
      font-size: 13px;
      color: #fde047;
      background: rgba(234, 179, 8, 0.12);
      border: 1px solid rgba(234, 179, 8, 0.35);
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 16px;
    }
    .sdq-requirements__advance {
      width: 100%;
      border: 1px solid rgba(96, 165, 250, 0.5);
      background: rgba(30, 64, 175, 0.85);
      color: #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      font: 600 15px system-ui, sans-serif;
      cursor: pointer;
    }
    .sdq-requirements__advance:hover {
      background: rgba(37, 99, 235, 0.95);
    }
  `;
  root.append(style);
}

interface RequirementSection {
  kind: RequirementKind;
  list: HTMLElement;
  input: HTMLInputElement;
  error: HTMLElement;
  addButton: HTMLButtonElement;
}

export function mountRequirementsPanel(
  container: HTMLElement,
  callbacks: RequirementsPanelCallbacks,
  initialState: RequirementsState = { functional: [], nonFunctional: [] },
): RequirementsPanel {
  injectRequirementsStyles(document.head);

  const state = cloneRequirements(initialState);

  const panel = document.createElement('aside');
  panel.className = 'sdq-requirements';
  panel.setAttribute('data-testid', 'requirements-panel');

  const card = document.createElement('div');
  card.className = 'sdq-requirements__card';

  const title = document.createElement('h1');
  title.className = 'sdq-requirements__title';
  title.textContent = 'Levantamento de Requisitos';

  const subtitle = document.createElement('p');
  subtitle.className = 'sdq-requirements__subtitle';
  subtitle.textContent =
    'Liste requisitos funcionais (o que o sistema faz) e não-funcionais (escala, latência, disponibilidade).';

  const warning = document.createElement('div');
  warning.className = 'sdq-requirements__warning';
  warning.hidden = true;
  warning.setAttribute('data-testid', 'requirements-warning');
  warning.textContent = EMPTY_REQUIREMENTS_WARNING;

  const columns = document.createElement('div');
  columns.className = 'sdq-requirements__columns';

  const advanceButton = document.createElement('button');
  advanceButton.type = 'button';
  advanceButton.className = 'sdq-requirements__advance';
  advanceButton.setAttribute('data-testid', 'requirements-advance');
  advanceButton.textContent = 'Ir para o canvas';

  card.append(title, subtitle, columns, warning, advanceButton);
  panel.append(card);
  container.append(panel);

  const getTargetList = (kind: RequirementKind): string[] =>
    kind === 'functional' ? state.functional : state.nonFunctional;

  const renderList = (section: RequirementSection): void => {
    section.list.replaceChildren();
    const items = getTargetList(section.kind);

    for (let index = 0; index < items.length; index += 1) {
      const item = document.createElement('div');
      item.className = 'sdq-requirements__item';
      item.setAttribute('data-testid', `requirements-item-${section.kind}-${index}`);

      const text = document.createElement('textarea');
      text.className = 'sdq-requirements__item-text';
      text.value = items[index];
      text.rows = 2;
      text.setAttribute('data-testid', `requirements-edit-${section.kind}-${index}`);

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'sdq-requirements__remove';
      removeButton.setAttribute('aria-label', 'Remover requisito');
      removeButton.setAttribute('data-testid', `requirements-remove-${section.kind}-${index}`);
      removeButton.textContent = '×';

      text.addEventListener('change', () => {
        const validation = validateRequirementText(text.value);
        if (!validation.valid) {
          text.value = items[index];
          section.error.textContent = validation.error ?? SHORT_REQUIREMENT_MESSAGE;
          section.error.hidden = false;
          return;
        }
        section.error.hidden = true;
        items[index] = text.value.trim();
      });

      removeButton.addEventListener('click', () => {
        items.splice(index, 1);
        renderList(section);
      });

      item.append(text, removeButton);
      section.list.append(item);
    }
  };

  const createSection = (kind: RequirementKind, label: string): RequirementSection => {
    const sectionRoot = document.createElement('section');
    sectionRoot.setAttribute('data-testid', `requirements-section-${kind}`);

    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'sdq-requirements__section-title';
    sectionTitle.textContent = label;

    const list = document.createElement('div');
    list.className = 'sdq-requirements__list';
    list.setAttribute('data-testid', `requirements-list-${kind}`);

    const addRow = document.createElement('div');
    addRow.className = 'sdq-requirements__add-row';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'sdq-requirements__input';
    input.setAttribute('data-testid', `requirements-input-${kind}`);
    input.placeholder = 'Descreva o requisito...';

    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'sdq-requirements__add';
    addButton.setAttribute('data-testid', `requirements-add-${kind}`);
    addButton.textContent = 'Adicionar';

    const error = document.createElement('div');
    error.className = 'sdq-requirements__field-error';
    error.hidden = true;
    error.setAttribute('data-testid', `requirements-error-${kind}`);

    addRow.append(input, addButton);
    sectionRoot.append(sectionTitle, list, addRow, error);
    columns.append(sectionRoot);

    const section: RequirementSection = { kind, list, input, error, addButton };

    const addRequirement = (): void => {
      const validation = validateRequirementText(input.value);
      if (!validation.valid) {
        error.textContent = validation.error ?? SHORT_REQUIREMENT_MESSAGE;
        error.hidden = false;
        return;
      }

      error.hidden = true;
      getTargetList(kind).push(input.value.trim());
      input.value = '';
      renderList(section);
    };

    addButton.addEventListener('click', addRequirement);
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        addRequirement();
      }
    });

    renderList(section);
    return section;
  };

  const functionalSection = createSection('functional', 'Funcionais (FR)');
  const nonFunctionalSection = createSection('nonFunctional', 'Não-funcionais (NFR)');

  advanceButton.addEventListener('click', () => {
    warning.hidden = !shouldWarnEmptyRequirements(state);
    callbacks.onAdvance(cloneRequirements(state));
  });

  const setRequirements = (next: RequirementsState): void => {
    state.functional = [...next.functional];
    state.nonFunctional = [...next.nonFunctional];
    warning.hidden = true;
    renderList(functionalSection);
    renderList(nonFunctionalSection);
  };

  const addRequirement = (kind: RequirementKind, text: string): boolean => {
    const validation = validateRequirementText(text);
    const section = kind === 'functional' ? functionalSection : nonFunctionalSection;
    if (!validation.valid) {
      section.error.textContent = validation.error ?? SHORT_REQUIREMENT_MESSAGE;
      section.error.hidden = false;
      return false;
    }

    section.error.hidden = true;
    getTargetList(kind).push(text.trim());
    renderList(section);
    return true;
  };

  return {
    root: panel,
    getRequirements: () => cloneRequirements(state),
    setRequirements,
    addRequirement,
  };
}
