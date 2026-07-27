import { describe, expect, it } from 'vitest';
import type { ComponentType } from '../schema/component-types';
import { validateGraph } from '../validation/validate-graph';
import { getGoldenGraph } from './golden-graphs';

const GOLDEN_TIERS = ['good', 'medium', 'bad'] as const;

function nodeTypes(tier: (typeof GOLDEN_TIERS)[number]): ComponentType[] {
  return getGoldenGraph(tier).nodes.map((node) => node.type);
}

describe('getGoldenGraph', () => {
  it.each(GOLDEN_TIERS)('returns a graph that passes validateGraph for tier %s', (tier) => {
    const graph = getGoldenGraph(tier);
    const result = validateGraph(graph);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('good tier follows Client → LB → App → Cache → DB pattern', () => {
    expect(nodeTypes('good')).toEqual([
      'client_web',
      'load_balancer',
      'app_server',
      'cache_redis',
      'sql_db',
    ] satisfies ComponentType[]);
  });

  it('medium tier follows Client → App → DB without cache or load balancer', () => {
    const types = nodeTypes('medium');
    expect(types).toEqual(['client_web', 'app_server', 'sql_db'] satisfies ComponentType[]);
    expect(types).not.toContain('load_balancer');
    expect(types).not.toContain('cache_redis');
  });

  it('bad tier is Client → DB only', () => {
    expect(nodeTypes('bad')).toEqual(['client_web', 'sql_db'] satisfies ComponentType[]);
  });
});
