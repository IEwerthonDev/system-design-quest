import { describe, expect, it } from 'vitest';
import { getProblem, listProblems, URL_SHORTENER, URL_SHORTENER_ID } from './index';

describe('URL Shortener problem definition', () => {
  it('defines a complete Problem with briefing, metrics, constraints, and easy difficulty', () => {
    expect(URL_SHORTENER.id).toBe(URL_SHORTENER_ID);
    expect(URL_SHORTENER.title).toBeTruthy();
    expect(URL_SHORTENER.difficulty).toBe('easy');
    expect(URL_SHORTENER.description.length).toBeGreaterThan(50);
    expect(URL_SHORTENER.metrics.dau).toBeGreaterThan(0);
    expect(URL_SHORTENER.metrics.readRps).toBeGreaterThan(0);
    expect(URL_SHORTENER.metrics.writeRps).toBeGreaterThan(0);
    expect(URL_SHORTENER.metrics.storageGb).toBeGreaterThan(0);
    expect(URL_SHORTENER.constraints.length).toBeGreaterThanOrEqual(3);
    expect(URL_SHORTENER.tags.length).toBeGreaterThanOrEqual(2);
    expect(URL_SHORTENER.isTutorial).toBe(true);
  });

  it('includes at least 3 functional and 2 non-functional requirement suggestions', () => {
    expect(URL_SHORTENER.suggestedRequirements.functional.length).toBeGreaterThanOrEqual(3);
    expect(URL_SHORTENER.suggestedRequirements.nonFunctional.length).toBeGreaterThanOrEqual(2);

    for (const fr of URL_SHORTENER.suggestedRequirements.functional) {
      expect(fr.length).toBeGreaterThanOrEqual(10);
    }
    for (const nfr of URL_SHORTENER.suggestedRequirements.nonFunctional) {
      expect(nfr.length).toBeGreaterThanOrEqual(10);
    }
  });

  it('getProblem returns the URL Shortener definition by id', () => {
    const problem = getProblem('url-shortener');

    expect(problem).toBe(URL_SHORTENER);
    expect(getProblem('unknown')).toBeUndefined();
  });

  it('listProblems includes URL Shortener as the first tutorial problem', () => {
    const problems = listProblems();

    expect(problems).toContain(URL_SHORTENER);
    expect(problems.some((p) => p.isTutorial)).toBe(true);
  });
});
