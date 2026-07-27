import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArchitectureGraph, JudgeResult } from '@sdq/shared';
import { clearCachedJudgePayload } from '../judge/judge-api';
import {
  advancePhase,
  createSession,
  getGraph,
  getSession,
  resetSessionStore,
  setGraph,
} from '../session/session-store';
import * as gameSounds from '../audio/game-sounds';
import {
  EMPTY_GRAPH_MESSAGE,
  mountSubmitPanel,
  validateLocalSubmit,
} from './submit-panel';

const sampleGraph: ArchitectureGraph = {
  nodes: [
    {
      id: 'comp-1',
      type: 'app_server',
      label: 'App',
      position: { x: 0, y: 0, z: 0 },
    },
  ],
  edges: [],
};

const sampleJudgeResult: JudgeResult = {
  verdict: 'PASS',
  score: 85,
  summary: 'Boa arquitetura em camadas.',
  nextStep: 'Adicione monitoramento.',
  strengths: [],
  criticalIssues: [],
  improvements: [],
  requirementCoverage: [],
  judgeDebate: {
    rigorous: 'Aprovado.',
    pragmatic: 'Aprovado.',
    consensus: 'PASS 85/100.',
  },
};

describe('submit panel', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    resetSessionStore();
    clearCachedJudgePayload();
    container = document.createElement('div');
    document.body.append(container);
  });

  afterEach(() => {
    container.remove();
    document.getElementById('sdq-submit-styles')?.remove();
    document.getElementById('sdq-judging-styles')?.remove();
  });

  it('validateLocalSubmit rejects empty graph with PT-BR message', () => {
    expect(validateLocalSubmit({ nodes: [], edges: [] })).toEqual({
      success: false,
      error: EMPTY_GRAPH_MESSAGE,
    });
  });

  it('validateLocalSubmit accepts graph with at least one node', () => {
    expect(validateLocalSubmit(sampleGraph)).toEqual({
      success: true,
      graph: sampleGraph,
    });
  });

  it('shows local FAIL when submitting empty graph', async () => {
    createSession('url-shortener', 'study');
    advancePhase();
    advancePhase();

    const panel = mountSubmitPanel(container, {
      getGraph: () => ({ nodes: [], edges: [] }),
      buildJudgeInput: (graph) => ({
        problemId: 'url-shortener',
        requirements: { functional: [], nonFunctional: [] },
        graph,
        mode: 'study',
      }),
      onJudgeSuccess: () => undefined,
    });

    const result = await panel.submit();

    expect(result.success).toBe(false);
    expect(result.error).toBe(EMPTY_GRAPH_MESSAGE);
    expect(container.querySelector('[data-testid="submit-error"]')?.textContent).toBe(
      EMPTY_GRAPH_MESSAGE,
    );
    expect(getSession()?.phase).toBe('canvas');
  });

  it('shows progress, calls judge API, and invokes onJudgeSuccess on valid submit', async () => {
    createSession('url-shortener', 'study');
    advancePhase();
    advancePhase();

    const submitForJudging = vi.fn().mockResolvedValue(sampleJudgeResult);
    const onJudgeSuccess = vi.fn();
    const soundSpy = vi.spyOn(gameSounds, 'playGameSound').mockImplementation(() => undefined);

    const panel = mountSubmitPanel(container, {
      getGraph: () => sampleGraph,
      buildJudgeInput: (graph) => ({
        problemId: 'url-shortener',
        requirements: { functional: ['Redirect HTTP 302'], nonFunctional: [] },
        graph,
        mode: 'study',
      }),
      onJudgeSuccess,
      submitForJudging,
    });

    const result = await panel.submit();

    expect(result.success).toBe(true);
    expect(soundSpy).toHaveBeenCalledWith('submit');
    expect(submitForJudging).toHaveBeenCalledTimes(1);
    expect(onJudgeSuccess).toHaveBeenCalledWith(sampleJudgeResult);
    expect(
      container.querySelector('[data-testid="judging-progress"]')?.classList.contains(
        'sdq-judging-overlay--visible',
      ),
    ).toBe(false);
    soundSpy.mockRestore();
  });

  it('shows retry on judge error and stays on canvas', async () => {
    createSession('url-shortener', 'study');
    advancePhase();
    advancePhase();

    const submitForJudging = vi
      .fn()
      .mockRejectedValue(new Error('Servidor indisponível'));
    const retryLastJudging = vi.fn().mockResolvedValue(sampleJudgeResult);
    const onJudgeSuccess = vi.fn();

    const panel = mountSubmitPanel(container, {
      getGraph: () => sampleGraph,
      buildJudgeInput: (graph) => ({
        problemId: 'url-shortener',
        requirements: { functional: [], nonFunctional: [] },
        graph,
        mode: 'study',
      }),
      onJudgeSuccess,
      submitForJudging,
      retryLastJudging,
    });

    const result = await panel.submit();

    expect(result.success).toBe(false);
    expect(getSession()?.phase).toBe('canvas');
    expect(onJudgeSuccess).not.toHaveBeenCalled();
    expect(
      container.querySelector('[data-testid="judging-error"]')?.classList.contains(
        'sdq-judging-error--visible',
      ),
    ).toBe(true);

    container.querySelector<HTMLButtonElement>('[data-testid="judging-retry-button"]')?.click();
    await vi.waitFor(() => expect(onJudgeSuccess).toHaveBeenCalledWith(sampleJudgeResult));

    expect(retryLastJudging).toHaveBeenCalledTimes(1);
  });
});
