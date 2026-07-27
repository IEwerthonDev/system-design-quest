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
  });

  afterEach(() => {
    container.remove();
    document.getElementById('sdq-library-styles')?.remove();
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
});

function librarySetHardAndClick(container: ParentNode): void {
  container.querySelector<HTMLButtonElement>('[data-testid="library-filter-hard"]')?.click();
  container
    .querySelector<HTMLButtonElement>('[data-testid="problem-study-netflix-streaming"]')
    ?.click();
}
