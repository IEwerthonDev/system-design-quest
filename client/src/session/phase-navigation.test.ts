import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { getGoldenGraph, type ArchitectureGraph, type JudgeResult } from '@sdq/shared';
import { clearCachedJudgePayload } from '../judge/judge-api';
import { setLocale } from '../i18n/locale';
import { VERDICT_LABELS } from '../ui/result-panel';
import {
  canGoBackPhase,
  getPreviousPhase,
  PHASE_ORDER,
  retreatPhase,
} from './phase-machine';
import {
  getPhaseLayerVisibility,
  mountPhaseNavigation,
} from './phase-navigation';
import {
  advancePhase,
  createSession,
  getGraph,
  getJudgeResult,
  getRequirements,
  getSession,
  goBackPhase,
  resetSessionStore,
  setGraph,
  setRequirements,
} from './session-store';

const sampleJudgeResult: JudgeResult = {
  verdict: 'PARTIAL',
  score: 75,
  summary: 'Design promissor com lacunas.',
  nextStep: 'Adicione Redis para redirects.',
  strengths: [
    {
      title: 'Camadas claras',
      explanation: 'Tráfego passa pelo app server.',
      howToImprove: 'Documente leitura vs escrita.',
      whyItMatters: 'Facilita escalar.',
    },
  ],
  criticalIssues: [],
  improvements: [],
  requirementCoverage: [],
  judgeDebate: {
    rigorous: 'Falta cache.',
    pragmatic: 'Protótipo ok.',
    consensus: 'Score 75/100.',
  },
};

const sampleGraph: ArchitectureGraph = {
  nodes: [
    {
      id: 'app-1',
      type: 'app_server',
      label: 'App',
      position: { x: 0, y: 0, z: 0 },
    },
  ],
  edges: [],
};

describe('phase navigation', () => {
  describe('phase machine back navigation', () => {
    it('getPreviousPhase walks result → canvas → requirements → briefing', () => {
      expect(getPreviousPhase('result')).toBe('canvas');
      expect(getPreviousPhase('canvas')).toBe('requirements');
      expect(getPreviousPhase('requirements')).toBe('briefing');
      expect(getPreviousPhase('briefing')).toBeNull();
    });

    it('canGoBackPhase is false only at briefing', () => {
      for (const phase of PHASE_ORDER) {
        expect(canGoBackPhase(phase)).toBe(phase !== 'briefing');
      }
    });

    it('retreatPhase throws at briefing', () => {
      expect(() => retreatPhase('briefing')).toThrow(/cannot go back/i);
    });
  });

  describe('session store back navigation', () => {
    beforeEach(() => {
      resetSessionStore();
    });

    it('goBackPhase walks result → canvas → requirements → briefing', () => {
      createSession('url-shortener', 'study');
      advancePhase();
      advancePhase();
      advancePhase();
      expect(getSession()?.phase).toBe('result');

      expect(goBackPhase().phase).toBe('canvas');
      expect(goBackPhase().phase).toBe('requirements');
      expect(goBackPhase().phase).toBe('briefing');
    });

    it('goBackPhase throws at briefing', () => {
      createSession('url-shortener', 'study');
      expect(() => goBackPhase()).toThrow(/cannot go back/i);
    });

    it('preserves requirements when going back from canvas', () => {
      createSession('url-shortener', 'study');
      setRequirements({
        functional: ['Gerar slug único para cada URL'],
        nonFunctional: ['Latência de redirect abaixo de 50ms'],
      });
      advancePhase();
      advancePhase();
      expect(getSession()?.phase).toBe('canvas');

      goBackPhase();

      expect(getSession()?.phase).toBe('requirements');
      expect(getRequirements()).toEqual({
        functional: ['Gerar slug único para cada URL'],
        nonFunctional: ['Latência de redirect abaixo de 50ms'],
      });
    });

    it('preserves graph when going back from canvas', () => {
      createSession('url-shortener', 'study');
      advancePhase();
      advancePhase();
      setGraph(sampleGraph);

      goBackPhase();

      expect(getSession()?.phase).toBe('requirements');
      expect(getGraph().nodes).toHaveLength(1);
    });
  });

  describe('phase layer visibility', () => {
    it('shows only briefing layer at start', () => {
      expect(getPhaseLayerVisibility('briefing')).toEqual({
        briefing: true,
        requirements: false,
        palette: false,
        submit: false,
        result: false,
        showBack: true,
      });
    });

    it('shows palette and submit on canvas, result panel on result', () => {
      expect(getPhaseLayerVisibility('canvas')).toMatchObject({
        palette: true,
        submit: true,
        result: false,
        showBack: true,
      });
      expect(getPhaseLayerVisibility('result')).toMatchObject({
        palette: false,
        submit: false,
        result: true,
        showBack: false,
      });
    });
  });

  describe('mounted phase navigation', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
      resetSessionStore();
      container = document.createElement('div');
      document.body.append(container);
    });

    afterEach(() => {
      container.remove();
    });

    it('starts at briefing and advances through requirements to canvas', () => {
      mountPhaseNavigation(container, {
        submitForJudging: vi.fn().mockResolvedValue(sampleJudgeResult),
      });

      expect(getSession()?.phase).toBe('briefing');
      expect(container.querySelector('[data-testid="briefing-panel"]')?.hasAttribute('hidden')).toBe(
        false,
      );
      expect(
        container.querySelector('[data-testid="requirements-panel"]')?.hasAttribute('hidden'),
      ).toBe(true);

      container.querySelector<HTMLButtonElement>('[data-testid="briefing-start"]')!.click();
      expect(getSession()?.phase).toBe('requirements');
      expect(
        container.querySelector('[data-testid="requirements-panel"]')?.hasAttribute('hidden'),
      ).toBe(false);

      container.querySelector<HTMLButtonElement>('[data-testid="requirements-advance"]')!.click();
      expect(getSession()?.phase).toBe('canvas');
      expect(container.querySelector('[data-testid="component-palette"]')?.hasAttribute('hidden')).toBe(
        false,
      );
      expect(window.__GAME_STATE__.phase).toBe('canvas');
      const phaseBack = container.querySelector('[data-testid="phase-back"]');
      expect(phaseBack?.classList.contains('sdq-phase-back--in-header')).toBe(true);
      expect(
        container
          .querySelector('[data-testid="session-header-leading"]')
          ?.contains(phaseBack),
      ).toBe(true);
      const phaseNavCss = document.getElementById('sdq-phase-nav-styles')?.textContent ?? '';
      expect(phaseNavCss).toContain('phase-back');
      expect(container.querySelector('[data-testid="hints-panel"]')).toBeNull();
    });

    it('does not mount hints-panel on study canvas phase', () => {
      mountPhaseNavigation(container, { mode: 'study' });
      container.querySelector<HTMLButtonElement>('[data-testid="briefing-start"]')!.click();
      container.querySelector<HTMLButtonElement>('[data-testid="requirements-advance"]')!.click();
      expect(getSession()?.phase).toBe('canvas');
      expect(document.querySelector('[data-testid="hints-panel"]')).toBeNull();
      expect(container.querySelector('[data-testid="hints-panel"]')).toBeNull();
    });

    it('shows back button at briefing for home exit', () => {
      mountPhaseNavigation(container, { onExitToLibrary: vi.fn() });
      expect(container.querySelector('[data-testid="phase-back"]')?.hasAttribute('hidden')).toBe(
        false,
      );
    });

    it('hides palette fab outside canvas phase', () => {
      mountPhaseNavigation(container);
      expect(container.querySelector('[data-testid="palette-fab"]')?.hasAttribute('hidden')).toBe(
        true,
      );
      container.querySelector<HTMLButtonElement>('[data-testid="briefing-start"]')!.click();
      container.querySelector<HTMLButtonElement>('[data-testid="requirements-advance"]')!.click();
      expect(container.querySelector('[data-testid="palette-fab"]')?.hasAttribute('hidden')).toBe(
        false,
      );
    });

    it('exits to library when back is clicked from canvas', () => {
      const onExitToLibrary = vi.fn();
      mountPhaseNavigation(container, { onExitToLibrary });

      container.querySelector<HTMLButtonElement>('[data-testid="briefing-start"]')!.click();
      container.querySelector<HTMLButtonElement>('[data-testid="requirements-advance"]')!.click();
      expect(getSession()?.phase).toBe('canvas');

      container.querySelector<HTMLButtonElement>('[data-testid="phase-back"]')!.click();
      expect(onExitToLibrary).toHaveBeenCalledTimes(1);
      expect(getSession()?.phase).toBe('canvas');
    });

    it('advances to result on valid submit, mounts result panel, and preserves judgeResult on back', async () => {
      const upsertSessionFn = vi.fn().mockResolvedValue({
        id: 'session-1',
        status: 'in_progress',
      });
      mountPhaseNavigation(container, {
        submitForJudging: vi.fn().mockResolvedValue(sampleJudgeResult),
        upsertSessionFn,
      });

      container.querySelector<HTMLButtonElement>('[data-testid="briefing-start"]')!.click();
      container.querySelector<HTMLButtonElement>('[data-testid="requirements-advance"]')!.click();

      setGraph(sampleGraph);
      container.querySelector<HTMLButtonElement>('[data-testid="submit-button"]')!.click();

      await vi.waitFor(() => expect(getSession()?.phase).toBe('result'));

      expect(getJudgeResult()?.verdict).toBe('PARTIAL');
      expect(container.querySelector('[data-testid="result-panel"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="judge-sidebar"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="session-confirm-modal"]')).not.toBeNull();
      expect(container.querySelector('[data-testid="result-verdict-badge"]')?.textContent).toBe(
        'Parcial',
      );

      container.querySelector<HTMLButtonElement>('[data-testid="session-confirm-back"]')!.click();

      await vi.waitFor(() => expect(getSession()?.phase).toBe('canvas'));
      expect(upsertSessionFn).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'in_progress',
          playerNickname: expect.any(String),
          graph: expect.objectContaining({ nodes: expect.any(Array) }),
        }),
      );
      expect(getGraph().nodes).toHaveLength(1);
      expect(getJudgeResult()?.score).toBe(75);
      expect(
        container.querySelector('[data-testid="result-panel-host"]')?.hasAttribute('hidden'),
      ).toBe(true);
    });

    it('Confirmar PUTs partial for PARTIAL and approved for PASS', async () => {
      const upsertPartial = vi.fn().mockResolvedValue({ id: 's', status: 'partial' });
      mountPhaseNavigation(container, {
        submitForJudging: vi.fn().mockResolvedValue(sampleJudgeResult),
        upsertSessionFn: upsertPartial,
        getNickname: () => 'tester',
      });

      container.querySelector<HTMLButtonElement>('[data-testid="briefing-start"]')!.click();
      container.querySelector<HTMLButtonElement>('[data-testid="requirements-advance"]')!.click();
      setGraph(sampleGraph);
      container.querySelector<HTMLButtonElement>('[data-testid="submit-button"]')!.click();
      await vi.waitFor(() => expect(getSession()?.phase).toBe('result'));

      container.querySelector<HTMLButtonElement>('[data-testid="session-confirm-confirm"]')!.click();
      await vi.waitFor(() =>
        expect(upsertPartial).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'partial',
            playerNickname: 'tester',
            id: getSession()?.id,
          }),
        ),
      );

      container.remove();
      container = document.createElement('div');
      document.body.append(container);
      resetSessionStore();

      const passResult: JudgeResult = { ...sampleJudgeResult, verdict: 'PASS', score: 90 };
      const upsertPass = vi.fn().mockResolvedValue({ id: 's2', status: 'approved' });
      mountPhaseNavigation(container, {
        submitForJudging: vi.fn().mockResolvedValue(passResult),
        upsertSessionFn: upsertPass,
        getNickname: () => 'tester',
      });
      container.querySelector<HTMLButtonElement>('[data-testid="briefing-start"]')!.click();
      container.querySelector<HTMLButtonElement>('[data-testid="requirements-advance"]')!.click();
      setGraph(sampleGraph);
      container.querySelector<HTMLButtonElement>('[data-testid="submit-button"]')!.click();
      await vi.waitFor(() => expect(getSession()?.phase).toBe('result'));
      container.querySelector<HTMLButtonElement>('[data-testid="session-confirm-confirm"]')!.click();
      await vi.waitFor(() =>
        expect(upsertPass).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'approved', playerNickname: 'tester' }),
        ),
      );
    });

    it('shows error and stays on result when Confirmar PUT fails', async () => {
      const { SessionsApiError } = await import('../sessions/sessions-api');
      const upsertSessionFn = vi
        .fn()
        .mockRejectedValue(new SessionsApiError('save failed', 500));

      mountPhaseNavigation(container, {
        submitForJudging: vi.fn().mockResolvedValue(sampleJudgeResult),
        upsertSessionFn,
        getNickname: () => 'tester',
      });

      container.querySelector<HTMLButtonElement>('[data-testid="briefing-start"]')!.click();
      container.querySelector<HTMLButtonElement>('[data-testid="requirements-advance"]')!.click();
      setGraph(sampleGraph);
      container.querySelector<HTMLButtonElement>('[data-testid="submit-button"]')!.click();
      await vi.waitFor(() => expect(getSession()?.phase).toBe('result'));

      container.querySelector<HTMLButtonElement>('[data-testid="session-confirm-confirm"]')!.click();
      await vi.waitFor(() =>
        expect(container.querySelector('[data-testid="session-confirm-error"]')?.textContent).toBe(
          'save failed',
        ),
      );
      expect(getSession()?.phase).toBe('result');
    });

    it('defaults beginner mode from session experienceLevel', async () => {
      mountPhaseNavigation(container, {
        experienceLevel: 'beginner',
        submitForJudging: vi.fn().mockResolvedValue(sampleJudgeResult),
      });

      container.querySelector<HTMLButtonElement>('[data-testid="briefing-start"]')!.click();
      container.querySelector<HTMLButtonElement>('[data-testid="requirements-advance"]')!.click();
      setGraph(sampleGraph);
      container.querySelector<HTMLButtonElement>('[data-testid="submit-button"]')!.click();

      await vi.waitFor(() => expect(getSession()?.phase).toBe('result'));

      const toggle = container.querySelector<HTMLInputElement>('[data-testid="result-beginner-toggle"]');
      expect(toggle?.checked).toBe(true);
      expect(container.querySelector('[data-testid="result-summary"]')?.textContent).toBe(
        sampleJudgeResult.summary,
      );
    });

    it('renders FAIL verdict in result panel for bad golden graph via mocked fetch', async () => {
      const badGoldenResult: JudgeResult = {
        verdict: 'FAIL',
        score: 32,
        summary: 'O design conecta o cliente diretamente ao banco de dados.',
        nextStep: 'Adicione um app server entre o cliente e o banco.',
        strengths: [],
        criticalIssues: [
          {
            title: 'Client talks directly to database',
            explanation: 'There is no application layer to enforce redirect logic.',
            howToImprove: 'Add an app server between client and database.',
            whyItMatters: 'Direct DB access cannot scale or stay secure.',
            severity: 'blocker',
          },
        ],
        improvements: [],
        requirementCoverage: [],
        judgeDebate: {
          rigorous: 'FAIL — missing application tier.',
          pragmatic: 'Not viable for production traffic.',
          consensus: 'FAIL 32/100 — add an application layer.',
        },
      };

      const fetchMock = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(badGoldenResult), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      vi.stubGlobal('fetch', fetchMock);

      try {
        mountPhaseNavigation(container);

        container.querySelector<HTMLButtonElement>('[data-testid="briefing-start"]')!.click();
        container.querySelector<HTMLButtonElement>('[data-testid="requirements-advance"]')!.click();
        setGraph(getGoldenGraph('bad'));
        container.querySelector<HTMLButtonElement>('[data-testid="submit-button"]')!.click();

        await vi.waitFor(() => expect(getSession()?.phase).toBe('result'));

        expect(fetchMock).toHaveBeenCalledWith(
          '/api/judge',
          expect.objectContaining({ method: 'POST' }),
        );
        expect(getJudgeResult()?.verdict).toBe('FAIL');
        expect(container.querySelector('[data-testid="result-verdict-badge"]')?.textContent).toBe(
          VERDICT_LABELS.FAIL,
        );
        expect(container.querySelector('[data-testid="result-score"]')?.textContent).toContain('32');

        container.querySelector<HTMLButtonElement>('[data-testid="result-details-toggle"]')!.click();
        expect(
          container.querySelector('[data-testid="result-critical-issues"]')?.textContent,
        ).toContain('Client talks directly to database');
      } finally {
        vi.unstubAllGlobals();
        clearCachedJudgePayload();
      }
    });

    it('POST /api/judge includes locale from getLocale()', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            verdict: 'PASS',
            score: 85,
            summary: 'ok',
            nextStep: 'ok',
            strengths: [],
            criticalIssues: [],
            improvements: [],
            requirementCoverage: [],
            judgeDebate: { rigorous: '', pragmatic: '', consensus: '' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
      vi.stubGlobal('fetch', fetchMock);
      setLocale('en');

      try {
        mountPhaseNavigation(container);
        container.querySelector<HTMLButtonElement>('[data-testid="briefing-start"]')!.click();
        container.querySelector<HTMLButtonElement>('[data-testid="requirements-advance"]')!.click();
        setGraph(getGoldenGraph('good'));
        container.querySelector<HTMLButtonElement>('[data-testid="submit-button"]')!.click();

        await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
        const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string) as {
          locale?: string;
        };
        expect(body.locale).toBe('en');
      } finally {
        vi.unstubAllGlobals();
        clearCachedJudgePayload();
      }
    });
  });
});
