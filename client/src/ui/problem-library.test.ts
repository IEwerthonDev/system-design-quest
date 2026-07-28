import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getProblem } from '@sdq/shared';
import { mountProblemLibrary, shouldWarnHardSelection, shouldWarnSpeedrunMedium } from './problem-library';
import { recordCompletion, resetProgress } from '../storage/progress';

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe('problem library helpers', () => {
  it('shouldWarnHardSelection when no easy completed', () => {
    const netflix = getProblem('netflix-streaming')!;
    expect(shouldWarnHardSelection(netflix, 0)).toBe(true);
    expect(shouldWarnHardSelection(netflix, 1)).toBe(false);
  });

  it('shouldWarnSpeedrunMedium when fewer than 2 easy completed', () => {
    const youtube = getProblem('youtube')!;
     expect(shouldWarnSpeedrunMedium('speedrun', youtube, 1)).toBe(true);
    expect(shouldWarnSpeedrunMedium('study', youtube, 0)).toBe(false);
    expect(shouldWarnSpeedrunMedium('speedrun', youtube, 2)).toBe(false);
  });
});

describe('problem library UI', () => {
  let container: HTMLDivElement;
  let storage: MemoryStorage;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    storage = new MemoryStorage();
    resetProgress(storage);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ authenticated: false }),
      }),
    );
  });

  afterEach(() => {
    container.remove();
    document.getElementById('sdq-library-styles')?.remove();
    document.getElementById('sdq-auth-styles')?.remove();
    document.querySelectorAll('.sdq-auth-modal, .sdq-auth__toast').forEach((el) => el.remove());
    vi.unstubAllGlobals();
  });

  it('renders library with 27 problem cards by default', () => {
    mountProblemLibrary(container, { onSelect: () => undefined }, storage);
    expect(container.querySelector('[data-testid="problem-library"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-testid^="problem-card-"]')).toHaveLength(27);
  });

  it('filters hard problems to show netflix-streaming and ticketmaster', () => {
    const library = mountProblemLibrary(container, { onSelect: () => undefined }, storage);
    library.setFilter('hard');

    expect(container.querySelector('[data-testid="problem-card-netflix-streaming"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="problem-card-ticketmaster"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-testid^="problem-card-"]')).toHaveLength(10);
  });

  it('filters easy problems to include url-shortener with tutorial badge', () => {
    const library = mountProblemLibrary(container, { onSelect: () => undefined }, storage);
    library.setFilter('easy');

    const card = container.querySelector('[data-testid="problem-card-url-shortener"]');
    expect(card).toBeTruthy();
    expect(card?.textContent).toContain('Tutorial');
    expect(container.querySelectorAll('[data-testid^="problem-card-"]')).toHaveLength(7);
  });

  it('shows progress counters per difficulty tier', () => {
    recordCompletion('url-shortener', 'PARTIAL', 75, storage);
    recordCompletion('rate-limiter', 'PASS', 85, storage);

    mountProblemLibrary(container, { onSelect: () => undefined }, storage);

    expect(
      container.querySelector('[data-testid="library-progress-easy"]')?.textContent,
    ).toContain('2/7');
  });

  it('shows progress percent badges by difficulty and persists after remount', () => {
    recordCompletion('url-shortener', 'PASS', 90, storage);

    mountProblemLibrary(container, { onSelect: () => undefined }, storage);

    const expected = Math.round((1 / 7) * 100);
    expect(
      container.querySelector('[data-testid="library-progress-easy"]')?.getAttribute(
        'data-progress-percent',
      ),
    ).toBe(String(expected));
    expect(
      container.querySelector('[data-testid="library-progress-easy"]')?.textContent,
    ).toContain(`${expected}%`);
    expect(
      container.querySelector('[data-testid="library-filter-percent-easy"]')?.textContent,
    ).toBe(`${expected}%`);

    container.replaceChildren();
    mountProblemLibrary(container, { onSelect: () => undefined }, storage);
    expect(
      container.querySelector('[data-testid="library-filter-percent-easy"]')?.textContent,
    ).toBe(`${expected}%`);
  });

  it('calls onSelect when study button clicked', () => {
    const onSelect = vi.fn();
    mountProblemLibrary(container, { onSelect }, storage);

    container
      .querySelector<HTMLButtonElement>('[data-testid="problem-study-chat-system"]')
      ?.click();

    expect(onSelect).toHaveBeenCalledWith({
      problemId: 'chat-system',
      mode: 'study',
    });
  });

  it('opens ranking panel when ranking button clicked', async () => {
    const fetchLeaderboard = vi.fn().mockResolvedValue({
      problemId: 'url-shortener',
      entries: [],
    });

    mountProblemLibrary(container, { onSelect: () => undefined, fetchLeaderboard }, storage);

    container
      .querySelector<HTMLButtonElement>('[data-testid="problem-ranking-url-shortener"]')
      ?.click();

    await vi.waitFor(() => {
      expect(fetchLeaderboard).toHaveBeenCalledWith('url-shortener');
    });

    expect(container.querySelector('[data-testid="leaderboard-panel"]')?.hidden).toBe(false);
  });

  it('shows warning banner for hard selection without easy progress', () => {
    mountProblemLibrary(container, { onSelect: () => undefined }, storage);
    librarySetHardAndClick(container);

    const warning = container.querySelector('[data-testid="library-warning"]');
    expect(warning?.hidden).toBe(false);
    expect(warning?.textContent).toContain('difícil');
  });

  it('marks completed problems with Concluído badge', () => {
    recordCompletion('youtube', 'PASS', 90, storage);
    mountProblemLibrary(container, { onSelect: () => undefined }, storage);

    const card = container.querySelector('[data-testid="problem-card-youtube"]');
    expect(card?.textContent).toContain('Concluído');
  });

  it('renders EN and PT-BR locale buttons with pt-BR active by default', () => {
    mountProblemLibrary(container, { onSelect: () => undefined }, storage);

    const en = container.querySelector('[data-testid="locale-en"]');
    const pt = container.querySelector('[data-testid="locale-pt-BR"]');
    expect(en).toBeTruthy();
    expect(pt).toBeTruthy();
    expect(pt?.classList.contains('sdq-library__locale-btn--active')).toBe(true);
    expect(en?.classList.contains('sdq-library__locale-btn--active')).toBe(false);
    expect(container.querySelector('.sdq-library__title')?.textContent).toBe('Problemas');
    expect(
      container.querySelector('[data-testid="problem-title-url-shortener"]')?.textContent,
    ).toBe('Encurtador de URL');
  });

  it('clicking EN updates chrome strings and localized titles; PT-BR restores', () => {
    mountProblemLibrary(container, { onSelect: () => undefined }, storage);

    container.querySelector<HTMLButtonElement>('[data-testid="locale-en"]')?.click();

    expect(
      container.querySelector('[data-testid="locale-en"]')?.classList.contains(
        'sdq-library__locale-btn--active',
      ),
    ).toBe(true);
    expect(container.querySelector('.sdq-library__title')?.textContent).toBe('Problems');
    expect(
      container.querySelector('[data-testid="library-open-sessions"]')?.textContent,
    ).toBe('My sessions');
    expect(
      container.querySelector('[data-testid="problem-title-url-shortener"]')?.textContent,
    ).toBe('URL Shortener');

    container.querySelector<HTMLButtonElement>('[data-testid="locale-pt-BR"]')?.click();

    expect(
      container.querySelector('[data-testid="locale-pt-BR"]')?.classList.contains(
        'sdq-library__locale-btn--active',
      ),
    ).toBe(true);
    expect(container.querySelector('.sdq-library__title')?.textContent).toBe('Problemas');
    expect(
      container.querySelector('[data-testid="problem-title-url-shortener"]')?.textContent,
    ).toBe('Encurtador de URL');
  });

  it('locale preference survives remount via storage', () => {
    mountProblemLibrary(container, { onSelect: () => undefined }, storage);
    container.querySelector<HTMLButtonElement>('[data-testid="locale-en"]')?.click();
    container.replaceChildren();
    document.getElementById('sdq-library-styles')?.remove();

    mountProblemLibrary(container, { onSelect: () => undefined }, storage);

    expect(
      container.querySelector('[data-testid="locale-en"]')?.classList.contains(
        'sdq-library__locale-btn--active',
      ),
    ).toBe(true);
    expect(container.querySelector('.sdq-library__title')?.textContent).toBe('Problems');
    expect(
      container.querySelector('[data-testid="problem-title-url-shortener"]')?.textContent,
    ).toBe('URL Shortener');
  });

  it('shows continue-session for latest in_progress and opens it on click', async () => {
    const older = {
      id: 'old',
      problemId: 'rate-limiter',
      playerNickname: 'alice',
      status: 'in_progress' as const,
      graph: { nodes: [], edges: [] },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const latest = {
      id: 'new',
      problemId: 'url-shortener',
      playerNickname: 'alice',
      status: 'in_progress' as const,
      graph: {
        nodes: [
          {
            id: 'n1',
            type: 'app_server' as const,
            label: 'App',
            position: { x: 0, y: 0, z: 0 },
          },
        ],
        edges: [],
      },
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-02-02T00:00:00.000Z',
      mode: 'study' as const,
    };
    const listSessionsFn = vi.fn().mockResolvedValue([older, latest]);
    const onContinueSession = vi.fn();

    mountProblemLibrary(
      container,
      {
        onSelect: () => undefined,
        onContinueSession,
        listSessionsFn,
        getNickname: () => 'alice',
      },
      storage,
    );

    await vi.waitFor(() => {
      expect(container.querySelector('[data-testid="continue-session"]')?.hidden).toBe(false);
    });
    expect(listSessionsFn).toHaveBeenCalledWith(
      { nickname: 'alice', status: 'in_progress' },
      expect.anything(),
    );

    container.querySelector<HTMLButtonElement>('[data-testid="continue-session"]')!.click();
    expect(onContinueSession).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'new', problemId: 'url-shortener' }),
    );
  });

  it('hides continue-session when nickname is empty without listing sessions', async () => {
    const listSessionsFn = vi.fn();
    mountProblemLibrary(
      container,
      {
        onSelect: () => undefined,
        onContinueSession: () => undefined,
        listSessionsFn,
        getNickname: () => '',
      },
      storage,
    );

    await vi.waitFor(() => {
      expect(container.querySelector('[data-testid="continue-session"]')?.hidden).toBe(true);
    });
    expect(listSessionsFn).not.toHaveBeenCalled();
  });

  it('hides continue-session when there is no in_progress session', async () => {
    const listSessionsFn = vi.fn().mockResolvedValue([]);
    mountProblemLibrary(
      container,
      {
        onSelect: () => undefined,
        onContinueSession: () => undefined,
        listSessionsFn,
        getNickname: () => 'alice',
      },
      storage,
    );

    await vi.waitFor(() => {
      expect(listSessionsFn).toHaveBeenCalled();
    });
    expect(container.querySelector('[data-testid="continue-session"]')?.hidden).toBe(true);
  });

  it('shows maintenance banner and blocks new session start', () => {
    const onSelect = vi.fn();
    mountProblemLibrary(
      container,
      {
        onSelect,
        edgeFlags: {
          maintenance: true,
          newProblemIds: [],
          bannerText: 'Down for maintenance',
        },
      },
      storage,
    );

    const banner = container.querySelector('[data-testid="library-edge-banner"]') as HTMLElement;
    expect(banner.hidden).toBe(false);
    expect(banner.textContent).toContain('Down for maintenance');

    const study = container.querySelector(
      '[data-testid="problem-study-url-shortener"]',
    ) as HTMLButtonElement;
    expect(study.disabled).toBe(true);
    study.click();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('reflects newProblemIds badge and bannerText when present', () => {
    mountProblemLibrary(
      container,
      {
        onSelect: () => undefined,
        edgeFlags: {
          maintenance: false,
          newProblemIds: ['url-shortener'],
          bannerText: 'Fresh problems landed',
        },
      },
      storage,
    );

    const banner = container.querySelector('[data-testid="library-edge-banner"]') as HTMLElement;
    expect(banner.hidden).toBe(false);
    expect(banner.textContent).toContain('Fresh problems landed');
    expect(
      container.querySelector('[data-testid="library-new-badge-url-shortener"]'),
    ).toBeTruthy();

    const study = container.querySelector(
      '[data-testid="problem-study-url-shortener"]',
    ) as HTMLButtonElement;
    expect(study.disabled).toBe(false);
  });

  it('fail-open when edge config loader rejects — app stays playable', async () => {
    const onSelect = vi.fn();
    mountProblemLibrary(
      container,
      {
        onSelect,
        loadEdgeFlagsFn: async () => {
          throw new Error('unreachable');
        },
      },
      storage,
    );

    await vi.waitFor(() => {
      const study = container.querySelector(
        '[data-testid="problem-study-url-shortener"]',
      ) as HTMLButtonElement;
      expect(study.disabled).toBe(false);
    });

    container
      .querySelector<HTMLButtonElement>('[data-testid="problem-study-url-shortener"]')!
      .click();
    expect(onSelect).toHaveBeenCalledWith({ problemId: 'url-shortener', mode: 'study' });
  });
});

function librarySetHardAndClick(container: ParentNode): void {
  container.querySelector<HTMLButtonElement>('[data-testid="library-filter-hard"]')?.click();
  container
    .querySelector<HTMLButtonElement>('[data-testid="problem-study-netflix-streaming"]')
    ?.click();
}
