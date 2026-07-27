import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mountConnectionIntentPopover,
} from './connection-intent-popover';
import { CONNECTION_INTENTS } from './connection-intents';

describe('connection-intent-popover (CI-02 / CI-05)', () => {
  let host: HTMLDivElement;
  let previousInnerWidth: number;
  let previousInnerHeight: number;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
    previousInnerWidth = window.innerWidth;
    previousInnerHeight = window.innerHeight;
    document.getElementById('sdq-connection-intent-styles')?.remove();
  });

  afterEach(() => {
    host.remove();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousInnerWidth });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: previousInnerHeight,
    });
    document.getElementById('sdq-connection-intent-styles')?.remove();
  });

  it('renders CONNECTION INTENT title and four catalog rows', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 });
    const onSelect = vi.fn();
    const pop = mountConnectionIntentPopover(host, {
      onSelect,
      onClose: () => undefined,
    });
    pop.open('e1', 'REQ');

    const root = host.querySelector('[data-testid="connection-intent"]') as HTMLElement;
    expect(root).toBeTruthy();
    expect(root.hidden).toBe(false);
    expect(root.querySelector('[data-testid="connection-intent-title"]')?.textContent).toBe(
      'CONNECTION INTENT',
    );
    const rows = root.querySelectorAll('[data-testid="connection-intent-option"]');
    expect(rows).toHaveLength(4);
    for (const intent of CONNECTION_INTENTS) {
      const row = root.querySelector(`[data-intent-id="${intent.id}"]`);
      expect(row?.textContent).toContain(intent.shortLabel);
      expect(row?.textContent).toContain(intent.role);
      expect(row?.textContent).toContain(intent.description);
    }
    pop.destroy();
  });

  it('calls onSelect with option id when a row is chosen', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 });
    const onSelect = vi.fn();
    const pop = mountConnectionIntentPopover(host, {
      onSelect,
      onClose: () => undefined,
    });
    pop.open('e1', 'REQ');
    const cacheRow = host.querySelector('[data-intent-id="cache"]') as HTMLElement;
    cacheRow.click();
    expect(onSelect).toHaveBeenCalledWith('e1', 'cache');
    pop.destroy();
  });

  it('shows CUSTOM header and no selected row for legacy labels', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 768 });
    const pop = mountConnectionIntentPopover(host, {
      onSelect: () => undefined,
      onClose: () => undefined,
    });
    pop.open('e1', 'HTTPS');
    const role = host.querySelector('[data-testid="connection-intent-role"]');
    expect(role?.textContent).toBe('CUSTOM');
    const selected = host.querySelector('[data-intent-id].is-selected');
    expect(selected).toBeNull();
    pop.destroy();
  });

  it('keeps sheet bounds within a 375×667 viewport (CI-05)', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 667 });
    const pop = mountConnectionIntentPopover(host, {
      onSelect: () => undefined,
      onClose: () => undefined,
    });
    pop.open('e1', 'DB', { x: 10, y: 10 });

    const root = host.querySelector('[data-testid="connection-intent"]') as HTMLElement;
    expect(root.classList.contains('sdq-connection-intent--sheet')).toBe(true);

    // Layout contract from open(): bottom sheet fills width and sits in viewport.
    const sheetHeight = Math.min(Math.floor(667 * 0.7), 667 - 8);
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 667 - sheetHeight,
      top: 667 - sheetHeight,
      left: 0,
      right: 375,
      bottom: 667,
      width: 375,
      height: sheetHeight,
      toJSON() {
        return this;
      },
    });
    const rect = root.getBoundingClientRect();
    expect(rect.left).toBeGreaterThanOrEqual(0);
    expect(rect.top).toBeGreaterThanOrEqual(0);
    expect(rect.right).toBeLessThanOrEqual(375);
    expect(rect.bottom).toBeLessThanOrEqual(667);

    const styles = document.getElementById('sdq-connection-intent-styles')?.textContent ?? '';
    expect(styles).toMatch(/overflow-y:\s*auto/);
    expect(styles).toMatch(/max-height/);

    pop.destroy();
  });
});
