import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArchitectureGraph, DesignSessionRecord } from '@sdq/shared';
import { saveNickname } from '../storage/nickname';
import {
  getSession,
  hydrateFromDesignSession,
  resetSessionStore,
} from '../session/session-store';
import { mountSessionsDashboard } from './sessions-dashboard';

const emptyGraph: ArchitectureGraph = { nodes: [], edges: [] };

const savedGraph: ArchitectureGraph = {
  nodes: [
    {
      id: 'cdn-1',
      type: 'cdn',
      label: 'CDN',
      position: { x: 2, y: 0, z: 1 },
    },
  ],
  edges: [],
};

function fixture(
  overrides: Partial<DesignSessionRecord> & Pick<DesignSessionRecord, 'id' | 'status'>,
): DesignSessionRecord {
  return {
    problemId: 'url-shortener',
    playerNickname: 'alice',
    graph: emptyGraph,
    createdAt: '2026-07-27T10:00:00.000Z',
    updatedAt: '2026-07-27T12:00:00.000Z',
    ...overrides,
  };
}

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

describe('sessions dashboard (PP-07)', () => {
  let container: HTMLDivElement;
  let storage: MemoryStorage;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    storage = new MemoryStorage();
    saveNickname('alice', storage);
    document.getElementById('sdq-sessions-dashboard-styles')?.remove();
    resetSessionStore();
  });

  afterEach(() => {
    container.remove();
    document.getElementById('sdq-sessions-dashboard-styles')?.remove();
    resetSessionStore();
  });

  it('lists sessions in four buckets Approved / Rejected / Partial / In Progress via API', async () => {
    const seeded: DesignSessionRecord[] = [
      fixture({
        id: 's-approved',
        status: 'approved',
        score: 90,
        verdict: 'PASS',
        updatedAt: '2026-07-27T12:01:00.000Z',
      }),
      fixture({
        id: 's-rejected',
        status: 'rejected',
        score: 40,
        verdict: 'FAIL',
        updatedAt: '2026-07-27T12:02:00.000Z',
      }),
      fixture({
        id: 's-partial',
        status: 'partial',
        score: 65,
        verdict: 'PARTIAL',
        updatedAt: '2026-07-27T12:03:00.000Z',
      }),
      fixture({
        id: 's-progress',
        status: 'in_progress',
        updatedAt: '2026-07-27T12:04:00.000Z',
      }),
    ];
    const listSessionsFn = vi.fn().mockResolvedValue(seeded);

    const dashboard = mountSessionsDashboard(container, {
      storage,
      listSessionsFn,
    });
    await dashboard.ready;

    expect(listSessionsFn).toHaveBeenCalledWith(
      expect.objectContaining({ nickname: 'alice' }),
      expect.anything(),
    );
    expect(container.querySelector('[data-testid="sessions-nickname"]')?.textContent).toContain(
      'alice',
    );

    for (const status of ['approved', 'rejected', 'partial', 'in_progress'] as const) {
      const tab = container.querySelector<HTMLButtonElement>(
        `[data-testid="sessions-tab-${status}"]`,
      );
      expect(tab).toBeTruthy();
      tab!.click();
      const list = container.querySelector('[data-testid="sessions-list"]');
      const card = container.querySelector(
        `[data-testid="session-card-${seeded.find((s) => s.status === status)!.id}"]`,
      );
      expect(card).toBeTruthy();
      expect(list?.textContent).toContain('Encurtador de URL');
      expect(list?.textContent).toMatch(/2026-07-27/);
    }

    container.querySelector<HTMLButtonElement>('[data-testid="sessions-tab-approved"]')!.click();
    const approvedCard = container.querySelector('[data-testid="session-card-s-approved"]');
    expect(approvedCard?.textContent).toContain('90');
    expect(approvedCard?.textContent).toMatch(/PASS|Aprovad/i);
  });

  it('shows clear empty state when a status bucket has no sessions', async () => {
    const listSessionsFn = vi.fn().mockResolvedValue([
      fixture({ id: 'only-approved', status: 'approved', score: 80, verdict: 'PASS' }),
    ]);

    const dashboard = mountSessionsDashboard(container, {
      storage,
      listSessionsFn,
    });
    await dashboard.ready;

    container.querySelector<HTMLButtonElement>('[data-testid="sessions-tab-rejected"]')!.click();
    const empty = container.querySelector('[data-testid="sessions-empty"]');
    expect(empty).toBeTruthy();
    expect(empty?.textContent).toMatch(/nenhuma sessão/i);
    expect(container.querySelector('[data-testid^="session-card-"]')).toBeNull();
  });

  it('shows empty state when API returns no sessions at all', async () => {
    const listSessionsFn = vi.fn().mockResolvedValue([]);

    const dashboard = mountSessionsDashboard(container, {
      storage,
      listSessionsFn,
    });
    await dashboard.ready;

    expect(container.querySelector('[data-testid="sessions-empty"]')?.textContent).toMatch(
      /nenhuma sessão/i,
    );
  });

  it('exposes Minhas sessões entry point from problem library chrome', async () => {
    const { mountProblemLibrary } = await import('./problem-library');
    const onOpenSessions = vi.fn();
    mountProblemLibrary(
      container,
      { onSelect: () => undefined, onOpenSessions },
      storage,
    );

    const link = container.querySelector<HTMLButtonElement>(
      '[data-testid="library-open-sessions"]',
    );
    expect(link).toBeTruthy();
    expect(link?.textContent).toMatch(/minhas sessões/i);
    link!.click();
    expect(onOpenSessions).toHaveBeenCalledTimes(1);
  });
});

describe('reopen persisted design session (PP-08)', () => {
  let container: HTMLDivElement;
  let storage: MemoryStorage;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    storage = new MemoryStorage();
    saveNickname('alice', storage);
    document.getElementById('sdq-sessions-dashboard-styles')?.remove();
    document.getElementById('sdq-phase-nav-styles')?.remove();
    resetSessionStore();
  });

  afterEach(() => {
    container.remove();
    document.getElementById('sdq-sessions-dashboard-styles')?.remove();
    document.getElementById('sdq-phase-nav-styles')?.remove();
    resetSessionStore();
  });

  it('opening in_progress hydrates __GAME_STATE__.graph to the saved graph', async () => {
    const record = fixture({
      id: 'sess-in-progress',
      status: 'in_progress',
      graph: savedGraph,
      requirements: {
        functional: ['Encurtar URLs'],
        nonFunctional: ['Baixa latência'],
      },
      mode: 'study',
    });
    const listSessionsFn = vi.fn().mockResolvedValue([record]);
    const onOpenSession = vi.fn((session: DesignSessionRecord) => {
      hydrateFromDesignSession(session);
    });

    const dashboard = mountSessionsDashboard(container, {
      storage,
      listSessionsFn,
      onOpenSession,
    });
    await dashboard.ready;

    container.querySelector<HTMLButtonElement>('[data-testid="sessions-tab-in_progress"]')!.click();
    container
      .querySelector<HTMLButtonElement>('[data-testid="session-card-sess-in-progress"]')!
      .click();

    expect(onOpenSession).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sess-in-progress', status: 'in_progress' }),
    );
    expect(window.__GAME_STATE__.graph).toEqual(savedGraph);
    expect(window.__GAME_STATE__.graph.nodes[0]?.id).toBe('cdn-1');
    expect(window.__GAME_STATE__.requirements).toEqual({
      functional: ['Encurtar URLs'],
      nonFunctional: ['Baixa latência'],
    });
    expect(window.__GAME_STATE__.phase).toBe('canvas');
  });

  it('hydrated in_progress keeps the same id so later confirm can re-submit', async () => {
    const record = fixture({
      id: 'sess-reopen-1',
      status: 'in_progress',
      graph: savedGraph,
      mode: 'study',
    });

    const { mountPhaseNavigation } = await import('../session/phase-navigation');
    const nav = mountPhaseNavigation(container, {
      problemId: record.problemId,
      mode: 'study',
      designSession: record,
    });

    expect(getSession()?.id).toBe('sess-reopen-1');
    expect(getSession()?.phase).toBe('canvas');
    expect(window.__GAME_STATE__.graph).toEqual(savedGraph);
    expect(container.querySelector('[data-testid="submit-button"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="submit-bar"]')?.hasAttribute('hidden')).toBe(
      false,
    );

    nav.destroy();
  });

  it('reopen in_progress → re-submit → confirm upserts same session id with terminal status', async () => {
    const record = fixture({
      id: 'sess-reopen-confirm',
      status: 'in_progress',
      graph: savedGraph,
      mode: 'study',
      requirements: {
        functional: ['Encurtar URLs'],
        nonFunctional: ['Baixa latência'],
      },
    });

    const passResult = {
      verdict: 'PASS' as const,
      score: 90,
      summary: 'Bom design.',
      nextStep: 'Escale o banco.',
      strengths: [],
      criticalIssues: [],
      improvements: [],
      requirementCoverage: [],
      judgeDebate: {
        rigorous: 'Ok.',
        pragmatic: 'Ok.',
        consensus: 'PASS.',
      },
    };

    const upsertSessionFn = vi.fn().mockResolvedValue({
      id: 'sess-reopen-confirm',
      status: 'approved',
    });

    const { mountPhaseNavigation } = await import('../session/phase-navigation');
    const { setGraph } = await import('../session/session-store');
    const nav = mountPhaseNavigation(container, {
      problemId: record.problemId,
      mode: 'study',
      designSession: record,
      submitForJudging: vi.fn().mockResolvedValue(passResult),
      upsertSessionFn,
      getNickname: () => 'alice',
    });

    expect(getSession()?.id).toBe('sess-reopen-confirm');
    expect(getSession()?.phase).toBe('canvas');

    setGraph(savedGraph);
    container.querySelector<HTMLButtonElement>('[data-testid="submit-button"]')!.click();

    await vi.waitFor(() => expect(getSession()?.phase).toBe('result'));
    expect(getSession()?.id).toBe('sess-reopen-confirm');

    container.querySelector<HTMLButtonElement>('[data-testid="session-confirm-confirm"]')!.click();

    await vi.waitFor(() =>
      expect(upsertSessionFn).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'sess-reopen-confirm',
          status: 'approved',
          playerNickname: 'alice',
        }),
      ),
    );

    const terminalStatuses = new Set(['approved', 'rejected', 'partial']);
    const upsertArg = upsertSessionFn.mock.calls[0]![0];
    expect(upsertArg.id).toBe('sess-reopen-confirm');
    expect(terminalStatuses.has(upsertArg.status)).toBe(true);

    nav.destroy();
  });
});
