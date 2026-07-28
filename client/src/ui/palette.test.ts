import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { ComponentType } from '@sdq/shared';
import { TIER_1_TYPES } from '@sdq/shared';
import {
  mountPalette,
  PALETTE_DROP_EVENT,
  PALETTE_MIME_TYPE,
  PALETTE_CATEGORY_LABELS,
} from './palette';

/** jsdom lacks DragEvent — minimal event with dataTransfer + coordinates */
function createDragEvent(
  type: string,
  init: { dataTransfer?: DataTransfer; clientX?: number; clientY?: number },
): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', { value: init.dataTransfer ?? null });
  Object.defineProperty(event, 'clientX', { value: init.clientX ?? 0 });
  Object.defineProperty(event, 'clientY', { value: init.clientY ?? 0 });
  return event;
}

/** Minimal DataTransfer mock for jsdom drag/drop tests */
function createDataTransferMock(): DataTransfer {
  const store = new Map<string, string>();
  return {
    dropEffect: 'none',
    effectAllowed: 'none',
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
    types: [] as readonly string[],
    clearData: (format?: string) => {
      if (format) store.delete(format);
      else store.clear();
    },
    getData: (format: string) => store.get(format) ?? '',
    setData: (format: string, value: string) => {
      store.set(format, value);
    },
    setDragImage: () => undefined,
  } as DataTransfer;
}

describe('component palette', () => {
  let container: HTMLDivElement;
  let dropTarget: HTMLCanvasElement;

  beforeEach(() => {
    container = document.createElement('div');
    dropTarget = document.createElement('canvas');
    document.body.append(container, dropTarget);
  });

  afterEach(() => {
    container.remove();
    dropTarget.remove();
    document.documentElement.classList.remove('sdq-palette-is-collapsed');
  });

  it('renders tier-1 components grouped by palette categories', () => {
    mountPalette(container, { tier: 1 });

    const items = container.querySelectorAll('[data-component-type]');
    expect(items.length).toBe(15);

    const types = [...items].map((el) => el.getAttribute('data-component-type'));
    expect(types).toEqual(expect.arrayContaining([...TIER_1_TYPES]));
  });

  it('minimizes and expands the Componentes palette on desktop', () => {
    const palette = mountPalette(container, { tier: 1 });
    const btn = container.querySelector<HTMLButtonElement>('[data-testid="palette-collapse"]');
    expect(btn).toBeTruthy();
    expect(btn?.getAttribute('aria-expanded')).toBe('true');

    btn!.click();
    expect(palette.root.classList.contains('sdq-palette--collapsed')).toBe(true);
    expect(btn?.textContent).toBe('»');
    expect(btn?.getAttribute('aria-expanded')).toBe('false');
    expect(document.documentElement.classList.contains('sdq-palette-is-collapsed')).toBe(true);

    const css = document.getElementById('sdq-palette-styles')?.textContent ?? '';
    expect(css).toMatch(/\.sdq-palette\.sdq-palette--collapsed\s*\{[^}]*width:\s*52px/);

    btn!.click();
    expect(palette.root.classList.contains('sdq-palette--collapsed')).toBe(false);
    expect(btn?.textContent).toBe('«');
    expect(document.documentElement.classList.contains('sdq-palette-is-collapsed')).toBe(false);
  });

  it('shows category headings Client, Edge, Traffic, Compute, Data, Messaging, Observability', () => {
    mountPalette(container, { tier: 1 });

    const headings = [...container.querySelectorAll('[data-palette-category]')].map(
      (el) => el.textContent?.trim(),
    );

    expect(headings).toContain(PALETTE_CATEGORY_LABELS.client);
    expect(headings).toContain(PALETTE_CATEGORY_LABELS.edge);
    expect(headings).toContain(PALETTE_CATEGORY_LABELS.traffic);
    expect(headings).toContain(PALETTE_CATEGORY_LABELS.compute);
    expect(headings).toContain(PALETTE_CATEGORY_LABELS.data);
    expect(headings).toContain(PALETTE_CATEGORY_LABELS.messaging);
    expect(headings).toContain(PALETTE_CATEGORY_LABELS.observability);
  });

  it('marks palette items as draggable with component labels', () => {
    mountPalette(container, { tier: 1 });

    const lb = container.querySelector('[data-component-type="load_balancer"]');
    expect(lb?.getAttribute('draggable')).toBe('true');
    expect(lb?.textContent).toBe('Load Balancer');
  });

  it('dispatches palette:drop with ComponentType when dropped on canvas', () => {
    mountPalette(container, { tier: 1, dropTarget });

    const handler = vi.fn();
    dropTarget.addEventListener(PALETTE_DROP_EVENT, handler);

    const item = container.querySelector('[data-component-type="app_server"]') as HTMLElement;
    const dataTransfer = createDataTransferMock();

    item.dispatchEvent(createDragEvent('dragstart', { dataTransfer }));

    expect(dataTransfer.getData(PALETTE_MIME_TYPE)).toBe('app_server');

    dataTransfer.setData(PALETTE_MIME_TYPE, 'app_server');
    dropTarget.dispatchEvent(
      createDragEvent('drop', {
        dataTransfer,
        clientX: 120,
        clientY: 80,
      }),
    );

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0]?.[0] as CustomEvent<{ type: ComponentType }>;
    expect(event.detail.type).toBe('app_server');
    expect(event.detail.clientX).toBe(120);
    expect(event.detail.clientY).toBe(80);
  });

  it('tap-to-add places a component on phone / coarse pointer', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    const matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('pointer: coarse') || query.includes('hover: none'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    vi.stubGlobal('matchMedia', matchMedia);

    dropTarget.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        width: 400,
        height: 600,
        right: 400,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;

    mountPalette(container, { tier: 1, dropTarget });
    const handler = vi.fn();
    dropTarget.addEventListener(PALETTE_DROP_EVENT, handler);

    const item = container.querySelector('[data-component-type="cache_redis"]') as HTMLElement;
    item.click();

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0]?.[0] as CustomEvent<{
      type: ComponentType;
      source?: string;
    }>;
    expect(event.detail.type).toBe('cache_redis');
    expect(event.detail.source).toBe('tap');
    expect(container.querySelector('.sdq-palette')?.classList.contains('sdq-palette--collapsed')).toBe(
      true,
    );

    vi.unstubAllGlobals();
  });

  it('opens drawer via FAB and closes on backdrop on phone', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    document.documentElement.classList.add('sdq-layout--phone');

    const handle = mountPalette(container, { tier: 1, dropTarget });
    expect(handle.isOpen()).toBe(false);
    expect(container.querySelector('[data-testid="palette-fab"]')).toBeTruthy();

    handle.fab.click();
    expect(handle.isOpen()).toBe(true);
    expect(document.documentElement.classList.contains('sdq-palette-is-collapsed')).toBe(false);

    const backdrop = container.querySelector('[data-testid="palette-backdrop"]') as HTMLElement;
    backdrop.click();
    expect(handle.isOpen()).toBe(false);

    document.documentElement.classList.remove('sdq-layout--phone');
    vi.unstubAllGlobals();
  });
});
