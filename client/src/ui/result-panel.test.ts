import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { JudgeResult } from '@sdq/shared';
import {
  getCollapsedSummary,
  mountResultPanel,
  VERDICT_LABELS,
} from './result-panel';

const sampleResult: JudgeResult = {
  verdict: 'PARTIAL',
  score: 75,
  summary: 'Seu design cobre o básico, mas falta cache para leituras rápidas.',
  nextStep: 'Adicione Redis na frente do banco para acelerar redirects.',
  strengths: [
    {
      title: 'Caminho em camadas',
      explanation: 'O tráfego passa por um app server antes do banco.',
      howToImprove: 'Documente caminhos de leitura e escrita.',
      whyItMatters: 'Camadas facilitam escalar cada parte.',
    },
  ],
  criticalIssues: [
    {
      title: 'Sem cache',
      explanation: 'Redirects vão direto ao banco em todo request.',
      howToImprove: 'Adicione Redis para lookups frequentes.',
      whyItMatters: 'Read-heavy workloads exigem cache.',
      severity: 'major',
    },
  ],
  improvements: [
    {
      title: 'Load Balancer',
      explanation: 'Um único app server vira gargalo.',
      howToImprove: 'Coloque um LB na frente de múltiplas instâncias.',
      whyItMatters: 'Distribui tráfego e melhora disponibilidade.',
    },
  ],
  requirementCoverage: [
    {
      requirement: 'Redirect HTTP 302',
      type: 'functional',
      status: 'partial',
      explanation: 'App existe, mas latência do redirect não está otimizada.',
    },
  ],
  judgeDebate: {
    rigorous: 'Falta cache e LB para produção.',
    pragmatic: 'Protótipo aceitável; adicione cache antes do pico.',
    consensus: 'Score 75/100 — adicionar cache eleva prontidão para produção.',
  },
};

describe('result panel', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
  });

  afterEach(() => {
    container.remove();
    document.getElementById('sdq-result-styles')?.remove();
  });

  it('renders verdict badge, score, summary, and next step in collapsed view', () => {
    mountResultPanel(container, sampleResult, {
      beginnerMode: true,
      onToggleBeginner: () => undefined,
    });

    expect(container.querySelector('[data-testid="result-verdict-badge"]')?.textContent).toBe(
      VERDICT_LABELS.PARTIAL,
    );
    expect(container.querySelector('[data-testid="result-score"]')?.textContent).toContain('75');
    expect(container.querySelector('[data-testid="result-summary"]')?.textContent).toBe(
      sampleResult.summary,
    );
    expect(container.querySelector('[data-testid="result-next-step"]')?.textContent).toContain(
      sampleResult.nextStep,
    );
    expect(
      container.querySelector('[data-testid="result-details"]')?.classList.contains(
        'sdq-result__details--expanded',
      ),
    ).toBe(false);
  });

  it('expands technical details with strengths, issues, improvements, coverage, and debate', () => {
    mountResultPanel(container, sampleResult, {
      beginnerMode: true,
      onToggleBeginner: () => undefined,
    });

    container.querySelector<HTMLButtonElement>('[data-testid="result-details-toggle"]')?.click();

    expect(
      container.querySelector('[data-testid="result-strengths"]')?.textContent,
    ).toContain('Caminho em camadas');
    expect(
      container.querySelector('[data-testid="result-critical-issues"]')?.textContent,
    ).toContain('Sem cache');
    expect(
      container.querySelector('[data-testid="result-improvements"]')?.textContent,
    ).toContain('Load Balancer');
    expect(
      container.querySelector('[data-testid="result-improvements"]')?.textContent,
    ).toContain('Como melhorar: Coloque um LB na frente de múltiplas instâncias.');
    expect(
      container.querySelector('[data-testid="result-improvements"]')?.textContent,
    ).toContain('Por quê: Distribui tráfego e melhora disponibilidade.');
    expect(
      container.querySelector('[data-testid="result-requirement-coverage"]')?.textContent,
    ).toContain('Redirect HTTP 302');
    expect(
      container.querySelector('[data-testid="result-debate-rigorous"]')?.textContent,
    ).toContain('Falta cache e LB para produção.');
    expect(
      container.querySelector('[data-testid="result-debate-pragmatic"]')?.textContent,
    ).toContain('Protótipo aceitável');
    expect(
      container.querySelector('[data-testid="result-debate-consensus"]')?.textContent,
    ).toContain('Score 75/100');
  });

  it('uses simple summary in beginner mode and consensus in advanced mode', () => {
    const panel = mountResultPanel(container, sampleResult, {
      beginnerMode: true,
      onToggleBeginner: () => undefined,
    });

    expect(getCollapsedSummary(sampleResult, true)).toBe(sampleResult.summary);
    expect(container.querySelector('[data-testid="result-summary"]')?.textContent).toBe(
      sampleResult.summary,
    );

    panel.setBeginnerMode(false);

    expect(container.querySelector('[data-testid="result-summary"]')?.textContent).toBe(
      sampleResult.judgeDebate.consensus,
    );
  });

  it('calls onToggleBeginner when beginner toggle changes', () => {
    const onToggleBeginner = vi.fn();

    mountResultPanel(container, sampleResult, {
      beginnerMode: true,
      onToggleBeginner,
    });

    const toggle = container.querySelector<HTMLInputElement>('[data-testid="result-beginner-toggle"]');
    toggle!.checked = false;
    toggle!.dispatchEvent(new Event('change'));

    expect(onToggleBeginner).toHaveBeenCalledWith(false);
  });

  it('renders FAIL verdict badge for failing submissions', () => {
    mountResultPanel(
      container,
      {
        ...sampleResult,
        verdict: 'FAIL',
        score: 42,
      },
      {
        beginnerMode: true,
        onToggleBeginner: () => undefined,
      },
    );

    expect(container.querySelector('[data-testid="result-verdict-badge"]')?.textContent).toBe(
      VERDICT_LABELS.FAIL,
    );
    expect(container.querySelector('[data-testid="result-score"]')?.textContent).toContain('42');
  });
});
