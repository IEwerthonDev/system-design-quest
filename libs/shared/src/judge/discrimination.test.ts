import { describe, expect, it } from 'vitest';
import { applyVerdictRules, getGoldenGraph, getProblem, normalizeGraph } from '@sdq/shared';
import type { ArchitectureGraph } from '@sdq/shared';
import { evaluateStructuralRubric } from './evaluate-structural-rubric';

function graphWithTypes(...types: string[]): ArchitectureGraph {
  return normalizeGraph({
    nodes: types.map((type, i) => ({
      id: `n${i}`,
      type: type as ArchitectureGraph['nodes'][number]['type'],
      label: type,
      position: { x: i * 2, y: 0, z: 0 },
    })),
    edges: [],
  });
}

function assertFailsOnProblem(graph: ArchitectureGraph, problemId: string): void {
  const problem = getProblem(problemId);
  expect(problem).toBeDefined();
  if (!problem) return;

  const report = evaluateStructuralRubric({
    problem,
    graph,
    locale: 'en',
  });
  const criticalIssues = [...report.blockers, ...report.majors];
  const verdict = applyVerdictRules(report.scoreHint, criticalIssues);

  expect(verdict).not.toBe('PASS');
  expect(verdict).not.toBe('PARTIAL');
  expect(verdict).toBe('FAIL');
  expect(report.blockers.some((b) => b.severity === 'blocker')).toBe(true);
}

/**
 * JR-06–09 / JR-26–27: curated cross-problem discrimination via structural-only path (no LLM).
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

  it('url-shortener good graph judged as youtube is FAIL (Easy→Medium)', () => {
    assertFailsOnProblem(getGoldenGraph('good'), 'youtube');
  });

  it('chat-shaped graph judged as stripe-payments is FAIL (Medium→Hard)', () => {
    const chat = getProblem('chat-system');
    expect(chat).toBeDefined();
    if (!chat) return;

    assertFailsOnProblem(graphWithTypes(...chat.rubric.expectedComponents), 'stripe-payments');
  });

  it('covers ≥3 curated discrimination pairs', () => {
    const pairs: Array<{ graph: ArchitectureGraph; problemId: string }> = [
      { graph: getGoldenGraph('good'), problemId: 'zoom-conference' },
      { graph: getGoldenGraph('good'), problemId: 'youtube' },
      {
        graph: graphWithTypes(
          'client_web',
          'websocket_gateway',
          'app_server',
          'message_queue',
          'nosql_db',
        ),
        problemId: 'stripe-payments',
      },
    ];
    expect(pairs.length).toBeGreaterThanOrEqual(3);
    for (const pair of pairs) {
      assertFailsOnProblem(pair.graph, pair.problemId);
    }
  });
});
