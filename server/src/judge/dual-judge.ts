import {
  applyVerdictRules,
  getProblem,
  type FeedbackItem,
  type GoldenGraphTier,
  type JudgeInput,
  type JudgePartialResult,
  type JudgeResult,
  type ReqCoverageItem,
  type Verdict,
} from '@sdq/shared';
import type { LlmClient } from './mock-llm-client';
import { resolveGraphTier } from './mock-llm-client';
import { buildPragmaticPrompt, buildRigorousPrompt } from './prompts';

const STATUS_RANK: Record<ReqCoverageItem['status'], number> = {
  missing: 0,
  partial: 1,
  covered: 2,
};

function dedupeFeedbackItems(items: FeedbackItem[]): FeedbackItem[] {
  const seen = new Set<string>();
  const merged: FeedbackItem[] = [];
  for (const item of items) {
    if (seen.has(item.title)) {
      continue;
    }
    seen.add(item.title);
    merged.push(item);
  }
  return merged;
}

function mergeReqCoverageItems(items: ReqCoverageItem[]): ReqCoverageItem[] {
  const byRequirement = new Map<string, ReqCoverageItem>();
  for (const item of items) {
    const existing = byRequirement.get(item.requirement);
    if (!existing || STATUS_RANK[item.status] < STATUS_RANK[existing.status]) {
      byRequirement.set(item.requirement, item);
    }
  }
  return [...byRequirement.values()];
}

function defaultCoverageStatus(tier: GoldenGraphTier, index: number): ReqCoverageItem['status'] {
  if (tier === 'good') {
    return 'covered';
  }
  if (tier === 'medium') {
    return index % 2 === 0 ? 'partial' : 'missing';
  }
  return 'missing';
}

function defaultCoverageExplanation(
  status: ReqCoverageItem['status'],
  type: ReqCoverageItem['type'],
): string {
  if (status === 'covered') {
    return 'Declared requirement is reflected in the submitted architecture layers.';
  }
  if (status === 'partial') {
    return type === 'functional'
      ? 'Architecture hints at this behavior but lacks explicit components or paths.'
      : 'Non-functional target is partially addressed; scaling or latency gaps remain.';
  }
  return 'No clear component or data path in the graph covers this declared requirement.';
}

/** Fill requirementCoverage for every declared requirement, merging judge outputs first. */
export function buildRequirementCoverage(
  input: JudgeInput,
  rigorous: JudgePartialResult,
  pragmatic: JudgePartialResult,
): ReqCoverageItem[] {
  const tier = resolveGraphTier(input.graph);
  const merged = mergeReqCoverageItems([
    ...rigorous.requirementCoverage,
    ...pragmatic.requirementCoverage,
  ]);
  const byRequirement = new Map(merged.map((item) => [item.requirement, item]));

  const declared: ReqCoverageItem[] = [];
  let index = 0;

  for (const requirement of input.requirements.functional) {
    const existing = byRequirement.get(requirement);
    if (existing) {
      declared.push(existing);
    } else {
      const status = defaultCoverageStatus(tier, index++);
      declared.push({
        requirement,
        type: 'functional',
        status,
        explanation: defaultCoverageExplanation(status, 'functional'),
      });
    }
  }

  for (const requirement of input.requirements.nonFunctional) {
    const existing = byRequirement.get(requirement);
    if (existing) {
      declared.push(existing);
    } else {
      const status = defaultCoverageStatus(tier, index++);
      declared.push({
        requirement,
        type: 'nonFunctional',
        status,
        explanation: defaultCoverageExplanation(status, 'nonFunctional'),
      });
    }
  }

  return declared;
}

function buildSummary(verdict: Verdict, score: number): string {
  if (verdict === 'PASS') {
    return `Your architecture scored ${score}/100 and meets the core expectations for this problem.`;
  }
  if (verdict === 'PARTIAL') {
    return `Your design scored ${score}/100. It covers basics but still has gaps to close before production readiness.`;
  }
  return `Your design scored ${score}/100. Critical layering or scalability issues must be fixed before this solution is viable.`;
}

function buildNextStep(verdict: Verdict, criticalIssues: FeedbackItem[]): string {
  if (verdict === 'PASS') {
    return 'Review improvements for polish, then try a harder problem or add redundancy details.';
  }
  if (criticalIssues.length > 0) {
    return `Start with: ${criticalIssues[0]!.title} — ${criticalIssues[0]!.howToImprove}`;
  }
  return 'Add missing tiers (cache, load balancing, or app layer) and reconnect the data flow.';
}

/** Merge dual judge partial results into consensus fields (verdict applied in judgeSubmission). */
export function mergeConsensus(
  rigorous: JudgePartialResult,
  pragmatic: JudgePartialResult,
  input: JudgeInput,
): Pick<
  JudgeResult,
  'score' | 'strengths' | 'criticalIssues' | 'improvements' | 'requirementCoverage' | 'judgeDebate'
> {
  const score = Math.min(rigorous.score, pragmatic.score);
  const criticalIssues = dedupeFeedbackItems([
    ...rigorous.criticalIssues,
    ...pragmatic.criticalIssues,
  ]);

  return {
    score,
    strengths: dedupeFeedbackItems([...rigorous.strengths, ...pragmatic.strengths]),
    criticalIssues,
    improvements: dedupeFeedbackItems([
      ...rigorous.improvements,
      ...pragmatic.improvements,
    ]),
    requirementCoverage: buildRequirementCoverage(input, rigorous, pragmatic),
    judgeDebate: {
      rigorous: rigorous.rationale,
      pragmatic: pragmatic.rationale,
      consensus: `Both judges converged on score ${score}/100 after weighing scalability rigor against pragmatic trade-offs.`,
    },
  };
}

export class UnknownProblemError extends Error {
  constructor(problemId: string) {
    super(`Unknown problem: ${problemId}`);
    this.name = 'UnknownProblemError';
  }
}

/** Run dual-judge orchestration: parallel LLM calls → consensus merge → AD-016 verdict. */
export async function judgeSubmission(input: JudgeInput, client: LlmClient): Promise<JudgeResult> {
  const problem = getProblem(input.problemId);
  if (!problem) {
    throw new UnknownProblemError(input.problemId);
  }

  // Prompts are consumed by the real LLM client (T5); mock uses role + graph only.
  buildRigorousPrompt(problem, input);
  buildPragmaticPrompt(problem, input);

  const [rigorous, pragmatic] = await Promise.all([
    client.completeJson<JudgePartialResult>({ role: 'rigorous', graph: input.graph }),
    client.completeJson<JudgePartialResult>({ role: 'pragmatic', graph: input.graph }),
  ]);

  const merged = mergeConsensus(rigorous, pragmatic, input);
  const verdict = applyVerdictRules(merged.score, merged.criticalIssues);

  return {
    ...merged,
    verdict,
    summary: buildSummary(verdict, merged.score),
    nextStep: buildNextStep(verdict, merged.criticalIssues),
  };
}
