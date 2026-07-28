import {
  applyVerdictRules,
  evaluateStructuralRubric,
  getProblem,
  type FeedbackItem,
  type GoldenGraphTier,
  type JudgeInput,
  type JudgePartialResult,
  type JudgeResult,
  type Locale,
  type ReqCoverageItem,
  type StructuralReport,
  type Verdict,
} from '@sdq/shared';
import type { LlmClient } from './mock-llm-client';
import { resolveGraphTier } from './mock-llm-client';
import { resolveJudgeLocale } from './locale';
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
  locale: Locale,
): string {
  if (locale === 'en') {
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

  if (status === 'covered') {
    return 'O requisito declarado aparece nas camadas da arquitetura enviada.';
  }
  if (status === 'partial') {
    return type === 'functional'
      ? 'A arquitetura sugere esse comportamento, mas faltam componentes ou caminhos explícitos.'
      : 'O alvo não funcional está parcialmente coberto; ainda há lacunas de escala ou latência.';
  }
  return 'Não há componente ou caminho de dados claro cobrindo este requisito declarado.';
}

/** Fill requirementCoverage for every declared requirement, merging judge outputs first. */
export function buildRequirementCoverage(
  input: JudgeInput,
  rigorous: JudgePartialResult,
  pragmatic: JudgePartialResult,
): ReqCoverageItem[] {
  const tier = resolveGraphTier(input.graph);
  const locale = resolveJudgeLocale(input);
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
        explanation: defaultCoverageExplanation(status, 'functional', locale),
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
        explanation: defaultCoverageExplanation(status, 'nonFunctional', locale),
      });
    }
  }

  return declared;
}

function buildSummary(verdict: Verdict, score: number, locale: Locale): string {
  if (locale === 'en') {
    if (verdict === 'PASS') {
      return `Your architecture scored ${score}/100 and meets the core expectations for this problem.`;
    }
    if (verdict === 'PARTIAL') {
      return `Your design scored ${score}/100. It covers basics but still has gaps to close before production readiness.`;
    }
    return `Your design scored ${score}/100. Critical layering or scalability issues must be fixed before this solution is viable.`;
  }

  if (verdict === 'PASS') {
    return `Sua arquitetura fez ${score}/100 e atende as expectativas principais deste problema.`;
  }
  if (verdict === 'PARTIAL') {
    return `Seu design fez ${score}/100. Cobre o básico, mas ainda há lacunas antes de estar pronto para produção.`;
  }
  return `Seu design fez ${score}/100. Problemas críticos de layering ou escalabilidade precisam ser corrigidos antes desta solução ser viável.`;
}

function buildNextStep(verdict: Verdict, criticalIssues: FeedbackItem[], locale: Locale): string {
  if (locale === 'en') {
    if (verdict === 'PASS') {
      return 'Review improvements for polish, then try a harder problem or add redundancy details.';
    }
    if (criticalIssues.length > 0) {
      return `Start with: ${criticalIssues[0]!.title} — ${criticalIssues[0]!.howToImprove}`;
    }
    return 'Add missing tiers (cache, load balancing, or app layer) and reconnect the data flow.';
  }

  if (verdict === 'PASS') {
    return 'Revise as melhorias para polir o design e depois tente um problema mais difícil ou detalhe a redundância.';
  }
  if (criticalIssues.length > 0) {
    return `Comece por: ${criticalIssues[0]!.title} — ${criticalIssues[0]!.howToImprove}`;
  }
  return 'Adicione camadas faltantes (cache, load balancing ou app) e reconecte o fluxo de dados.';
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
  const locale = resolveJudgeLocale(input);
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
      consensus:
        locale === 'en'
          ? `Both judges converged on score ${score}/100 after weighing scalability rigor against pragmatic trade-offs.`
          : `Os dois juízes convergiram na nota ${score}/100 após equilibrar rigor de escalabilidade e trade-offs pragmáticos.`,
    },
  };
}

export class UnknownProblemError extends Error {
  constructor(problemId: string) {
    super(`Unknown problem: ${problemId}`);
    this.name = 'UnknownProblemError';
  }
}

function llmConfigNote(locale: Locale): string {
  if (locale === 'en') {
    return 'Configure LLM_API_KEY for richer dual-judge narrative. This result is structural-only.';
  }
  return 'Configure LLM_API_KEY para narrativa dual-judge mais rica. Este resultado é apenas estrutural.';
}

function structuralCoverage(
  input: JudgeInput,
  report: StructuralReport,
  locale: Locale,
): ReqCoverageItem[] {
  const hasBlockers = report.blockers.length > 0;
  const status: ReqCoverageItem['status'] = hasBlockers ? 'missing' : 'covered';
  const explanation =
    locale === 'en'
      ? hasBlockers
        ? 'Structural Baseline found missing must-have components for this problem.'
        : 'Declared requirements align with present Baseline must-have components.'
      : hasBlockers
        ? 'O Baseline estrutural encontrou componentes obrigatórios faltando neste problema.'
        : 'Os requisitos declarados alinham-se aos must-haves Baseline presentes.';

  const declared: ReqCoverageItem[] = [];
  for (const requirement of input.requirements.functional) {
    declared.push({ requirement, type: 'functional', status, explanation });
  }
  for (const requirement of input.requirements.nonFunctional) {
    declared.push({ requirement, type: 'nonFunctional', status, explanation });
  }
  return declared;
}

/** Build a JudgeResult from StructuralReport only (no LLM / no shortener golden fixtures). */
export function buildStructuralOnlyResult(
  report: StructuralReport,
  input: JudgeInput,
): JudgeResult {
  const locale = resolveJudgeLocale(input);
  const criticalIssues = [...report.blockers, ...report.majors];
  const score = report.scoreHint;
  const verdict = applyVerdictRules(score, criticalIssues);
  const note = llmConfigNote(locale);
  const scaleNarrative = report.scaleChecklistLines.join('\n');

  return {
    verdict,
    score,
    summary: `${buildSummary(verdict, score, locale)} ${note}`,
    nextStep: buildNextStep(verdict, criticalIssues, locale),
    strengths: report.strengths,
    criticalIssues,
    improvements: [],
    requirementCoverage: structuralCoverage(input, report, locale),
    judgeDebate: {
      rigorous: note,
      pragmatic: note,
      consensus: note,
    },
    scaleNarrative,
    structuralCodes: report.codes,
  };
}

/** Deterministic structural-only judgment (mock / no LLM key path). */
export function judgeStructuralOnly(input: JudgeInput): JudgeResult {
  const problem = getProblem(input.problemId);
  if (!problem) {
    throw new UnknownProblemError(input.problemId);
  }
  const locale = resolveJudgeLocale(input);
  const report = evaluateStructuralRubric({
    problem,
    graph: input.graph,
    locale,
  });
  return buildStructuralOnlyResult(report, { ...input, locale });
}

/** Run dual-judge orchestration: parallel LLM calls → consensus merge → AD-016 verdict. */
export async function judgeSubmission(input: JudgeInput, client: LlmClient): Promise<JudgeResult> {
  const problem = getProblem(input.problemId);
  if (!problem) {
    throw new UnknownProblemError(input.problemId);
  }

  const locale = resolveJudgeLocale(input);
  const normalizedInput: JudgeInput = { ...input, locale };

  const [rigorous, pragmatic] = await Promise.all([
    client.completeJson<JudgePartialResult>({
      role: 'rigorous',
      graph: input.graph,
      locale,
      problemId: input.problemId,
      text: buildRigorousPrompt(problem, normalizedInput),
    }),
    client.completeJson<JudgePartialResult>({
      role: 'pragmatic',
      graph: input.graph,
      locale,
      problemId: input.problemId,
      text: buildPragmaticPrompt(problem, normalizedInput),
    }),
  ]);

  const merged = mergeConsensus(rigorous, pragmatic, normalizedInput);
  const verdict = applyVerdictRules(merged.score, merged.criticalIssues);

  return {
    ...merged,
    verdict,
    summary: buildSummary(verdict, merged.score, locale),
    nextStep: buildNextStep(verdict, merged.criticalIssues, locale),
    scaleNarrative: '',
  };
}
