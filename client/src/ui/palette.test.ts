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
  });

  it('renders tier-1 components grouped by palette categories', () => {
    mountPalette(container, { tier: 1 });

    const items = container.querySelectorAll('[data-component-type]');
    expect(items.length).toBe(15);

    const types = [...items].map((el) => el.getAttribute('data-component-type'));
    expect(types).toEqual(expect.arrayContaining([...TIER_1_TYPES]));
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
});
