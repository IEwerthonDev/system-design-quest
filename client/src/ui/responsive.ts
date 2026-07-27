export const TABLET_MAX_WIDTH = 1024;
export const PHONE_MAX_WIDTH = 768;
export const LAYOUT_TABLET_CLASS = 'sdq-layout--tablet';
export const LAYOUT_PHONE_CLASS = 'sdq-layout--phone';
export const PALETTE_COLLAPSED_CLASS = 'sdq-palette--collapsed';

export interface ResponsiveController {
  applyWidth(width: number): void;
  isTablet(): boolean;
  isPhone(): boolean;
  setPaletteCollapsed(collapsed: boolean): void;
  isPaletteCollapsed(): boolean;
  dispose(): void;
}

export function isCoarsePointer(
  matchMediaFn: (query: string) => MediaQueryList = (q) => window.matchMedia(q),
): boolean {
  try {
    return matchMediaFn('(pointer: coarse)').matches || matchMediaFn('(hover: none)').matches;
  } catch {
    return false;
  }
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
      width: 100%;
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

    /* Phone: bottom thumb-zone dock */
    .sdq-layout--phone .sdq-palette {
      top: auto;
      bottom: 0;
      left: 0;
      right: 0;
      width: 100%;
      height: auto;
      max-height: min(42vh, 320px);
      border-right: none;
      border-bottom: none;
      border-top: 1px solid rgba(148, 163, 184, 0.35);
      padding: 8px 12px calc(12px + env(safe-area-inset-bottom, 0px));
      z-index: 22;
      background: rgba(10, 22, 40, 0.96);
      backdrop-filter: blur(10px);
      box-shadow: 0 -8px 28px rgba(0, 0, 0, 0.35);
    }
    .sdq-layout--phone .sdq-palette.sdq-palette--collapsed {
      max-height: none;
      height: calc(52px + env(safe-area-inset-bottom, 0px));
      overflow: hidden;
      padding-bottom: env(safe-area-inset-bottom, 0px);
    }
    .sdq-layout--phone .sdq-palette.sdq-palette--collapsed .sdq-palette__section {
      display: none;
    }
    .sdq-layout--phone .sdq-palette__header {
      margin-bottom: 8px;
    }
    .sdq-layout--phone .sdq-palette__hint {
      display: block;
    }
    .sdq-layout--phone .sdq-palette__title::after {
      content: " · toque para adicionar";
      font-weight: 500;
      letter-spacing: 0;
      text-transform: none;
      color: #64748b;
    }
    .sdq-layout--phone .sdq-palette__collapse {
      min-width: 44px;
      min-height: 44px;
      padding: 8px 12px;
      font-size: 14px;
    }
    .sdq-layout--phone .sdq-palette__list {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 8px;
    }
    .sdq-layout--phone .sdq-palette__item {
      min-height: 44px;
      padding: 10px 12px;
      font-size: 13px;
      display: flex;
      align-items: center;
      cursor: pointer;
      touch-action: manipulation;
    }
    .sdq-layout--phone .sdq-palette__section {
      margin-bottom: 10px;
    }
    .sdq-layout--phone .sdq-session-header {
      left: 0 !important;
      right: 0;
      height: auto;
      min-height: 52px;
      padding: 8px 10px;
      flex-wrap: wrap;
      gap: 8px;
      background: linear-gradient(180deg, rgba(10,25,48,0.95), rgba(10,25,48,0.55) 70%, transparent);
    }
    .sdq-layout--phone .sdq-session-header__controls {
      flex: 1 1 100%;
      order: 3;
      justify-content: stretch;
    }
    .sdq-layout--phone .sdq-sim-controls {
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-start;
    }
    .sdq-layout--phone .sdq-sim-controls__start {
      min-height: 44px;
      min-width: 72px;
    }
    .sdq-layout--phone .sdq-blueprint-zoom {
      left: auto;
      right: 12px;
      bottom: calc(64px + env(safe-area-inset-bottom, 0px));
    }
    html.sdq-layout--phone.sdq-palette-is-collapsed .sdq-blueprint-zoom {
      bottom: calc(68px + env(safe-area-inset-bottom, 0px));
    }
    html.sdq-layout--phone:not(.sdq-palette-is-collapsed) .sdq-blueprint-zoom {
      bottom: calc(min(42vh, 320px) + 12px);
    }
    .sdq-layout--phone .sdq-blueprint-zoom button {
      width: 44px;
      height: 44px;
      font-size: 18px;
    }
    .sdq-layout--phone .sdq-node__handle {
      width: 18px;
      height: 18px;
    }
    .sdq-layout--phone .sdq-node__handle--in { left: -10px; }
    .sdq-layout--phone .sdq-node__handle--out { right: -10px; }
    .sdq-layout--phone .sdq-node__handle::after {
      content: "";
      position: absolute;
      inset: -14px;
    }
    .sdq-layout--phone .sdq-node__rep-btn {
      width: 36px;
      height: 36px;
      font-size: 16px;
    }
    .sdq-layout--phone .sdq-node__delete {
      display: inline-flex !important;
    }
  `;
  document.head.appendChild(style);
}

function syncCollapseButton(collapsed: boolean, phoneMode: boolean): void {
  const btn = document.querySelector(
    '[data-testid="palette-collapse"]',
  ) as HTMLButtonElement | null;
  if (!btn) {
    return;
  }
  btn.textContent = collapsed ? (phoneMode ? '▲' : '»') : phoneMode ? '▼' : '«';
  btn.title = collapsed ? 'Expandir' : 'Minimizar';
  btn.setAttribute(
    'aria-label',
    collapsed ? 'Expandir componentes' : 'Minimizar componentes',
  );
  btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
}

export function applyLayoutForWidth(
  width: number,
  root: HTMLElement = document.documentElement,
): boolean {
  injectResponsiveStyles();
  const tablet = width <= TABLET_MAX_WIDTH;
  const phone = width <= PHONE_MAX_WIDTH;
  root.classList.toggle(LAYOUT_TABLET_CLASS, tablet);
  root.classList.toggle(LAYOUT_PHONE_CLASS, phone);
  return tablet;
}

export function startResponsiveLayout(options?: {
  root?: HTMLElement;
  getWidth?: () => number;
}): ResponsiveController {
  const root = options?.root ?? document.documentElement;
  const getWidth = options?.getWidth ?? (() => window.innerWidth);
  let tablet = applyLayoutForWidth(getWidth(), root);
  let phone = getWidth() <= PHONE_MAX_WIDTH;
  let paletteCollapsed = false;
  let didInitPhoneCollapse = false;

  const setPaletteCollapsed = (collapsed: boolean): void => {
    paletteCollapsed = collapsed;
    const palette = document.querySelector('.sdq-palette');
    palette?.classList.toggle(PALETTE_COLLAPSED_CLASS, collapsed);
    document.documentElement.classList.toggle('sdq-palette-is-collapsed', collapsed);
    syncCollapseButton(collapsed, getWidth() <= PHONE_MAX_WIDTH);
  };

  const maybeCollapsePhonePalette = (): void => {
    phone = getWidth() <= PHONE_MAX_WIDTH;
    if (phone && !didInitPhoneCollapse) {
      didInitPhoneCollapse = true;
      setPaletteCollapsed(true);
    }
    if (!phone) {
      didInitPhoneCollapse = false;
    }
  };

  const onResize = (): void => {
    tablet = applyLayoutForWidth(getWidth(), root);
    phone = getWidth() <= PHONE_MAX_WIDTH;
    if (!tablet) {
      setPaletteCollapsed(false);
      didInitPhoneCollapse = false;
    } else {
      maybeCollapsePhonePalette();
    }
  };

  window.addEventListener('resize', onResize);
  maybeCollapsePhonePalette();

  return {
    applyWidth(width: number) {
      tablet = applyLayoutForWidth(width, root);
      phone = width <= PHONE_MAX_WIDTH;
      if (!tablet) {
        setPaletteCollapsed(false);
        didInitPhoneCollapse = false;
      } else {
        maybeCollapsePhonePalette();
      }
    },
    isTablet: () => tablet,
    isPhone: () => phone,
    setPaletteCollapsed,
    isPaletteCollapsed: () => paletteCollapsed,
    dispose() {
      window.removeEventListener('resize', onResize);
      root.classList.remove(LAYOUT_TABLET_CLASS, LAYOUT_PHONE_CLASS);
      setPaletteCollapsed(false);
      document.documentElement.classList.remove('sdq-palette-is-collapsed');
    },
  };
}
