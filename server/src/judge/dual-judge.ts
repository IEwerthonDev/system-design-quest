import {
  applyVerdictRules,
  evaluateStructuralRubric,
  getProblem,
  type FeedbackItem,
  type JudgeInput,
  type JudgePartialResult,
  type JudgeResult,
  type Locale,
  type ReqCoverageItem,
  type StructuralReport,
  type Verdict,
} from '@sdq/shared';
import type { LlmClient } from './mock-llm-client';
import { resolveJudgeLocale } from './locale';
import { buildPragmaticPrompt, buildRigorousPrompt } from './prompts';

const STATUS_RANK: Record<ReqCoverageItem['status'], number> = {
  missing: 0,
  partial: 1,
  covered: 2,
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/**
 * Coerce LLM JSON into a safe JudgePartialResult.
 * Live models sometimes omit arrays or return objects — that used to crash mergeConsensus.
 */
export function normalizeJudgePartialResult(raw: unknown): JudgePartialResult {
  const value =
    raw !== null && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const score = typeof value.score === 'number' && Number.isFinite(value.score) ? value.score : 0;
  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    strengths: asArray<FeedbackItem>(value.strengths),
    criticalIssues: asArray<FeedbackItem>(value.criticalIssues),
    improvements: asArray<FeedbackItem>(value.improvements),
    requirementCoverage: asArray<ReqCoverageItem>(value.requirementCoverage),
    rationale: typeof value.rationale === 'string' ? value.rationale : '',
  };
}

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

/** Conservative gap fill — never invent "covered" from URL-shortener golden tiers (JR-02). */
function defaultGapCoverageStatus(): ReqCoverageItem['status'] {
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
  const locale = resolveJudgeLocale(input);
  const merged = mergeReqCoverageItems([
    ...asArray<ReqCoverageItem>(rigorous.requirementCoverage),
    ...asArray<ReqCoverageItem>(pragmatic.requirementCoverage),
  ]);
  const byRequirement = new Map(merged.map((item) => [item.requirement, item]));

  const declared: ReqCoverageItem[] = [];

  for (const requirement of input.requirements.functional) {
    const existing = byRequirement.get(requirement);
    if (existing) {
      declared.push(existing);
    } else {
      const status = defaultGapCoverageStatus();
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
      const status = defaultGapCoverageStatus();
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
  const left = normalizeJudgePartialResult(rigorous);
  const right = normalizeJudgePartialResult(pragmatic);
  const score = Math.min(left.score, right.score);
  const locale = resolveJudgeLocale(input);
  const criticalIssues = dedupeFeedbackItems([
    ...left.criticalIssues,
    ...right.criticalIssues,
  ]);

  return {
    score,
    strengths: dedupeFeedbackItems([...left.strengths, ...right.strengths]),
    criticalIssues,
    improvements: dedupeFeedbackItems([...left.improvements, ...right.improvements]),
    requirementCoverage: buildRequirementCoverage(input, left, right),
    judgeDebate: {
      rigorous: left.rationale,
      pragmatic: right.rationale,
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

type LlmConsensus = ReturnType<typeof mergeConsensus>;

/**
 * Inject structural blockers/majors into LLM consensus (JR-10–JR-12).
 * LLM cannot clear structural blockers into PASS/PARTIAL.
 */
export function mergeWithStructuralHardGate(
  llmConsensus: LlmConsensus,
  report: StructuralReport,
  input: JudgeInput,
  scaleNarrative = '',
): JudgeResult {
  const locale = resolveJudgeLocale(input);
  const criticalIssues = dedupeFeedbackItems([
    ...report.blockers,
    ...report.majors,
    ...llmConsensus.criticalIssues,
  ]);
  const verdict = applyVerdictRules(llmConsensus.score, criticalIssues);

  return {
    ...llmConsensus,
    criticalIssues,
    verdict,
    summary: buildSummary(verdict, llmConsensus.score, locale),
    nextStep: buildNextStep(verdict, criticalIssues, locale),
    scaleNarrative,
    structuralCodes: report.codes,
  };
}

/**
 * JR-14/JR-15: on LLM path, empty scaleNarrative cannot PASS (demote to PARTIAL band).
 */
export function assertScaleNarrative(result: JudgeResult, locale: Locale = 'pt-BR'): JudgeResult {
  if (result.scaleNarrative.trim().length > 0) {
    return result;
  }
  if (result.verdict !== 'PASS') {
    return result;
  }
  const score = Math.min(result.score, 79);
  const verdict = applyVerdictRules(score, result.criticalIssues);
  return {
    ...result,
    score,
    verdict,
    summary: buildSummary(verdict, score, locale),
    nextStep: buildNextStep(verdict, result.criticalIssues, locale),
  };
}

/** Run dual-judge orchestration: structural → LLM → hard-gate merge → scale gate → AD-016. */
export async function judgeSubmission(input: JudgeInput, client: LlmClient): Promise<JudgeResult> {
  const problem = getProblem(input.problemId);
  if (!problem) {
    throw new UnknownProblemError(input.problemId);
  }

  const locale = resolveJudgeLocale(input);
  const normalizedInput: JudgeInput = { ...input, locale };

  const report = evaluateStructuralRubric({
    problem,
    graph: input.graph,
    locale,
  });

  const [rigorousRaw, pragmaticRaw] = await Promise.all([
    client.completeJson<unknown>({
      role: 'rigorous',
      graph: input.graph,
      locale,
      problemId: input.problemId,
      text: buildRigorousPrompt(problem, normalizedInput, report),
    }),
    client.completeJson<unknown>({
      role: 'pragmatic',
      graph: input.graph,
      locale,
      problemId: input.problemId,
      text: buildPragmaticPrompt(problem, normalizedInput, report),
    }),
  ]);

  const rigorous = normalizeJudgePartialResult(rigorousRaw);
  const pragmatic = normalizeJudgePartialResult(pragmaticRaw);

  const merged = mergeConsensus(rigorous, pragmatic, normalizedInput);
  const gated = mergeWithStructuralHardGate(
    merged,
    report,
    normalizedInput,
    report.scaleChecklistLines.join('\n'),
  );
  return assertScaleNarrative(gated, locale);
}
