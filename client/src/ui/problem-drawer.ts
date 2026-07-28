import type { Problem } from '@sdq/shared';

export interface ProblemDrawer {
  root: HTMLElement;
  open(): void;
  close(): void;
  toggle(): void;
  isOpen(): boolean;
  destroy(): void;
}

function injectStyles(): void {
  if (document.getElementById('sdq-problem-drawer-styles')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'sdq-problem-drawer-styles';
  style.textContent = `
    .sdq-problem-tab {
      position: fixed;
      left: 0;
      top: 50%;
      transform: translateY(-50%) rotate(-90deg);
      transform-origin: left center;
      z-index: 22;
      background: var(--sdq-bg-elevated);
      color: var(--sdq-text);
      border: 1px solid rgba(148,163,184,0.35);
      border-radius: 0 0 8px 8px;
      padding: 8px 14px;
      font: 700 11px ui-monospace, monospace;
      letter-spacing: 0.08em;
      cursor: pointer;
    }
    .sdq-problem-drawer {
      position: fixed;
      left: 0;
      top: 0;
      width: min(340px, 90vw);
      height: 100%;
      z-index: 21;
      background: var(--sdq-bg-elevated);
      border-right: 1px solid rgba(148,163,184,0.3);
      color: var(--sdq-text);
      font-family: ui-monospace, Menlo, monospace;
      font-size: 12px;
      padding: 56px 16px 24px;
      overflow-y: auto;
      transform: translateX(-100%);
      transition: transform 0.2s ease;
    }
    .sdq-problem-drawer--open {
      transform: translateX(0);
    }
    .sdq-problem-drawer h2 {
      font-size: 13px;
      letter-spacing: 0.1em;
      margin-bottom: 8px;
      color: var(--sdq-accent);
    }
    .sdq-problem-drawer h3 {
      font-size: 14px;
      margin: 0 0 10px;
    }
    .sdq-problem-drawer p { line-height: 1.45; color: var(--sdq-text-muted); margin-bottom: 12px; }
    .sdq-problem-drawer ul { padding-left: 18px; color: var(--sdq-text-muted); }
    .sdq-problem-drawer li { margin-bottom: 6px; }
  `;
  document.head.append(style);
}

export function mountProblemDrawer(container: HTMLElement, problem: Problem): ProblemDrawer {
  injectStyles();

  const tab = document.createElement('button');
  tab.type = 'button';
  tab.className = 'sdq-problem-tab';
  tab.setAttribute('data-testid', 'problem-tab');
  tab.textContent = 'PROBLEM';

  const root = document.createElement('aside');
  root.className = 'sdq-problem-drawer';
  root.setAttribute('data-testid', 'problem-drawer');
  root.innerHTML = `
    <h2>PROBLEM</h2>
    <h3>${problem.title}</h3>
    <p>${problem.description}</p>
    <h2>CONSTRAINTS</h2>
    <ul>${problem.constraints.map((c) => `<li>${c}</li>`).join('')}</ul>
  `;

  let openState = false;
  const setOpen = (next: boolean): void => {
    openState = next;
    root.classList.toggle('sdq-problem-drawer--open', next);
  };

  tab.addEventListener('click', () => setOpen(!openState));

  container.append(tab, root);

  return {
    root,
    open: () => setOpen(true),
    close: () => setOpen(false),
    toggle: () => setOpen(!openState),
    isOpen: () => openState,
    destroy: () => {
      tab.remove();
      root.remove();
    },
  };
}
