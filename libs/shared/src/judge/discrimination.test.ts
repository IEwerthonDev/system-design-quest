import { describe, expect, it } from 'vitest';
import { applyVerdictRules, getGoldenGraph, getProblem } from '@sdq/shared';
import { evaluateStructuralRubric } from './evaluate-structural-rubric';

/**
 * JR-06–08: curated cross-problem discrimination via structural-only path (no LLM).
 */
describe('discrimination suite (structural-only)', () => {
  it('url-shortener good graph judged as zoom-conference is not PASS or PARTIAL', () => {
    const zoom = getProblem('zoom-conference');
    expect(zoom).toBeDefined();
    if (!zoom) return;

    const shortenerGood = getGoldenGraph('good');
    const report = evaluateStructuralRubric({
      problem: zoom,
      graph: shortenerGood,
      locale: 'en',
    });

    const criticalIssues = [...report.blockers, ...report.majors];
    const verdict = applyVerdictRules(report.scoreHint, criticalIssues);

    expect(verdict).not.toBe('PASS');
    expect(verdict).not.toBe('PARTIAL');
    expect(verdict).toBe('FAIL');
    expect(report.codes).toContain('missing_component');
    expect(
      report.blockers.some(
        (b) =>
          b.severity === 'blocker' &&
          (b.relatedComponents?.includes('media_server') ||
            b.relatedComponents?.includes('signaling_server') ||
            b.relatedComponents?.includes('turn_server')),
      ),
    ).toBe(true);
  });
});
