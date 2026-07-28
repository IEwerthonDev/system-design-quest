export interface SessionHeader {
  root: HTMLElement;
  setTitle(title: string): void;
  setVisible(visible: boolean): void;
  /** Left of brand — e.g. phase back button during canvas. */
  leadingSlot: HTMLElement;
  /** Right of brand — e.g. settings during canvas. */
  trailingSlot: HTMLElement;
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
      padding: 0 16px;
      pointer-events: none;
      background: linear-gradient(180deg, rgba(12,12,14,0.9), transparent);
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
    .sdq-session-header__leading:empty,
    .sdq-session-header__trailing:empty {
      display: none;
    }
    .sdq-session-header__leading,
    .sdq-session-header__trailing {
      min-width: 0;
    }
    .sdq-session-header__brand {
      font-family: var(--sdq-font-mono, ui-monospace, monospace);
      font-size: 10px;
      letter-spacing: 0.08em;
      color: var(--sdq-text-subtle, #71717a);
      white-space: nowrap;
    }
    .sdq-session-header__brand strong {
      display: block;
      font-size: 13px;
      font-family: var(--sdq-font, system-ui, sans-serif);
      font-weight: 600;
      color: var(--sdq-text, #f4f4f5);
      letter-spacing: -0.01em;
    }
    .sdq-session-header__controls {
      display: flex;
      justify-content: center;
      flex: 1;
    }
    .sdq-session-header__row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      width: 100%;
      min-width: 0;
    }
    .sdq-session-header__trailing {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      flex-shrink: 0;
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

  const row = document.createElement('div');
  row.className = 'sdq-session-header__row';

  const leadingSlot = document.createElement('div');
  leadingSlot.className = 'sdq-session-header__leading';
  leadingSlot.setAttribute('data-testid', 'session-header-leading');

  const brand = document.createElement('div');
  brand.className = 'sdq-session-header__brand';
  brand.innerHTML = `<span class="sdq-session-header__brand-sub">SYSTEM DESIGN QUEST</span><strong data-testid="session-title">${problemTitle}</strong>`;

  const trailingSlot = document.createElement('div');
  trailingSlot.className = 'sdq-session-header__trailing';
  trailingSlot.setAttribute('data-testid', 'session-header-trailing');

  row.append(leadingSlot, brand, trailingSlot);

  const controlsSlot = document.createElement('div');
  controlsSlot.className = 'sdq-session-header__controls';

  root.append(row, controlsSlot);
  container.append(root);

  return {
    root,
    leadingSlot,
    trailingSlot,
    controlsSlot,
    setTitle(title) {
      const el = root.querySelector('[data-testid="session-title"]');
      if (el) {
        el.textContent = title;
      }
    },
    setVisible(visible) {
      root.hidden = !visible;
    },
    destroy: () => root.remove(),
  };
}
