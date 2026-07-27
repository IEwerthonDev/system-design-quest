export const TABLET_MAX_WIDTH = 1024;
export const LAYOUT_TABLET_CLASS = 'sdq-layout--tablet';
export const PALETTE_COLLAPSED_CLASS = 'sdq-palette--collapsed';

export interface ResponsiveController {
  applyWidth(width: number): void;
  isTablet(): boolean;
  setPaletteCollapsed(collapsed: boolean): void;
  isPaletteCollapsed(): boolean;
  dispose(): void;
}

function injectResponsiveStyles(): void {
  if (document.getElementById('sdq-responsive-styles')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'sdq-responsive-styles';
  style.textContent = `
    .sdq-layout--tablet .sdq-palette {
      width: 100%;
      height: auto;
      max-height: 40vh;
      border-right: none;
      border-bottom: 1px solid rgba(148, 163, 184, 0.2);
    }
    .sdq-layout--tablet .sdq-palette.sdq-palette--collapsed {
      max-height: 44px;
      overflow: hidden;
    }
    .sdq-layout--tablet .sdq-palette.sdq-palette--collapsed .sdq-palette__section {
      display: none;
    }
    .sdq-layout--tablet .sdq-briefing,
    .sdq-layout--tablet .sdq-requirements,
    .sdq-layout--tablet .sdq-properties {
      left: 8px !important;
      right: 8px !important;
      width: auto !important;
      max-width: none !important;
    }
    .sdq-palette__collapse {
      display: none;
      margin-left: auto;
      border: 1px solid #475569;
      background: #1e293b;
      color: #e2e8f0;
      border-radius: 6px;
      padding: 4px 8px;
      cursor: pointer;
      font: 600 11px system-ui, sans-serif;
    }
    .sdq-layout--tablet .sdq-palette__collapse {
      display: inline-block;
    }
    .sdq-palette__header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    .sdq-palette__header .sdq-palette__title {
      margin-bottom: 0;
    }
  `;
  document.head.appendChild(style);
}

export function applyLayoutForWidth(
  width: number,
  root: HTMLElement = document.documentElement,
): boolean {
  injectResponsiveStyles();
  const tablet = width <= TABLET_MAX_WIDTH;
  root.classList.toggle(LAYOUT_TABLET_CLASS, tablet);
  return tablet;
}

export function startResponsiveLayout(options?: {
  root?: HTMLElement;
  getWidth?: () => number;
}): ResponsiveController {
  const root = options?.root ?? document.documentElement;
  const getWidth = options?.getWidth ?? (() => window.innerWidth);
  let tablet = applyLayoutForWidth(getWidth(), root);
  let paletteCollapsed = false;

  const onResize = (): void => {
    tablet = applyLayoutForWidth(getWidth(), root);
    if (!tablet) {
      setPaletteCollapsed(false);
    }
  };

  const setPaletteCollapsed = (collapsed: boolean): void => {
    paletteCollapsed = collapsed;
    const palette = document.querySelector('.sdq-palette');
    palette?.classList.toggle(PALETTE_COLLAPSED_CLASS, collapsed);
    const btn = document.querySelector(
      '[data-testid="palette-collapse"]',
    ) as HTMLButtonElement | null;
    if (btn) {
      btn.textContent = collapsed ? 'Expandir paleta' : 'Recolher paleta';
      btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    }
  };

  window.addEventListener('resize', onResize);

  return {
    applyWidth(width: number) {
      tablet = applyLayoutForWidth(width, root);
      if (!tablet) {
        setPaletteCollapsed(false);
      }
    },
    isTablet: () => tablet,
    setPaletteCollapsed,
    isPaletteCollapsed: () => paletteCollapsed,
    dispose() {
      window.removeEventListener('resize', onResize);
      root.classList.remove(LAYOUT_TABLET_CLASS);
      setPaletteCollapsed(false);
    },
  };
}
