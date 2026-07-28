import { describe, expect, it } from 'vitest';
import { getGoldenGraph } from '@sdq/shared';
import type { ArchitectureGraph } from '@sdq/shared';
import {
  createMockLlmClient,
  graphTopologySignature,
  mockJudgePartial,
  resolveGraphTier,
  shouldUseMock,
} from './mock-llm-client';

function cloneGraphWithRenamedIds(graph: ArchitectureGraph): ArchitectureGraph {
  return {
    nodes: graph.nodes.map((node, index) => ({
      ...node,
      id: `renamed-node-${index}`,
    })),
    edges: graph.edges.map((edge, index) => ({
      ...edge,
      id: `renamed-edge-${index}`,
      from: `renamed-node-${graph.nodes.findIndex((n) => n.id === edge.from)}`,
      to: `renamed-node-${graph.nodes.findIndex((n) => n.id === edge.to)}`,
    })),
  };
}

describe('shouldUseMock', () => {
  it('returns true when JUDGE_USE_MOCK is true', () => {
    expect(shouldUseMock({ JUDGE_USE_MOCK: 'true', LLM_API_KEY: 'sk-test' })).toBe(true);
  });

  it('returns true when LLM_API_KEY is missing', () => {
    expect(shouldUseMock({})).toBe(true);
    expect(shouldUseMock({ LLM_API_KEY: '   ' })).toBe(true);
  });

  it('returns false when LLM_API_KEY is set and JUDGE_USE_MOCK is not true', () => {
    expect(shouldUseMock({ LLM_API_KEY: 'sk-live' })).toBe(false);
    expect(shouldUseMock({ LLM_API_KEY: 'sk-live', JUDGE_USE_MOCK: 'false' })).toBe(false);
  });
});

describe('resolveGraphTier', () => {
  it.each(['good', 'medium', 'bad'] as const)('detects golden %s tier by node types', (tier) => {
    expect(resolveGraphTier(getGoldenGraph(tier))).toBe(tier);
  });

  it('detects tier from isomorphic graph with different node ids', () => {
    const renamed = cloneGraphWithRenamedIds(getGoldenGraph('good'));
    expect(resolveGraphTier(renamed)).toBe('good');
    expect(graphTopologySignature(renamed)).toBe(graphTopologySignature(getGoldenGraph('good')));
  });

  it('uses hash fallback deterministically for unknown graphs', () => {
    const unknown: ArchitectureGraph = {
      nodes: [
        {
          id: 'cdn-1',
          type: 'cdn',
          label: 'CDN',
          position: { x: 0, y: 0, z: 0 },
        },
        {
          id: 'dns-1',
          type: 'dns',
          label: 'DNS',
          position: { x: 1, y: 0, z: 0 },
        },
      ],
      edges: [{ id: 'e1', from: 'dns-1', to: 'cdn-1', direction: 'forward' }],
    };

    expect(resolveGraphTier(unknown)).toBe(resolveGraphTier(unknown));
    expect(['good', 'medium', 'bad']).toContain(resolveGraphTier(unknown));
  });
});

describe('createMockLlmClient', () => {
  it('returns deterministic JudgePartialResult per judge role and graph tier', async () => {
    const goodGraph = getGoldenGraph('good');

    const rigorous = await mockJudgePartial('rigorous', goodGraph, 'en');
    const pragmatic = await mockJudgePartial('pragmatic', goodGraph, 'en');

    expect(rigorous.score).toBe(82);
    expect(pragmatic.score).toBe(86);
    expect(rigorous.rationale).toContain('scalability');
    expect(pragmatic.rationale).toContain('MVP');
  });

  it('returns bad-tier partial with blocker critical issue', async () => {
    const bad = await mockJudgePartial('rigorous', getGoldenGraph('bad'), 'en');

    expect(bad.score).toBe(30);
    expect(bad.criticalIssues).toContainEqual(
      expect.objectContaining({ severity: 'blocker' }),
    );
  });

  it('returns medium-tier partial mentioning scale gaps', async () => {
    const medium = await mockJudgePartial('pragmatic', getGoldenGraph('medium'), 'en');

    expect(medium.score).toBe(73);
    expect(medium.criticalIssues.some((issue) => issue.title.includes('cache'))).toBe(true);
  });

  it('defaults mock narrative to pt-BR when locale omitted', async () => {
    const rigorous = await mockJudgePartial('rigorous', getGoldenGraph('good'));
    expect(rigorous.rationale).toMatch(/escalabilidade|Atende/);
  });

  it('returns the same result for repeated calls with the same prompt', async () => {
    const client = createMockLlmClient();
    const graph = getGoldenGraph('medium');
    const prompt = { role: 'rigorous' as const, graph };

    const first = await client.completeJson(prompt);
    const second = await client.completeJson(prompt);

    expect(second).toEqual(first);
  });
});
