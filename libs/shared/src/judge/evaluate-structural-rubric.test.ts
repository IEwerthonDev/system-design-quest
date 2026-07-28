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

describe('evaluateStructuralRubric (Deep antiPatterns + configRules)', () => {
  it('fires sql-without-cache anti-pattern when sql_db present without cache_redis', () => {
    const problem = getProblem('url-shortener');
    expect(problem).toBeDefined();
    if (!problem) return;

    const report = evaluateStructuralRubric({
      problem,
      graph: graphWithTypes('client_web', 'load_balancer', 'app_server', 'sql_db'),
      locale: 'en',
    });

    expect(report.depth).toBe('deep');
    expect(report.codes).toContain('sql-without-cache');
    expect(
      report.blockers.some(
        (b) => b.severity === 'blocker' && b.relatedComponents?.includes('sql_db'),
      ),
    ).toBe(true);
  });

  it('does not fire sql-without-cache when cache_redis is present', () => {
    const problem = getProblem('url-shortener');
    expect(problem).toBeDefined();
    if (!problem) return;

    const report = evaluateStructuralRubric({
      problem,
      graph: graphWithTypes(...problem.rubric.expectedComponents),
      locale: 'en',
    });

    expect(report.codes).not.toContain('sql-without-cache');
  });

  it('hitRate-too-low on url-shortener changes structural outcome vs adequate hitRate', () => {
    const problem = getProblem('url-shortener');
    expect(problem).toBeDefined();
    if (!problem) return;

    const types = problem.rubric.expectedComponents;
    const lowHit = normalizeGraph({
      nodes: types.map((type, i) => ({
        id: `n${i}`,
        type: type as ArchitectureGraph['nodes'][number]['type'],
        label: type,
        position: { x: i * 2, y: 0, z: 0 },
        ...(type === 'cache_redis' ? { config: { kind: 'cache' as const, hitRate: 10 } } : {}),
      })),
      edges: [],
    });
    const highHit = normalizeGraph({
      nodes: types.map((type, i) => ({
        id: `n${i}`,
        type: type as ArchitectureGraph['nodes'][number]['type'],
        label: type,
        position: { x: i * 2, y: 0, z: 0 },
        ...(type === 'cache_redis' ? { config: { kind: 'cache' as const, hitRate: 95 } } : {}),
      })),
      edges: [],
    });

    const lowReport = evaluateStructuralRubric({ problem, graph: lowHit, locale: 'en' });
    const highReport = evaluateStructuralRubric({ problem, graph: highHit, locale: 'en' });

    expect(lowReport.codes).toContain('hitRate-too-low');
    expect(highReport.codes).not.toContain('hitRate-too-low');
    expect(lowReport.majors.length + lowReport.blockers.length).toBeGreaterThan(
      highReport.majors.length + highReport.blockers.length,
    );
    expect(lowReport.scoreHint).toBeLessThan(highReport.scoreHint);
  });

  it('fires auto-increment-db-ids major when unique-id-gen graph includes sql_db', () => {
    const problem = getProblem('unique-id-gen');
    expect(problem).toBeDefined();
    if (!problem) return;

    const report = evaluateStructuralRubric({
      problem,
      graph: graphWithTypes('app_server', 'sql_db'),
      locale: 'en',
    });

    expect(report.codes).toContain('auto-increment-db-ids');
    expect(report.majors.some((m) => m.severity === 'major')).toBe(true);
  });

  it('skips Deep antiPatterns on empty graph for requiredAnyOf rules', () => {
    const problem = getProblem('rate-limiter');
    expect(problem).toBeDefined();
    if (!problem) return;

    const report = evaluateStructuralRubric({
      problem,
      graph: emptyGraph(),
      locale: 'en',
    });

    expect(report.codes).not.toContain('in-memory-only-counter');
    expect(report.codes).toContain('missing_component');
  });

  it('fires zoom no-sfu-media-path when media_server is absent on a non-empty graph', () => {
    const problem = getProblem('zoom-conference');
    expect(problem).toBeDefined();
    if (!problem) return;

    const report = evaluateStructuralRubric({
      problem,
      graph: graphWithTypes('client_web', 'signaling_server', 'turn_server'),
      locale: 'en',
    });

    expect(report.codes).toContain('no-sfu-media-path');
    expect(
      report.blockers.some(
        (b) => b.severity === 'blocker' && b.relatedComponents?.includes('media_server'),
      ),
    ).toBe(true);
  });

  it('fires stripe no-idempotency-queue when message_queue is absent', () => {
    const problem = getProblem('stripe-payments');
    expect(problem).toBeDefined();
    if (!problem) return;

    const report = evaluateStructuralRubric({
      problem,
      graph: graphWithTypes('api_gateway', 'app_server', 'sql_db'),
      locale: 'en',
    });

    expect(report.codes).toContain('no-idempotency-queue');
    expect(report.blockers.some((b) => b.severity === 'blocker')).toBe(true);
  });

  it('Core Hard Deep rubrics emit ≥2 scale checklist lines', () => {
    for (const id of ['zoom-conference', 'ticketmaster', 'stripe-payments'] as const) {
      const problem = getProblem(id);
      expect(problem).toBeDefined();
      if (!problem) continue;

      const report = evaluateStructuralRubric({
        problem,
        graph: emptyGraph(),
        locale: 'en',
      });

      expect(report.scaleChecklistLines.length).toBeGreaterThanOrEqual(2);
      expect(problem.rubric.scaleChecklist?.en?.length ?? 0).toBeGreaterThanOrEqual(2);
    }
  });
});
