import type { ArchitectureGraph } from '@sdq/shared';
import { URL_SHORTENER_ID } from '@sdq/shared';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  GUIDED_COMPONENT_ORDER,
  GUIDED_CONNECTION_ORDER,
  GUIDED_STEPS,
  advanceHint,
  detectGraphActions,
  getCurrentHint,
  getCurrentStep,
  graphSatisfiesStep,
  isGuidedComplete,
  startGuidedSession,
  syncGuidedStateFromSession,
} from './guided-mode';
import { mountGuidedOverlay } from './guided-overlay';
import {
  isProblemLibraryUnlocked,
  resetPreferences,
  unlockProblemLibrary,
} from '../storage/preferences';
import { mountPhaseNavigation } from '../session/phase-navigation';
import { getSession, resetSessionStore, setGraph } from '../session/session-store';

const emptyGraph: ArchitectureGraph = { nodes: [], edges: [] };

function node(id: string, type: ArchitectureGraph['nodes'][number]['type']) {
  return {
    id,
    type,
    label: id,
    position: { x: 0, y: 0, z: 0 },
  };
}

describe('guided mode engine', () => {
  it('defines sequential steps from briefing through submit', () => {
    expect(GUIDED_STEPS.map((step) => step.id)).toEqual([
      'briefing',
      'requirements',
      'place_client',
      'place_load_balancer',
      'place_app_server',
      'place_cache',
      'place_database',
      'connect_client_lb',
      'connect_lb_app',
      'connect_app_cache',
      'connect_app_db',
      'submit',
      'complete',
    ]);
  });

  it('suggests Client → LB → App → Cache → DB component order', () => {
    expect(GUIDED_COMPONENT_ORDER).toEqual([
      'client_web',
      'load_balancer',
      'app_server',
      'cache_redis',
      'sql_db',
    ]);
  });

  it('suggests connection order with Client → Load Balancer first', () => {
    expect(GUIDED_CONNECTION_ORDER[0]).toMatchObject({
      from: 'client_web',
      to: 'load_balancer',
      label: expect.stringContaining('HTTPS'),
    });
  });

  it('starts URL Shortener guided session at briefing hint', () => {
    const state = startGuidedSession(URL_SHORTENER_ID);
    expect(getCurrentHint(state)).toMatchObject({
      stepId: 'briefing',
      title: expect.stringContaining('briefing'),
    });
    expect(isGuidedComplete(state)).toBe(false);
  });

  it('marks non-tutorial problems as complete immediately', () => {
    const state = startGuidedSession('youtube');
    expect(getCurrentHint(state)).toBeNull();
    expect(isGuidedComplete(state)).toBe(true);
  });

  it('advances through briefing and requirements on phase changes', () => {
    let state = startGuidedSession(URL_SHORTENER_ID);

    state = advanceHint(state, { type: 'phase_entered', phase: 'requirements' });
    expect(getCurrentStep(state)?.id).toBe('requirements');

    state = advanceHint(state, { type: 'phase_entered', phase: 'canvas' });
    expect(getCurrentStep(state)?.id).toBe('place_client');
  });

  it('advances component steps when matching types are placed', () => {
    let state = startGuidedSession(URL_SHORTENER_ID);
    state = advanceHint(state, { type: 'phase_entered', phase: 'requirements' });
    state = advanceHint(state, { type: 'phase_entered', phase: 'canvas' });

    state = advanceHint(state, { type: 'component_placed', componentType: 'client_web' });
    expect(getCurrentStep(state)?.id).toBe('place_load_balancer');

    state = advanceHint(state, { type: 'component_placed', componentType: 'load_balancer' });
    expect(getCurrentStep(state)?.id).toBe('place_app_server');
  });

  it('allows dismissing a hint without blocking progression', () => {
    const state = startGuidedSession(URL_SHORTENER_ID);
    const next = advanceHint(state, { type: 'dismiss_hint' });
    expect(getCurrentStep(next)?.id).toBe('requirements');
  });

  it('detects graph component and edge actions', () => {
    const previous: ArchitectureGraph = {
      nodes: [node('client-1', 'client_web')],
      edges: [],
    };
    const current: ArchitectureGraph = {
      nodes: [node('client-1', 'client_web'), node('lb-1', 'load_balancer')],
      edges: [{ id: 'e1', from: 'client-1', to: 'lb-1' }],
    };

    expect(detectGraphActions(previous, current)).toEqual([
      { type: 'component_placed', componentType: 'load_balancer' },
      { type: 'edge_created', fromType: 'client_web', toType: 'load_balancer' },
    ]);
  });

  it('syncs guided state from session phase and graph updates', () => {
    let state = startGuidedSession(URL_SHORTENER_ID);
    const graph: ArchitectureGraph = {
      nodes: [node('client-1', 'client_web')],
      edges: [],
    };

    state = syncGuidedStateFromSession(state, 'requirements', graph, emptyGraph, 'briefing');
    expect(getCurrentStep(state)?.id).toBe('requirements');

    state = syncGuidedStateFromSession(state, 'canvas', graph, emptyGraph, 'requirements');
    expect(getCurrentStep(state)?.id).toBe('place_load_balancer');
  });

  it('evaluates graph satisfaction for placement and connection steps', () => {
    const graph: ArchitectureGraph = {
      nodes: [
        node('client-1', 'client_web'),
        node('lb-1', 'load_balancer'),
        node('app-1', 'app_server'),
      ],
      edges: [{ id: 'e1', from: 'client-1', to: 'lb-1' }],
    };

    expect(graphSatisfiesStep(graph, 'place_client')).toBe(true);
    expect(graphSatisfiesStep(graph, 'connect_client_lb')).toBe(true);
    expect(graphSatisfiesStep(graph, 'connect_lb_app')).toBe(false);
  });
});

describe('guided overlay integration', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    resetSessionStore();
    resetPreferences();
    container = document.createElement('div');
    document.body.append(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('renders briefing highlight when guided mode is active', () => {
    mountPhaseNavigation(container, { guidedMode: true });

    const hint = container.querySelector('[data-testid="guided-hint"]');
    expect(hint?.hasAttribute('hidden')).toBe(false);
    expect(container.querySelector('[data-testid="guided-hint-title"]')?.textContent).toContain(
      'briefing',
    );
    expect(window.__GAME_STATE__.guidedStep).toBe('briefing');
  });

  it('does not render guided overlay when guided mode is off', () => {
    mountPhaseNavigation(container, { guidedMode: false });
    expect(container.querySelector('[data-testid="guided-overlay"]')).toBeNull();
    expect(window.__GAME_STATE__.guidedStep).toBeNull();
  });

  it('advances hint when dismiss is clicked', () => {
    mountPhaseNavigation(container, { guidedMode: true });

    container.querySelector<HTMLButtonElement>('[data-testid="guided-hint-dismiss"]')!.click();

    expect(window.__GAME_STATE__.guidedStep).toBe('requirements');
    expect(container.querySelector('[data-testid="guided-hint-title"]')?.textContent).toContain(
      'requisitos',
    );
  });

  it('unlocks library placeholder when tutorial reaches completion', () => {
    const overlay = mountGuidedOverlay(container, URL_SHORTENER_ID, {
      onComplete: () => {
        unlockProblemLibrary();
      },
    });

    for (let index = 0; index < GUIDED_STEPS.length - 1; index += 1) {
      container.querySelector<HTMLButtonElement>('[data-testid="guided-hint-dismiss"]')!.click();
    }

    overlay.sync('result', emptyGraph);
    expect(isProblemLibraryUnlocked()).toBe(true);
    expect(overlay.getState().complete).toBe(false);
    expect(getCurrentStep(overlay.getState())?.id).toBe('complete');
  });

  it('advances to submit hint on canvas and completes after result phase', () => {
    mountPhaseNavigation(container, { guidedMode: true });

    container.querySelector<HTMLButtonElement>('[data-testid="briefing-start"]')!.click();
    container.querySelector<HTMLButtonElement>('[data-testid="requirements-advance"]')!.click();

    const overlay = container.querySelector('[data-testid="guided-overlay"]');
    expect(overlay).toBeTruthy();

    for (let index = 0; index < 9; index += 1) {
      container.querySelector<HTMLButtonElement>('[data-testid="guided-hint-dismiss"]')!.click();
    }

    expect(window.__GAME_STATE__.guidedStep).toBe('submit');

    setGraph({
      nodes: [node('app-1', 'app_server')],
      edges: [],
    });
    container.querySelector<HTMLButtonElement>('[data-testid="submit-button"]')!.click();

    expect(getSession()?.phase).toBe('result');
    expect(window.__GAME_STATE__.guidedStep).toBe('complete');
  });
});
