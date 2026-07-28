import {
  getComponentsByCategory,
  type CatalogTier,
  type ComponentCategory,
  type ComponentType,
} from '@sdq/shared';
import { bindComponentTooltip } from './glossary';
import {
  applyPaletteCollapsed,
  isCoarsePointer,
  PHONE_MAX_WIDTH,
} from './responsive';

export const PALETTE_DROP_EVENT = 'palette:drop';
export const PALETTE_MIME_TYPE = 'application/x-sdq-component';

export const PALETTE_CATEGORY_ORDER: readonly ComponentCategory[] = [
  'client',
  'edge',
  'traffic',
  'compute',
  'data',
  'messaging',
  'observability',
  'security',
];

export const PALETTE_CATEGORY_LABELS: Record<ComponentCategory, string> = {
  client: 'Client',
  edge: 'Edge',
  traffic: 'Traffic',
  compute: 'Compute',
  data: 'Data',
  messaging: 'Messaging',
  observability: 'Observability',
  security: 'Security',
};

const CATEGORY_COLORS: Record<ComponentCategory, string> = {
  client: '#60A5FA',
  edge: '#34D399',
  traffic: '#FBBF24',
  compute: '#A78BFA',
  data: '#F87171',
  messaging: '#FB923C',
  observability: '#94A3B8',
  security: '#E879F9',
};

export interface PaletteDropDetail {
  type: ComponentType;
  clientX: number;
  clientY: number;
  /** Tap/click place (mobile) vs HTML5 drag drop */
  source?: 'drag' | 'tap';
}

export interface MountPaletteOptions {
  tier?: CatalogTier;
  dropTarget?: HTMLElement;
  /** Called after a tap-to-add so chrome can collapse the phone drawer. */
  onTapPlace?: (type: ComponentType) => void;
}

export interface PaletteHandle {
  root: HTMLElement;
  fab: HTMLButtonElement;
  backdrop: HTMLElement;
  open(): void;
  close(): void;
  toggle(): void;
  isOpen(): boolean;
  setVisible(visible: boolean): void;
}

export function resolvePaletteDropTarget(explicit?: HTMLElement): HTMLElement | null {
  if (explicit) {
    return explicit;
  }
  return document.querySelector<HTMLElement>('[data-testid="blueprint-canvas"]');
}

export function dispatchPalettePlace(
  dropTarget: HTMLElement,
  type: ComponentType,
  clientX: number,
  clientY: number,
  source: 'drag' | 'tap' = 'tap',
): void {
  dropTarget.dispatchEvent(
    new CustomEvent<PaletteDropDetail>(PALETTE_DROP_EVENT, {
      detail: { type, clientX, clientY, source },
      bubbles: true,
    }),
  );
}

function centerOf(el: HTMLElement): { clientX: number; clientY: number } {
  const rect = el.getBoundingClientRect();
  return {
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
  };
}

function injectPaletteStyles(root: HTMLElement): void {
  if (document.getElementById('sdq-palette-styles')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'sdq-palette-styles';
  style.textContent = `
    .sdq-palette {
      position: fixed;
      top: 0;
      left: 0;
      width: 220px;
      height: 100%;
      overflow-y: auto;
      background: var(--sdq-bg-elevated, #141416);
      border-right: 1px solid var(--sdq-border, rgba(255,255,255,0.08));
      color: var(--sdq-text, #f4f4f5);
      font-family: var(--sdq-font, system-ui, sans-serif);
      font-size: 13px;
      z-index: 10;
      padding: 12px 10px 24px;
      transition: width 0.18s ease;
    }
    .sdq-palette__header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    .sdq-palette__title {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 0;
      flex: 1;
      min-width: 0;
    }
    .sdq-palette__collapse {
      flex-shrink: 0;
      border: 1px solid #475569;
      background: #1e293b;
      color: #e2e8f0;
      border-radius: 6px;
      padding: 4px 8px;
      cursor: pointer;
      font: 600 11px system-ui, sans-serif;
    }
    .sdq-palette__collapse:hover {
      background: #334155;
    }
    .sdq-palette__section {
      margin-bottom: 14px;
    }
    .sdq-palette__category {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .sdq-palette__list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .sdq-palette__item {
      padding: 6px 8px;
      border-radius: 6px;
      border: 1px solid rgba(148, 163, 184, 0.15);
      background: rgba(30, 41, 59, 0.6);
      cursor: grab;
      user-select: none;
      -webkit-user-select: none;
      touch-action: manipulation;
    }
    .sdq-palette__item:active {
      cursor: grabbing;
      transform: scale(0.97);
      transition: transform 0.12s ease;
    }
    .sdq-palette__hint {
      display: none;
      font-size: 11px;
      color: #64748b;
      margin: -4px 0 10px;
      line-height: 1.35;
    }
    /* Desktop minimize: slim rail with toggle only */
    .sdq-palette.sdq-palette--collapsed {
      width: 52px;
      padding: 12px 6px;
      overflow: hidden;
    }
    .sdq-palette.sdq-palette--collapsed .sdq-palette__section {
      display: none;
    }
    .sdq-palette.sdq-palette--collapsed .sdq-palette__title {
      display: none;
    }
    .sdq-palette.sdq-palette--collapsed .sdq-palette__header {
      margin-bottom: 0;
      justify-content: center;
    }
    .sdq-palette.sdq-palette--collapsed .sdq-palette__collapse {
      padding: 6px 8px;
      width: 100%;
    }
  `;
  root.append(style);
}

function readComponentType(dataTransfer: DataTransfer): ComponentType | null {
  const raw =
    dataTransfer.getData(PALETTE_MIME_TYPE) || dataTransfer.getData('text/plain');
  return raw ? (raw as ComponentType) : null;
}

function attachDropTarget(dropTarget: HTMLElement): () => void {
  const onDragOver = (event: DragEvent) => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    if (!event.dataTransfer) {
      return;
    }

    const type = readComponentType(event.dataTransfer);
    if (!type) {
      return;
    }

    dispatchPalettePlace(dropTarget, type, event.clientX, event.clientY, 'drag');
  };

  dropTarget.addEventListener('dragover', onDragOver);
  dropTarget.addEventListener('drop', onDrop);

  return () => {
    dropTarget.removeEventListener('dragover', onDragOver);
    dropTarget.removeEventListener('drop', onDrop);
  };
}

function isPhoneLayout(): boolean {
  return typeof window !== 'undefined' && window.innerWidth <= PHONE_MAX_WIDTH;
}

export function mountPalette(
  container: HTMLElement,
  options: MountPaletteOptions = {},
): PaletteHandle {
  const tier = options.tier ?? 1;
  const grouped = getComponentsByCategory(tier);

  injectPaletteStyles(document.head);

  const backdrop = document.createElement('div');
  backdrop.className = 'sdq-palette-backdrop';
  backdrop.setAttribute('data-testid', 'palette-backdrop');

  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'sdq-palette-fab';
  fab.setAttribute('data-testid', 'palette-fab');
  fab.textContent = 'COMPONENTES';
  fab.setAttribute('aria-label', 'Abrir componentes');

  const palette = document.createElement('aside');
  palette.className = 'sdq-palette';
  palette.setAttribute('data-testid', 'component-palette');

  const closeDrawer = (): void => {
    applyPaletteCollapsed(true, isPhoneLayout());
  };

  const openDrawer = (): void => {
    applyPaletteCollapsed(false, isPhoneLayout());
  };

  const toggleDrawer = (): void => {
    if (palette.classList.contains('sdq-palette--collapsed')) {
      openDrawer();
    } else {
      closeDrawer();
    }
  };

  backdrop.addEventListener('click', closeDrawer);
  fab.addEventListener('click', openDrawer);

  const header = document.createElement('div');
  header.className = 'sdq-palette__header';

  const title = document.createElement('div');
  title.className = 'sdq-palette__title';
  title.textContent = 'Componentes';

  const collapseBtn = document.createElement('button');
  collapseBtn.type = 'button';
  collapseBtn.className = 'sdq-palette__collapse';
  collapseBtn.setAttribute('data-testid', 'palette-collapse');
  collapseBtn.setAttribute('aria-expanded', 'true');
  collapseBtn.setAttribute('aria-label', 'Minimizar componentes');
  collapseBtn.title = 'Minimizar';
  collapseBtn.textContent = '«';
  collapseBtn.addEventListener('click', () => {
    if (isPhoneLayout()) {
      closeDrawer();
      return;
    }
    const collapsed = !palette.classList.contains('sdq-palette--collapsed');
    applyPaletteCollapsed(collapsed, false);
  });

  header.append(title, collapseBtn);
  palette.append(header);

  const hint = document.createElement('p');
  hint.className = 'sdq-palette__hint';
  hint.setAttribute('data-testid', 'palette-tap-hint');
  hint.textContent = 'Toque em um componente para colocá-lo no canvas. Arraste os cards e use o ponto ○→ para ligar.';
  palette.append(hint);
  if (typeof window !== 'undefined' && window.innerWidth <= PHONE_MAX_WIDTH) {
    hint.style.display = 'block';
  }

  let suppressClickUntil = 0;

  for (const category of PALETTE_CATEGORY_ORDER) {
    const components = grouped.get(category);
    if (!components?.length) {
      continue;
    }

    const section = document.createElement('section');
    section.className = 'sdq-palette__section';
    section.setAttribute('data-category', category);

    const heading = document.createElement('h3');
    heading.className = 'sdq-palette__category';
    heading.setAttribute('data-palette-category', category);
    heading.textContent = PALETTE_CATEGORY_LABELS[category];
    heading.style.color = CATEGORY_COLORS[category];
    section.append(heading);

    const list = document.createElement('ul');
    list.className = 'sdq-palette__list';

    for (const meta of components) {
      const item = document.createElement('li');
      item.className = 'sdq-palette__item';
      item.draggable = true;
      item.setAttribute('data-component-type', meta.type);
      item.textContent = meta.label;
      item.style.borderLeftColor = CATEGORY_COLORS[category];
      item.style.borderLeftWidth = '3px';

      item.addEventListener('dragstart', (event: DragEvent) => {
        if (!event.dataTransfer) {
          return;
        }
        suppressClickUntil = Date.now() + 500;
        event.dataTransfer.setData(PALETTE_MIME_TYPE, meta.type);
        // Some browsers only expose text/* during drop — keep a plain fallback.
        event.dataTransfer.setData('text/plain', meta.type);
        event.dataTransfer.effectAllowed = 'copy';
      });

      item.addEventListener('click', () => {
        if (Date.now() < suppressClickUntil) {
          return;
        }
        const coarse = isCoarsePointer();
        const phone = window.innerWidth <= PHONE_MAX_WIDTH;
        // HTML5 DnD is unreliable on touch — tap-to-add is the mobile path.
        if (!coarse && !phone) {
          return;
        }
        const target = resolvePaletteDropTarget(options.dropTarget);
        if (!target) {
          return;
        }
        const point = centerOf(target);
        dispatchPalettePlace(target, meta.type, point.clientX, point.clientY, 'tap');
        options.onTapPlace?.(meta.type);
        closeDrawer();
      });

      // Desktop keeps hover glossary; touch devices skip sticky tooltips on tap-add.
      if (!isCoarsePointer()) {
        bindComponentTooltip(item, meta.type);
      }

      list.append(item);
    }

    section.append(list);
    palette.append(section);
  }

  container.append(backdrop, fab, palette);

  if (options.dropTarget) {
    attachDropTarget(options.dropTarget);
  }

  if (isPhoneLayout()) {
    closeDrawer();
  }

  return {
    root: palette,
    fab,
    backdrop,
    open: openDrawer,
    close: closeDrawer,
    toggle: toggleDrawer,
    isOpen: () => !palette.classList.contains('sdq-palette--collapsed'),
    setVisible(visible: boolean) {
      palette.hidden = !visible;
      fab.hidden = !visible;
      backdrop.hidden = !visible;
      if (!visible) {
        closeDrawer();
      }
    },
  };
}
