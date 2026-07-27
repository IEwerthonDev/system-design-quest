import { createHash } from 'node:crypto';
import type { ArchitectureGraph } from '@sdq/shared';
import { getGoldenGraph, type GoldenGraphTier } from '@sdq/shared';
import type { JudgePartialResult } from '@sdq/shared';
import {
  getUrlShortenerPartialResult,
  type JudgeRole,
} from './fixtures/url-shortener-responses';

export type { JudgeRole } from './fixtures/url-shortener-responses';

export interface JudgePrompt {
  role: JudgeRole;
  graph: ArchitectureGraph;
}

export interface LlmClient {
  completeJson<T>(prompt: JudgePrompt): Promise<T>;
}

const GOLDEN_TIERS: GoldenGraphTier[] = ['good', 'medium', 'bad'];

/** Stable topology signature: component types + directed edges by type (ignores node ids). */
export function graphTopologySignature(graph: ArchitectureGraph): string {
  const typeById = new Map(graph.nodes.map((node) => [node.id, node.type]));
  const nodeTypes = [...typeById.values()].sort().join(',');
  const edgeSig = graph.edges
    .map((edge) => `${typeById.get(edge.from) ?? '?'}->${typeById.get(edge.to) ?? '?'}`)
    .sort()
    .join('|');
  return `${nodeTypes}::${edgeSig}`;
}

/** Match input graph to a golden tier via node-type set or topology signature. */
export function resolveGraphTier(graph: ArchitectureGraph): GoldenGraphTier {
  const inputTypes = graph.nodes
    .map((node) => node.type)
    .sort()
    .join(',');

  for (const tier of GOLDEN_TIERS) {
    const golden = getGoldenGraph(tier);
    const goldenTypes = golden.nodes
      .map((node) => node.type)
      .sort()
      .join(',');
    if (inputTypes === goldenTypes) {
      return tier;
    }
  }

  const inputSignature = graphTopologySignature(graph);
  for (const tier of GOLDEN_TIERS) {
    if (graphTopologySignature(getGoldenGraph(tier)) === inputSignature) {
      return tier;
    }
  }

  return hashFallbackTier(inputSignature);
}

function hashFallbackTier(signature: string): GoldenGraphTier {
  const digest = createHash('sha256').update(signature).digest('hex');
  const index = Number.parseInt(digest.slice(0, 8), 16) % GOLDEN_TIERS.length;
  return GOLDEN_TIERS[index]!;
}

/** True when mock fixtures should be used instead of a live LLM API. */
export function shouldUseMock(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.JUDGE_USE_MOCK === 'true') {
    return true;
  }
  const apiKey = env.LLM_API_KEY?.trim();
  return !apiKey;
}

export function createMockLlmClient(): LlmClient {
  return {
    async completeJson<T>(prompt: JudgePrompt): Promise<T> {
      const tier = resolveGraphTier(prompt.graph);
      const partial = getUrlShortenerPartialResult(prompt.role, tier);
      return partial as T;
    },
  };
}

export async function mockJudgePartial(
  role: JudgeRole,
  graph: ArchitectureGraph,
): Promise<JudgePartialResult> {
  const client = createMockLlmClient();
  return client.completeJson<JudgePartialResult>({ role, graph });
}
