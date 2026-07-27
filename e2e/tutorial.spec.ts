import { expect, test } from '@playwright/test';

const mockJudgeResult = {
  verdict: 'PASS',
  score: 88,
  summary: 'Arquitetura sólida para um encurtador de URL.',
  nextStep: 'Adicione monitoramento.',
  strengths: [
    {
      title: 'Camadas',
      explanation: 'Client → LB',
      howToImprove: 'Ok',
      whyItMatters: 'Clareza',
      severity: 'minor' as const,
    },
  ],
  criticalIssues: [],
  improvements: [],
  requirementCoverage: [],
  judgeDebate: {
    rigorous: 'PASS',
    pragmatic: 'PASS',
    consensus: 'PASS',
  },
};

test.describe('tutorial happy path', () => {
  test('onboarding beginner → canvas graph → submit with mocked judge', async ({ page }) => {
    await page.route('**/api/judge', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockJudgeResult),
      });
    });

    await page.addInitScript(() => {
      window.localStorage.clear();
    });

    await page.goto('/');

    await page.getByTestId('onboarding-next').click();
    await page.getByTestId('onboarding-next').click();
    await page.getByTestId('onboarding-beginner').click();

    await expect(page.getByTestId('briefing-panel')).toBeVisible();
    await page.getByTestId('briefing-start').click();

    await expect(page.getByTestId('requirements-advance')).toBeVisible();
    await page.getByTestId('requirements-advance').click();

    await expect(page.getByTestId('component-palette')).toBeVisible();
    await expect(page.getByTestId('submit-button')).toBeVisible();

    // Place + connect via e2e hooks (avoid WebGL pixel interaction)
    await page.evaluate(() => {
      window.__SDQ_E2E__!.setGraph({
        nodes: [
          {
            id: 'comp-1',
            type: 'client_web',
            label: 'Web Browser',
            position: { x: 0, y: 0, z: 0 },
          },
          {
            id: 'comp-2',
            type: 'load_balancer',
            label: 'Load Balancer',
            position: { x: 2, y: 0, z: 0 },
          },
        ],
        edges: [{ id: 'edge-1', from: 'comp-1', to: 'comp-2', direction: 'forward' }],
      });
    });

    const nodeCount = await page.evaluate(
      () => window.__GAME_STATE__.graph.nodes.length,
    );
    expect(nodeCount).toBeGreaterThanOrEqual(1);

    // Guided overlay intercepts pointer events — submit via DOM event
    await page.evaluate(() => {
      const button = document.querySelector<HTMLButtonElement>('[data-testid="submit-button"]');
      button?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true, view: window }),
      );
    });

    await expect
      .poll(async () => page.evaluate(() => window.__GAME_STATE__.phase), {
        timeout: 15_000,
      })
      .toBe('result');

    await expect
      .poll(
        async () => page.evaluate(() => window.__GAME_STATE__.judgeResult?.verdict ?? null),
        { timeout: 15_000 },
      )
      .toBe('PASS');
  });
});
