import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { TIER_1_TYPES } from '@sdq/shared';
import {
  bindComponentTooltip,
  countSentences,
  getComponentTooltip,
  getMetricExplanation,
  resetComponentTooltip,
} from './glossary';
import { mountPalette } from './palette';

describe('glossary helpers', () => {
  it('returns tooltip content with name, description and whenToUse', () => {
    const tooltip = getComponentTooltip('load_balancer');

    expect(tooltip).toEqual({
      name: 'Load Balancer',
      description: expect.stringContaining('Distribui requisições'),
      whenToUse: expect.stringContaining('tráfego'),
    });
  });

  it('keeps component descriptions to at most two sentences for tier-1 catalog', () => {
    for (const type of TIER_1_TYPES) {
      const { description } = getComponentTooltip(type);
      expect(countSentences(description)).toBeLessThanOrEqual(2);
    }
  });

  it('exposes metric explanations for briefing labels', () => {
    expect(getMetricExplanation('DAU')).toMatch(/usuários únicos/i);
    expect(getMetricExplanation('Read RPS (pico)')).toMatch(/RPS/i);
    expect(getMetricExplanation('unknown')).toBeNull();
  });
});

describe('palette component tooltips', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    resetComponentTooltip();
    container = document.createElement('div');
    document.body.append(container);
  });

  afterEach(() => {
    resetComponentTooltip();
    container.remove();
  });

  it('shows tooltip on hover with name, description and when to use', () => {
    mountPalette(container, { tier: 1 });

    const item = container.querySelector('[data-component-type="load_balancer"]') as HTMLElement;
    item.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

    const tooltip = document.querySelector('[data-testid="component-tooltip"]');
    expect(tooltip?.hasAttribute('hidden')).toBe(false);
    expect(document.querySelector('[data-testid="component-tooltip-name"]')?.textContent).toBe(
      'Load Balancer',
    );
    expect(
      document.querySelector('[data-testid="component-tooltip-description"]')?.textContent,
    ).toContain('Distribui requisições');
    expect(document.querySelector('[data-testid="component-tooltip-when"]')?.textContent).toContain(
      'Quando usar',
    );
    expect(item.classList.contains('sdq-palette__item--tooltip-active')).toBe(true);
  });

  it('hides tooltip on mouse leave', () => {
    mountPalette(container, { tier: 1 });

    const item = container.querySelector('[data-component-type="cache_redis"]') as HTMLElement;
    item.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    item.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));

    const tooltip = document.querySelector('[data-testid="component-tooltip"]') as HTMLElement;
    expect(tooltip.hidden).toBe(true);
    expect(item.classList.contains('sdq-palette__item--tooltip-active')).toBe(false);
  });

  it('bindComponentTooltip cleans up listeners', () => {
    const item = document.createElement('div');
    item.tabIndex = 0;
    container.append(item);

    const cleanup = bindComponentTooltip(item, 'app_server');
    item.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    expect(document.querySelector('[data-testid="component-tooltip"]')?.hasAttribute('hidden')).toBe(
      false,
    );

    cleanup();
    item.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    expect(document.querySelector('[data-testid="component-tooltip"]')?.hasAttribute('hidden')).toBe(
      true,
    );
  });
});
