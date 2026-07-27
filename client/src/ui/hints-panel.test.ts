import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import type { ArchitectureGraph } from '@sdq/shared';
import { URL_SHORTENER_ID } from '@sdq/shared';
import {
  getHintsForProblem,
  getResolvedHintIds,
  mountHintsPanel,
} from './hints-panel';

const emptyGraph: ArchitectureGraph = { nodes: [], edges: [] };

describe('contextual hints panel', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
  });

  afterEach(() => {
    container.remove();
    document.getElementById('sdq-hints-styles')?.remove();
  });

  it('shows 2–3 hints for URL shortener', () => {
    const hints = getHintsForProblem(URL_SHORTENER_ID);
    expect(hints.length).toBeGreaterThanOrEqual(2);
    expect(hints.length).toBeLessThanOrEqual(3);
    expect(hints[0]?.text).toMatch(/read-heavy|cache|armazenamento|Load Balancer/i);
  });

  it('positions hints beside the component palette, not over it', () => {
    const panel = mountHintsPanel(container, {
      problemId: URL_SHORTENER_ID,
      getGraph: () => emptyGraph,
    });
    const style = document.getElementById('sdq-hints-styles')?.textContent ?? '';
    expect(style).toMatch(/left:\s*236px/);
    expect(panel.root.className).toBe('sdq-hints');
  });

  it('marks hint resolved when relevant component is added', () => {
    const hints = getHintsForProblem(URL_SHORTENER_ID);
    const graphWithCache: ArchitectureGraph = {
      nodes: [
        {
          id: 'cache-1',
          type: 'cache_redis',
          label: 'Cache',
          position: { x: 0, y: 0, z: 0 },
        },
      ],
      edges: [],
    };

    const resolved = getResolvedHintIds(hints, graphWithCache);
    expect(resolved).toContain('read-heavy-cache');
    expect(getResolvedHintIds(hints, emptyGraph)).not.toContain('read-heavy-cache');
  });

  it('mountHintsPanel renders hints and syncs resolved state', () => {
    let graph = emptyGraph;
    const panel = mountHintsPanel(container, {
      problemId: URL_SHORTENER_ID,
      getGraph: () => graph,
    });

    expect(container.querySelector('[data-testid="hints-panel"]')).toBeTruthy();
    expect(container.querySelectorAll('[data-testid^="hint-"]').length).toBeGreaterThanOrEqual(2);

    graph = {
      nodes: [
        {
          id: 'db-1',
          type: 'sql_db',
          label: 'DB',
          position: { x: 0, y: 0, z: 0 },
        },
      ],
      edges: [],
    };
    panel.sync();

    const storageHint = container.querySelector('[data-testid="hint-persistent-storage"]');
    expect(storageHint?.classList.contains('sdq-hints__item--resolved')).toBe(true);
    expect(panel.getResolvedHintIds()).toContain('persistent-storage');
  });

  it('uses more prescriptive copy in guided mode', () => {
    const free = getHintsForProblem(URL_SHORTENER_ID, false)[0]?.text ?? '';
    const guided = getHintsForProblem(URL_SHORTENER_ID, true)[0]?.text ?? '';
    expect(guided).not.toBe(free);
  });
});
