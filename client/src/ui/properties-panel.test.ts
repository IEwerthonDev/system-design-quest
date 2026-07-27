import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountPropertiesPanel, resolvePanelMode } from './properties-panel';

describe('properties panel', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
  });

  afterEach(() => {
    container.remove();
    document.getElementById('sdq-properties-styles')?.remove();
  });

  it('keeps component mode behavior for label note and delete', () => {
    const onLabelChange = vi.fn();
    const onNoteChange = vi.fn();
    const onDelete = vi.fn();
    const panel = mountPropertiesPanel(container, {
      onLabelChange,
      onNoteChange,
      onDelete,
    });

    panel.sync({
      mode: 'component',
      visible: true,
      componentId: 'comp-1',
      label: 'API',
      note: 'gateway',
    });

    expect(panel.root.classList.contains('sdq-properties--visible')).toBe(true);
    expect(panel.root.getAttribute('data-mode')).toBe('component');
    expect(
      container.querySelector<HTMLElement>('[data-testid="prop-component-section"]')?.hidden,
    ).toBe(false);
    expect(
      container.querySelector<HTMLElement>('[data-testid="prop-edge-section"]')?.hidden,
    ).toBe(true);
    expect(container.querySelector<HTMLInputElement>('[data-testid="prop-label"]')?.value).toBe(
      'API',
    );
    expect(container.querySelector<HTMLTextAreaElement>('[data-testid="prop-note"]')?.value).toBe(
      'gateway',
    );

    const label = container.querySelector<HTMLInputElement>('[data-testid="prop-label"]')!;
    label.value = 'API Gateway';
    label.dispatchEvent(new Event('input', { bubbles: true }));
    expect(onLabelChange).toHaveBeenCalledWith('comp-1', 'API Gateway');

    container.querySelector<HTMLButtonElement>('[data-testid="prop-delete"]')!.click();
    expect(onDelete).toHaveBeenCalledWith('comp-1');
  });

  it('supports edge mode with delete invert and bidirectional callbacks', () => {
    const onEdgeDelete = vi.fn();
    const onEdgeInvert = vi.fn();
    const onEdgeDirectionChange = vi.fn();
    const panel = mountPropertiesPanel(container, {
      onLabelChange: vi.fn(),
      onNoteChange: vi.fn(),
      onDelete: vi.fn(),
      onEdgeDelete,
      onEdgeInvert,
      onEdgeDirectionChange,
    });

    panel.sync({
      mode: 'edge',
      visible: true,
      componentId: null,
      label: '',
      note: '',
      edgeId: 'edge-1',
      edgeDirection: 'forward',
    });

    expect(panel.root.getAttribute('data-mode')).toBe('edge');
    expect(
      container.querySelector<HTMLElement>('[data-testid="prop-component-section"]')?.hidden,
    ).toBe(true);
    expect(
      container.querySelector<HTMLElement>('[data-testid="prop-edge-section"]')?.hidden,
    ).toBe(false);

    container.querySelector<HTMLButtonElement>('[data-testid="prop-edge-invert"]')!.click();
    expect(onEdgeInvert).toHaveBeenCalledWith('edge-1');

    container.querySelector<HTMLButtonElement>('[data-testid="prop-edge-delete"]')!.click();
    expect(onEdgeDelete).toHaveBeenCalledWith('edge-1');

    container
      .querySelector<HTMLButtonElement>('[data-testid="prop-edge-bidirectional"]')!
      .click();
    expect(onEdgeDirectionChange).toHaveBeenCalledWith('edge-1', 'bidirectional');

    panel.sync({
      mode: 'edge',
      visible: true,
      componentId: null,
      label: '',
      note: '',
      edgeId: 'edge-1',
      edgeDirection: 'bidirectional',
    });

    const toggle = container.querySelector<HTMLButtonElement>(
      '[data-testid="prop-edge-bidirectional"]',
    )!;
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    toggle.click();
    expect(onEdgeDirectionChange).toHaveBeenCalledWith('edge-1', 'forward');
  });

  it('hides panel in hidden mode and resolves legacy visible without mode', () => {
    const panel = mountPropertiesPanel(container, {
      onLabelChange: vi.fn(),
      onNoteChange: vi.fn(),
      onDelete: vi.fn(),
    });

    panel.sync({
      mode: 'hidden',
      visible: false,
      componentId: null,
      label: '',
      note: '',
    });
    expect(panel.root.classList.contains('sdq-properties--visible')).toBe(false);
    expect(panel.root.getAttribute('data-mode')).toBe('hidden');

    expect(resolvePanelMode({ visible: true, componentId: 'c', label: '', note: '' })).toBe(
      'component',
    );
    expect(resolvePanelMode({ visible: false, componentId: null, label: '', note: '' })).toBe(
      'hidden',
    );
  });
});
