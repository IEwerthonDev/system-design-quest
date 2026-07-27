import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { URL_SHORTENER } from '@sdq/shared';
import { advancePhase, createSession, getSession, resetSessionStore } from '../session/session-store';
import {
  buildMetricEntries,
  DIFFICULTY_LABELS,
  formatCompactNumber,
  mountBriefingPanel,
} from './briefing-panel';

describe('briefing panel', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    resetSessionStore();
    container = document.createElement('div');
    document.body.append(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('formatCompactNumber abbreviates large scale values', () => {
    expect(formatCompactNumber(1_000)).toBe('1k');
    expect(formatCompactNumber(1_000_000)).toBe('1M');
    expect(formatCompactNumber(100_000_000)).toBe('100M');
  });

  it('buildMetricEntries includes DAU, read/write RPS, ratio, and storage', () => {
    const entries = buildMetricEntries(URL_SHORTENER.metrics);
    const labels = entries.map((entry) => entry.label);

    expect(labels).toEqual(
      expect.arrayContaining(['DAU', 'Read RPS (pico)', 'Write RPS (pico)', 'Read/Write', 'Storage']),
    );
    expect(entries.find((entry) => entry.label === 'DAU')?.value).toBe('100M');
  });

  it('renders title, narrative, metrics, tags, and Easy badge for URL Shortener', () => {
    const panel = mountBriefingPanel(container, { onStart: () => undefined });
    panel.render(URL_SHORTENER);

    expect(container.querySelector('[data-testid="briefing-title"]')?.textContent).toBe(
      'Encurtador de URL',
    );
    expect(container.querySelector('[data-testid="briefing-description"]')?.textContent).toContain(
      'Bit.ly',
    );
    expect(container.querySelector('[data-testid="briefing-badge"]')?.textContent).toBe(
      DIFFICULTY_LABELS.easy,
    );
    expect(container.querySelector('[data-testid="briefing-badge"]')?.className).toContain(
      'sdq-briefing__badge--easy',
    );
    expect(container.querySelectorAll('[data-testid="briefing-metrics"] .sdq-briefing__metric').length).toBeGreaterThanOrEqual(4);
    expect(container.querySelectorAll('[data-testid="briefing-tags"] .sdq-briefing__tag')).toHaveLength(
      URL_SHORTENER.tags.length,
    );
    expect(container.querySelector('[data-testid="briefing-tags"]')?.textContent).toContain('cache');
  });

  it('calls onStart when Começar is clicked', () => {
    const onStart = vi.fn();
    const panel = mountBriefingPanel(container, { onStart });
    panel.render(URL_SHORTENER);

    const startButton = container.querySelector<HTMLButtonElement>('[data-testid="briefing-start"]')!;
    startButton.click();

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('advances session to requirements phase when Começar advances phase', () => {
    createSession('url-shortener', 'study');
    expect(getSession()?.phase).toBe('briefing');

    const panel = mountBriefingPanel(container, {
      onStart: () => {
        advancePhase();
      },
    });
    panel.render(URL_SHORTENER);

    container.querySelector<HTMLButtonElement>('[data-testid="briefing-start"]')!.click();

    expect(getSession()?.phase).toBe('requirements');
    expect(window.__GAME_STATE__.phase).toBe('requirements');
  });
});
