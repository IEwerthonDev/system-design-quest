import {
  getProblem,
  type ArchitectureGraph,
  type ComponentType,
  URL_SHORTENER_ID,
} from '@sdq/shared';

export interface ContextualHint {
  id: string;
  text: string;
  resolvedByTypes: readonly ComponentType[];
}

export interface HintsPanelOptions {
  problemId: string;
  guidedMode?: boolean;
  getGraph: () => ArchitectureGraph;
}

export interface HintsPanel {
  root: HTMLElement;
  sync(): void;
  getHints(): ContextualHint[];
  getResolvedHintIds(): string[];
}

const STORAGE_TYPES: readonly ComponentType[] = ['sql_db', 'nosql_db', 'object_storage'];

const PROBLEM_HINTS: Record<string, readonly ContextualHint[]> = {
  [URL_SHORTENER_ID]: [
    {
      id: 'read-heavy-cache',
      text: 'Este problema é read-heavy — considere adicionar um cache (Redis) para acelerar redirects.',
      resolvedByTypes: ['cache_redis'],
    },
    {
      id: 'persistent-storage',
      text: 'Você precisa de armazenamento persistente para mapear códigos curtos → URLs longas.',
      resolvedByTypes: STORAGE_TYPES,
    },
    {
      id: 'traffic-distribution',
      text: 'Distribua o tráfego de redirect com um Load Balancer na frente dos servidores.',
      resolvedByTypes: ['load_balancer'],
    },
  ],
};

export function getHintsForProblem(problemId: string, guidedMode = false): ContextualHint[] {
  const hints = PROBLEM_HINTS[problemId] ?? [];
  if (!guidedMode) {
    return [...hints];
  }

  return hints.map((hint) => ({
    ...hint,
    text: hint.text.replace('considere', 'adicione').replace('Você precisa', 'Adicione'),
  }));
}

export function getResolvedHintIds(
  hints: readonly ContextualHint[],
  graph: ArchitectureGraph,
): string[] {
  const presentTypes = new Set(graph.nodes.map((node) => node.type));

  return hints
    .filter((hint) => hint.resolvedByTypes.some((type) => presentTypes.has(type)))
    .map((hint) => hint.id);
}

function injectHintsStyles(root: HTMLElement): void {
  if (document.getElementById('sdq-hints-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'sdq-hints-styles';
  style.textContent = `
    .sdq-hints {
      position: fixed;
      bottom: 16px;
      left: 16px;
      z-index: 25;
      width: min(320px, calc(100vw - 32px));
      border-radius: 10px;
      border: 1px solid rgba(148, 163, 184, 0.25);
      background: rgba(30, 41, 59, 0.94);
      color: #e2e8f0;
      font-family: system-ui, sans-serif;
      box-shadow: 0 10px 24px rgba(2, 6, 23, 0.35);
    }
    .sdq-hints__title {
      margin: 0;
      padding: 12px 14px 8px;
      font-size: 13px;
      font-weight: 700;
      color: #7dd3fc;
    }
    .sdq-hints__list {
      list-style: none;
      margin: 0;
      padding: 0 10px 12px;
    }
    .sdq-hints__item {
      display: flex;
      gap: 8px;
      align-items: flex-start;
      padding: 8px 6px;
      font-size: 12px;
      line-height: 1.45;
      color: #cbd5e1;
      border-top: 1px solid rgba(148, 163, 184, 0.12);
    }
    .sdq-hints__item:first-child {
      border-top: none;
    }
    .sdq-hints__item--resolved {
      color: #64748b;
      text-decoration: line-through;
    }
    .sdq-hints__check {
      flex-shrink: 0;
      font-size: 11px;
      margin-top: 1px;
    }
  `;
  root.append(style);
}

export function mountHintsPanel(
  container: HTMLElement,
  options: HintsPanelOptions,
): HintsPanel {
  injectHintsStyles(document.head);

  const problem = getProblem(options.problemId);
  if (!problem) {
    throw new Error(`Unknown problem: ${options.problemId}`);
  }

  const root = document.createElement('aside');
  root.className = 'sdq-hints';
  root.setAttribute('data-testid', 'hints-panel');

  const title = document.createElement('h2');
  title.className = 'sdq-hints__title';
  title.textContent = 'Dicas';

  const list = document.createElement('ul');
  list.className = 'sdq-hints__list';
  list.setAttribute('data-testid', 'hints-list');

  root.append(title, list);
  container.append(root);

  let resolvedIds: string[] = [];

  const sync = (): void => {
    const hints = getHintsForProblem(options.problemId, options.guidedMode);
    resolvedIds = getResolvedHintIds(hints, options.getGraph());
    list.replaceChildren();

    for (const hint of hints) {
      const item = document.createElement('li');
      item.className = 'sdq-hints__item';
      item.setAttribute('data-testid', `hint-${hint.id}`);
      const resolved = resolvedIds.includes(hint.id);
      if (resolved) {
        item.classList.add('sdq-hints__item--resolved');
      }

      const check = document.createElement('span');
      check.className = 'sdq-hints__check';
      check.textContent = resolved ? '✓' : '○';

      const text = document.createElement('span');
      text.textContent = hint.text;

      item.append(check, text);
      list.append(item);
    }
  };

  sync();

  return {
    root,
    sync,
    getHints: () => getHintsForProblem(options.problemId, options.guidedMode),
    getResolvedHintIds: () => [...resolvedIds],
  };
}
