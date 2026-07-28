import { describe, expect, it } from 'vitest';
import { localizeProblem } from '../i18n/localize-problem';
import { listProblems } from './index';
import { PROBLEM_COPY_EN } from './copy-en';

describe('bilingual problem copy', () => {
  it('every problem has en and pt-BR copy without undefined title/description', () => {
    const problems = listProblems();
    expect(problems.length).toBeGreaterThan(0);

    for (const problem of problems) {
      expect(PROBLEM_COPY_EN[problem.id], `missing EN map entry for ${problem.id}`).toBeDefined();
      expect(problem.copy.en).toBeDefined();
      expect(problem.copy['pt-BR']).toBeDefined();

      for (const locale of ['en', 'pt-BR'] as const) {
        const copy = problem.copy[locale];
        expect(copy.title, `${problem.id} ${locale} title`).toBeTruthy();
        expect(copy.description, `${problem.id} ${locale} description`).toBeTruthy();
        expect(copy.constraints.length).toBeGreaterThanOrEqual(3);
        expect(copy.suggestedRequirements.functional.length).toBeGreaterThanOrEqual(2);
        expect(copy.suggestedRequirements.nonFunctional.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('unit test fails if any problem is missing a locale entry', () => {
    for (const problem of listProblems()) {
      expect(Object.keys(problem.copy).sort()).toEqual(['en', 'pt-BR'].sort());
    }
  });

  it('localizeProblem picks the requested locale fields', () => {
    const problem = listProblems().find((entry) => entry.id === 'url-shortener');
    expect(problem).toBeDefined();
    if (!problem) {
      return;
    }

    const en = localizeProblem(problem, 'en');
    const pt = localizeProblem(problem, 'pt-BR');

    expect(en.title).toBe('URL Shortener');
    expect(pt.title).toBe('Encurtador de URL');
    expect(en.description).not.toEqual(pt.description);
    expect(en.constraints[0]).toMatch(/Short codes|Base62/i);
    expect(pt.constraints[0]).toMatch(/Códigos curtos|Base62/i);
  });

  it('keeps industry component types / rubric English regardless of locale', () => {
    const problem = listProblems().find((entry) => entry.id === 'url-shortener')!;
    const en = localizeProblem(problem, 'en');
    const pt = localizeProblem(problem, 'pt-BR');

    expect(en.rubric.expectedComponents).toEqual(pt.rubric.expectedComponents);
    expect(en.rubric.expectedComponents).toContain('load_balancer');
    expect(en.rubric.criticalPatterns[0]).toMatch(/[A-Za-z]/);
    expect(en.tags).toEqual(pt.tags);
  });
});
