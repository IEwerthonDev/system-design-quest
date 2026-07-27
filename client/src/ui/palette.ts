import {
  getComponentsByCategory,
  type CatalogTier,
  type ComponentCategory,
  type ComponentType,
} from '@sdq/shared';

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
}

export interface MountPaletteOptions {
  tier?: CatalogTier;
  dropTarget?: HTMLElement;
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
      background: rgba(15, 20, 25, 0.92);
      border-right: 1px solid rgba(148, 163, 184, 0.2);
      color: #e2e8f0;
      font-family: system-ui, sans-serif;
      font-size: 13px;
      z-index: 10;
      padding: 12px 10px 24px;
    }
    .sdq-palette__title {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 12px;
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
    }
    .sdq-palette__item:active {
      cursor: grabbing;
    }
  `;
  root.append(style);
}

function readComponentType(dataTransfer: DataTransfer): ComponentType | null {
  const raw = dataTransfer.getData(PALETTE_MIME_TYPE);
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

    dropTarget.dispatchEvent(
      new CustomEvent<PaletteDropDetail>(PALETTE_DROP_EVENT, {
        detail: {
          type,
          clientX: event.clientX,
          clientY: event.clientY,
        },
        bubbles: true,
      }),
    );
  };

  dropTarget.addEventListener('dragover', onDragOver);
  dropTarget.addEventListener('drop', onDrop);

  return () => {
    dropTarget.removeEventListener('dragover', onDragOver);
    dropTarget.removeEventListener('drop', onDrop);
  };
}

export function mountPalette(
  container: HTMLElement,
  options: MountPaletteOptions = {},
): HTMLElement {
  const tier = options.tier ?? 1;
  const grouped = getComponentsByCategory(tier);

  injectPaletteStyles(document.head);

  const palette = document.createElement('aside');
  palette.className = 'sdq-palette';
  palette.setAttribute('data-testid', 'component-palette');

  const title = document.createElement('div');
  title.className = 'sdq-palette__title';
  title.textContent = 'Componentes';
  palette.append(title);

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
        event.dataTransfer.setData(PALETTE_MIME_TYPE, meta.type);
        event.dataTransfer.effectAllowed = 'copy';
      });

      list.append(item);
    }

    section.append(list);
    palette.append(section);
  }

  container.append(palette);

  if (options.dropTarget) {
    attachDropTarget(options.dropTarget);
  }

  return palette;
}
