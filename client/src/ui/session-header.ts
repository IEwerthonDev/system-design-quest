export interface SessionHeader {
  root: HTMLElement;
  setTitle(title: string): void;
  setVisible(visible: boolean): void;
  /** Left of brand — e.g. phase back button during canvas. */
  leadingSlot: HTMLElement;
  controlsSlot: HTMLElement;
  destroy(): void;
}

function injectStyles(): void {
  if (document.getElementById('sdq-session-header-styles')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'sdq-session-header-styles';
  style.textContent = `
    .sdq-session-header {
      position: fixed;
      top: 0;
      left: 220px;
      right: 0;
      height: 56px;
      z-index: 18;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 0 16px 0 16px;
      pointer-events: none;
      background: linear-gradient(180deg, rgba(10,25,48,0.85), transparent);
      transition: left 0.18s ease;
    }
    html.sdq-palette-is-collapsed .sdq-session-header {
      left: 52px;
    }
    .sdq-session-header > * { pointer-events: auto; }
    .sdq-session-header__leading {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }
    .sdq-session-header__leading:empty {
      display: none;
    }
    .sdq-session-header__brand {
      font-family: ui-monospace, Menlo, monospace;
      font-size: 11px;
      letter-spacing: 0.06em;
      color: #93c5fd;
      white-space: nowrap;
    }
    .sdq-session-header__brand strong {
      display: block;
      font-size: 13px;
      color: #f8fafc;
      letter-spacing: 0.02em;
    }
    .sdq-session-header__controls {
      display: flex;
      justify-content: center;
      flex: 1;
    }
    .sdq-session-header[hidden] { display: none !important; }
  `;
  document.head.append(style);
}

export function mountSessionHeader(container: HTMLElement, problemTitle: string): SessionHeader {
  injectStyles();
  const root = document.createElement('header');
  root.className = 'sdq-session-header';
  root.setAttribute('data-testid', 'session-header');
  root.hidden = true;

  const leadingSlot = document.createElement('div');
  leadingSlot.className = 'sdq-session-header__leading';
  leadingSlot.setAttribute('data-testid', 'session-header-leading');

  const brand = document.createElement('div');
  brand.className = 'sdq-session-header__brand';
  brand.innerHTML = `SYSTEM DESIGN QUEST<strong data-testid="session-title">DESIGN SESSION: ${problemTitle}</strong>`;

  const controlsSlot = document.createElement('div');
  controlsSlot.className = 'sdq-session-header__controls';

  root.append(leadingSlot, brand, controlsSlot);
  container.append(root);

  return {
    root,
    leadingSlot,
    controlsSlot,
    setTitle(title) {
      const el = root.querySelector('[data-testid="session-title"]');
      if (el) {
        el.textContent = `DESIGN SESSION: ${title}`;
      }
    },
    setVisible(visible) {
      root.hidden = !visible;
    },
    destroy: () => root.remove(),
  };
}
