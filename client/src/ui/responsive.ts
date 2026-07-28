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

    /* Phone: left overlay drawer (Playground-style) */
    .sdq-palette-fab,
    .sdq-palette-backdrop {
      display: none;
    }
    .sdq-layout--phone .sdq-palette-fab {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      position: fixed;
      top: auto;
      left: 12px;
      bottom: calc(16px + env(safe-area-inset-bottom, 0px));
      z-index: 19;
      min-height: 48px;
      padding: 12px 16px;
      border-radius: var(--sdq-radius, 10px);
      border: 1px solid var(--sdq-accent-border, rgba(201,169,98,0.35));
      background: var(--sdq-bg-elevated, #141416);
      color: var(--sdq-accent, #c9a962);
      font: 600 11px var(--sdq-font-mono, monospace);
      letter-spacing: 0.06em;
      cursor: pointer;
      touch-action: manipulation;
      box-shadow: var(--sdq-shadow);
    }
    .sdq-layout--phone .sdq-palette-fab::before {
      content: "▦";
      font-size: 14px;
    }
    html.sdq-layout--phone:not(.sdq-palette-is-collapsed) .sdq-palette-fab {
      display: none;
    }
    .sdq-layout--phone .sdq-palette-backdrop {
      position: fixed;
      inset: 0;
      z-index: 21;
      background: rgba(2, 8, 23, 0.55);
      backdrop-filter: blur(2px);
    }
    html.sdq-layout--phone:not(.sdq-palette-is-collapsed) .sdq-palette-backdrop {
      display: block;
    }
    .sdq-layout--phone .sdq-palette {
      top: 0;
      bottom: 0;
      left: 0;
      right: auto;
      width: min(340px, 92vw) !important;
      height: 100% !important;
      max-height: none !important;
      padding: calc(12px + env(safe-area-inset-top, 0px)) 12px calc(16px + env(safe-area-inset-bottom, 0px));
      border-right: 1px solid var(--sdq-border);
      border-top: none;
      border-bottom: none;
      z-index: 22;
      background: var(--sdq-bg-elevated);
      backdrop-filter: blur(12px);
      box-shadow: var(--sdq-shadow);
      transform: translateX(-105%);
      transition: transform 0.22s ease, visibility 0.22s ease;
      overflow-y: auto;
    }
    .sdq-layout--phone .sdq-palette:not(.sdq-palette--collapsed) {
      transform: translateX(0);
      visibility: visible;
    }
    .sdq-layout--phone .sdq-palette.sdq-palette--collapsed {
      pointer-events: none;
      visibility: hidden;
    }
    .sdq-layout--phone .sdq-palette.sdq-palette--collapsed .sdq-palette__section,
    .sdq-layout--phone .sdq-palette.sdq-palette--collapsed .sdq-palette__hint {
      display: none;
    }
    .sdq-layout--phone .sdq-palette:not(.sdq-palette--collapsed) {
      pointer-events: auto;
    }
    .sdq-layout--phone .sdq-palette__header {
      margin-bottom: 8px;
    }
    .sdq-layout--phone .sdq-palette__title::after {
      content: none;
    }
    .sdq-layout--phone .sdq-palette__hint {
      display: block;
      font-size: 12px;
      color: #64748b;
      margin-bottom: 12px;
      line-height: 1.4;
    }
    .sdq-layout--phone .sdq-palette__collapse {
      min-width: 44px;
      min-height: 44px;
      padding: 8px 12px;
      font-size: 16px;
    }
    .sdq-layout--phone .sdq-palette__list {
      flex-direction: column;
      gap: 6px;
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
      margin-bottom: 12px;
    }

    /* Phone: compact header card + sim panel (sim styles in sim-controls.css @media) */
    .sdq-layout--phone .sdq-session-header {
      left: 0 !important;
      right: 0;
      top: 0;
      height: auto;
      min-height: 0;
      padding: calc(6px + env(safe-area-inset-top, 0px)) 10px 8px;
      flex-direction: column;
      align-items: stretch;
      gap: 6px;
      background: transparent;
      pointer-events: none;
    }
    .sdq-layout--phone .sdq-session-header__row {
      display: flex;
      align-items: center;
      gap: 8px;
      pointer-events: auto;
      padding: 10px 12px;
      border-radius: var(--sdq-radius, 10px);
      background: var(--sdq-bg-elevated);
      border: 1px solid var(--sdq-border);
      box-shadow: var(--sdq-shadow);
    }
    .sdq-layout--phone .sdq-session-header__brand-sub {
      display: none;
    }
    .sdq-layout--phone .sdq-session-header__brand {
      flex: 1;
      min-width: 0;
      overflow: hidden;
    }
    .sdq-layout--phone .sdq-session-header__brand strong {
      font-size: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: block;
    }
    .sdq-layout--phone .sdq-session-header__controls {
      flex: none;
      width: 100%;
      order: 0;
      justify-content: stretch;
      pointer-events: auto;
    }
    .sdq-layout--phone .sdq-blueprint-zoom {
      left: auto;
      right: 12px;
      bottom: calc(72px + env(safe-area-inset-bottom, 0px));
    }
    .sdq-layout--phone .sdq-blueprint-zoom button {
      width: 44px;
      height: 44px;
      font-size: 18px;
    }
    .sdq-layout--phone .sdq-blueprint-link-hint {
      top: calc(200px + env(safe-area-inset-top, 0px));
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

    /* Phone: full-screen phase panels */
    .sdq-layout--phone .sdq-briefing,
    .sdq-layout--phone .sdq-requirements {
      padding: max(12px, env(safe-area-inset-top)) 12px calc(16px + env(safe-area-inset-bottom));
      align-items: flex-start;
    }
    .sdq-layout--phone .sdq-briefing__card,
    .sdq-layout--phone .sdq-requirements__card {
      width: 100%;
      max-height: none;
      margin-top: 48px;
    }
    .sdq-layout--phone .sdq-phase-back {
      position: fixed;
      top: max(10px, env(safe-area-inset-top));
      left: 10px;
      z-index: 30;
    }
    .sdq-layout--phone .sdq-phase-back--in-header {
      position: static;
    }
    .sdq-layout--phone .sdq-submit-panel {
      left: 12px !important;
      right: 12px !important;
      bottom: calc(72px + env(safe-area-inset-bottom, 0px)) !important;
      width: auto !important;
    }
  `;
  document.head.appendChild(style);
}

export function syncPaletteCollapseButton(collapsed: boolean, phoneMode: boolean): void {
  const btn = document.querySelector(
    '[data-testid="palette-collapse"]',
  ) as HTMLButtonElement | null;
  if (!btn) {
    return;
  }
  btn.textContent = collapsed ? (phoneMode ? '✕' : '»') : phoneMode ? '✕' : '«';
  btn.title = collapsed ? 'Fechar' : phoneMode ? 'Fechar' : 'Minimizar';
  btn.setAttribute(
    'aria-label',
    collapsed || phoneMode ? 'Fechar componentes' : 'Minimizar componentes',
  );
  btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
}

export function applyPaletteCollapsed(collapsed: boolean, phoneMode?: boolean): void {
  const phone =
    phoneMode ??
    document.documentElement.classList.contains(LAYOUT_PHONE_CLASS);
  const palette = document.querySelector('.sdq-palette');
  palette?.classList.toggle(PALETTE_COLLAPSED_CLASS, collapsed);
  document.documentElement.classList.toggle('sdq-palette-is-collapsed', collapsed);
  syncPaletteCollapseButton(collapsed, phone);
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
    applyPaletteCollapsed(collapsed, getWidth() <= PHONE_MAX_WIDTH);
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
