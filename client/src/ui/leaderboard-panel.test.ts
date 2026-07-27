import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mountLeaderboardPanel } from './leaderboard-panel';

describe('mountLeaderboardPanel', () => {
  beforeEach(() => {
    document.body.replaceChildren();
  });

  it('stays visually hidden on mount despite display:flex (empty Fechar modal regression)', () => {
    const panel = mountLeaderboardPanel(document.body);
    expect(panel.root.hidden).toBe(true);
    expect(getComputedStyle(panel.root).display).toBe('none');
  });

  it('renders entries from fetchLeaderboard', async () => {
    const fetchLeaderboard = vi.fn().mockResolvedValue({
      problemId: 'url-shortener',
      entries: [
        {
          id: 'lb-1',
          problemId: 'url-shortener',
          playerNickname: 'fast_dev',
          elapsedMs: 60000,
          score: 85,
          verdict: 'PASS' as const,
          createdAt: '2026-07-27T12:00:00.000Z',
        },
      ],
    });

    const panel = mountLeaderboardPanel(document.body, { fetchLeaderboard });
    await panel.show('url-shortener', 'URL Shortener');

    expect(panel.root.hidden).toBe(false);
    const body = panel.root.querySelector('[data-testid="leaderboard-body"]');
    expect(body?.textContent).toContain('fast_dev');
    expect(body?.textContent).toContain('01:00');
  });

  it('shows empty message when no entries', async () => {
    const fetchLeaderboard = vi.fn().mockResolvedValue({
      problemId: 'url-shortener',
      entries: [],
    });

    const panel = mountLeaderboardPanel(document.body, { fetchLeaderboard });
    await panel.show('url-shortener', 'URL Shortener');

    const body = panel.root.querySelector('[data-testid="leaderboard-body"]');
    expect(body?.textContent).toContain('Nenhum tempo registrado');
  });
});
