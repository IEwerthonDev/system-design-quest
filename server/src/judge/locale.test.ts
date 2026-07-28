import { describe, expect, it } from 'vitest';
import { getGoldenGraph, getProblem, URL_SHORTENER_ID } from '@sdq/shared';
import { judgeSubmission } from './dual-judge';
import { createMockLlmClient } from './mock-llm-client';
import { buildPragmaticPrompt, buildRigorousPrompt } from './prompts';
import { parseJudgeRequestBody } from '../routes/judge-parse';
import { resolveJudgeLocale } from './locale';

function baseInput(locale?: 'en' | 'pt-BR') {
  return {
    problemId: URL_SHORTENER_ID,
    requirements: {
      functional: ['Redirect HTTP 302'],
      nonFunctional: ['p99 under 100ms'],
    },
    graph: getGoldenGraph('good'),
    mode: 'study' as const,
    ...(locale ? { locale } : {}),
  };
}

describe('judge locale', () => {
  it('defaults missing locale to pt-BR', () => {
    expect(resolveJudgeLocale({})).toBe('pt-BR');
    expect(resolveJudgeLocale({ locale: undefined })).toBe('pt-BR');

    const parsed = parseJudgeRequestBody({
      problemId: URL_SHORTENER_ID,
      requirements: { functional: [], nonFunctional: [] },
      graph: getGoldenGraph('good'),
      mode: 'study',
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.input.locale).toBe('pt-BR');
    }
  });

  it('includes locale language instructions in prompts', () => {
    const problem = getProblem(URL_SHORTENER_ID)!;
    const enPrompt = buildRigorousPrompt(problem, baseInput('en'));
    const ptPrompt = buildPragmaticPrompt(problem, baseInput('pt-BR'));

    expect(enPrompt).toContain('in English');
    expect(ptPrompt).toMatch(/português do Brasil|pt-BR/);
  });

  it('mock strengths/issues/nextStep match requested locale', async () => {
    const client = createMockLlmClient();

    const en = await judgeSubmission(baseInput('en'), client);
    expect(en.strengths[0]?.title).toMatch(/Layered architecture/i);
    expect(en.nextStep).toMatch(/Review improvements|Start with/i);
    expect(en.summary).toMatch(/Your architecture|Your design/);

    const pt = await judgeSubmission(baseInput('pt-BR'), client);
    expect(pt.strengths[0]?.title).toMatch(/Arquitetura em camadas/i);
    expect(pt.nextStep).toMatch(/Revise as melhorias|Comece por/i);
    expect(pt.summary).toMatch(/Sua arquitetura|Seu design/);

    const defaulted = await judgeSubmission(baseInput(), client);
    expect(defaulted.strengths[0]?.title).toMatch(/Arquitetura em camadas/i);
  });

  it('mock critical issues are Portuguese for pt-BR medium graphs', async () => {
    const client = createMockLlmClient();
    const result = await judgeSubmission(
      {
        ...baseInput('pt-BR'),
        graph: getGoldenGraph('medium'),
      },
      client,
    );
    expect(result.criticalIssues.some((item) => /cache|load balancer/i.test(item.title))).toBe(
      true,
    );
    expect(result.criticalIssues[0]?.title).toMatch(/Sem /);
  });
});
