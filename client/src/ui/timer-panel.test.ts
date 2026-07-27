import { describe, expect, it, beforeEach } from 'vitest';
import { createSession, resetSessionStore } from '../session/session-store';
import { formatElapsedMs, mountTimerPanel } from './timer-panel';

describe('formatElapsedMs', () => {
  it('formats minutes and seconds', () => {
    expect(formatElapsedMs(61000)).toBe('01:01');
    expect(formatElapsedMs(5000)).toBe('00:05');
  });
});

describe('mountTimerPanel', () => {
  beforeEach(() => {
    resetSessionStore();
    document.body.replaceChildren();
  });

  it('hides timer in study mode', () => {
    createSession('url-shortener', 'study');
    const panel = mountTimerPanel(document.body);
    expect(panel.root.hidden).toBe(true);
  });

  it('shows timer in speedrun mode', () => {
    let now = 1000;
    createSession('url-shortener', 'speedrun', {}, () => now);
    now = 65000;

    const panel = mountTimerPanel(document.body, { now: () => now });
    expect(panel.root.hidden).toBe(false);
    expect(panel.root.textContent).toBe('01:04');
  });
});
