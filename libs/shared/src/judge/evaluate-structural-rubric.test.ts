import { describe, expect, it } from 'vitest';
import { getProblem, normalizeGraph, type ArchitectureGraph } from '@sdq/shared';
import { evaluateStructuralRubric } from './evaluate-structural-rubric';

function emptyGraph(): ArchitectureGraph {
  return normalizeGraph({ nodes: [], edges: [] });
}

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

describe('evaluateStructuralRubric (Baseline)', () => {
  it('marks missing must-have components as blockers with code missing_component on empty graph', () => {
    const problem = getProblem('zoom-conference');
    expect(problem).toBeDefined();
    if (!problem) return;

    const report = evaluateStructuralRubric({
      problem,
      graph: emptyGraph(),
      locale: 'en',
    });

    expect(report.codes).toContain('missing_component');
    expect(report.blockers.length).toBeGreaterThanOrEqual(1);
    expect(report.blockers.every((b) => b.severity === 'blocker')).toBe(true);
    expect(report.blockers.some((b) => b.relatedComponents?.includes('media_server'))).toBe(true);
  });

  it('emits at least one scaleChecklistLines entry', () => {
    const problem = getProblem('url-shortener');
    expect(problem).toBeDefined();
    if (!problem) return;

    const report = evaluateStructuralRubric({
      problem,
      graph: emptyGraph(),
      locale: 'en',
    });

    expect(report.scaleChecklistLines.length).toBeGreaterThanOrEqual(1);
    expect(report.scaleChecklistLines[0]?.length).toBeGreaterThan(0);
  });

  it('returns StructuralReport with scoreHint and codes', () => {
    const problem = getProblem('rate-limiter');
    expect(problem).toBeDefined();
    if (!problem) return;

    const report = evaluateStructuralRubric({
      problem,
      graph: emptyGraph(),
      locale: 'pt-BR',
    });

    expect(report.problemId).toBe('rate-limiter');
    expect(report.scoreHint).toBeGreaterThanOrEqual(0);
    expect(report.scoreHint).toBeLessThanOrEqual(100);
    expect(Array.isArray(report.codes)).toBe(true);
    expect(report.depth).toMatch(/^(baseline|deep)$/);
  });

  it('does not emit missing_component when all must-haves are present', () => {
    const problem = getProblem('zoom-conference');
    expect(problem).toBeDefined();
    if (!problem) return;

    const report = evaluateStructuralRubric({
      problem,
      graph: graphWithTypes(...problem.rubric.expectedComponents),
      locale: 'en',
    });

    expect(report.codes).not.toContain('missing_component');
    expect(report.blockers.filter((b) => b.severity === 'blocker')).toHaveLength(0);
    expect(report.strengths.length).toBeGreaterThanOrEqual(1);
    expect(report.scoreHint).toBeGreaterThanOrEqual(70);
  });

  it('emits missing_component when a single expected type is absent', () => {
    const problem = getProblem('zoom-conference');
    expect(problem).toBeDefined();
    if (!problem) return;

    const partial = problem.rubric.expectedComponents.filter((t) => t !== 'media_server');
    const report = evaluateStructuralRubric({
      problem,
      graph: graphWithTypes(...partial),
      locale: 'en',
    });

    expect(report.codes).toContain('missing_component');
    expect(
      report.blockers.some(
        (b) => b.severity === 'blocker' && b.relatedComponents?.includes('media_server'),
      ),
    ).toBe(true);
  });
});
