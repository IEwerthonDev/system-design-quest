import { normalizeGraph } from '../schema/normalize-graph';
import type { ArchitectureGraph } from '../schema/architecture-graph';
import type { FeedbackItem } from '../schema/judge';
import type { Locale, Problem, StructuralDepth } from '../schema/problem';
import { isCoreRealismProblem } from '../problems/structural-depth';

export interface StructuralReport {
  problemId: string;
  depth: StructuralDepth;
  scoreHint: number;
  blockers: FeedbackItem[];
  majors: FeedbackItem[];
  strengths: FeedbackItem[];
  scaleChecklistLines: string[];
  codes: string[];
}

export interface EvaluateStructuralRubricInput {
  problem: Problem;
  graph: ArchitectureGraph;
  locale: Locale;
}

function resolveDepth(problem: Problem): StructuralDepth {
  if (problem.rubric.structuralDepth === 'deep' || isCoreRealismProblem(problem.id)) {
    return 'deep';
  }
  return 'baseline';
}

function presentTypes(graph: ArchitectureGraph): Set<string> {
  return new Set(graph.nodes.map((n) => n.type));
}

function missingComponentMessage(type: string, locale: Locale): FeedbackItem {
  if (locale === 'en') {
    return {
      title: `Missing ${type}`,
      explanation: `This problem expects a ${type} component in the architecture.`,
      howToImprove: `Add a ${type} component and connect it on the request path.`,
      whyItMatters: 'Must-have components are part of the Baseline structural gate for this problem.',
      severity: 'blocker',
      relatedComponents: [type],
    };
  }
  return {
    title: `Falta ${type}`,
    explanation: `Este problema espera um componente ${type} na arquitetura.`,
    howToImprove: `Adicione um componente ${type} e conecte-o no caminho da requisição.`,
    whyItMatters: 'Componentes obrigatórios fazem parte do gate estrutural Baseline deste problema.',
    severity: 'blocker',
    relatedComponents: [type],
  };
}

function presentComponentStrength(type: string, locale: Locale): FeedbackItem {
  if (locale === 'en') {
    return {
      title: `Includes ${type}`,
      explanation: `The graph includes the expected ${type} component.`,
      howToImprove: 'Keep this component on the critical path as you refine scale.',
      whyItMatters: 'Expected components are Baseline must-haves for this problem.',
      relatedComponents: [type],
    };
  }
  return {
    title: `Inclui ${type}`,
    explanation: `O grafo inclui o componente esperado ${type}.`,
    howToImprove: 'Mantenha este componente no caminho crítico ao refinar escala.',
    whyItMatters: 'Componentes esperados são must-haves Baseline deste problema.',
    relatedComponents: [type],
  };
}

function deriveScaleChecklist(problem: Problem, locale: Locale): string[] {
  const explicit = problem.rubric.scaleChecklist?.[locale];
  if (explicit && explicit.length > 0) {
    return [...explicit];
  }

  const lines: string[] = [];
  const m = problem.metrics;

  if (locale === 'en') {
    if (m.readRps != null || m.writeRps != null || m.rps != null) {
      const rps = m.rps ?? Math.max(m.readRps ?? 0, m.writeRps ?? 0);
      lines.push(`Plan capacity for ~${rps.toLocaleString('en-US')} RPS (read/write split as relevant).`);
    }
    if (m.storageGb != null) {
      lines.push(`Account for ~${m.storageGb.toLocaleString('en-US')} GB storage growth and access patterns.`);
    }
    if (m.dau != null) {
      lines.push(`Design for ~${m.dau.toLocaleString('en-US')} DAU fan-out and connection/session load.`);
    }
    if (m.readWriteRatio) {
      lines.push(`Respect the read/write ratio (${m.readWriteRatio}) in caching and write path design.`);
    }
  } else {
    if (m.readRps != null || m.writeRps != null || m.rps != null) {
      const rps = m.rps ?? Math.max(m.readRps ?? 0, m.writeRps ?? 0);
      lines.push(`Planeje capacidade para ~${rps.toLocaleString('pt-BR')} RPS (separando leitura/escrita quando fizer sentido).`);
    }
    if (m.storageGb != null) {
      lines.push(`Considere ~${m.storageGb.toLocaleString('pt-BR')} GB de armazenamento e padrões de acesso.`);
    }
    if (m.dau != null) {
      lines.push(`Projete para ~${m.dau.toLocaleString('pt-BR')} DAU (fan-out e carga de sessão/conexão).`);
    }
    if (m.readWriteRatio) {
      lines.push(`Respeite a razão leitura/escrita (${m.readWriteRatio}) no cache e no caminho de escrita.`);
    }
  }

  if (lines.length === 0) {
    lines.push(
      locale === 'en'
        ? 'Call out at least one scale dimension (QPS, storage, or fan-out) for this problem.'
        : 'Cite pelo menos uma dimensão de escala (QPS, storage ou fan-out) para este problema.',
    );
  }

  const minLines =
    resolveDepth(problem) === 'deep' && problem.difficulty === 'hard' ? 2 : 1;
  while (lines.length < minLines) {
    lines.push(
      locale === 'en'
        ? "Discuss consistency, durability, or coordination trade-offs at this problem's scale."
        : 'Discuta trade-offs de consistência, durabilidade ou coordenação na escala deste problema.',
    );
  }

  return lines;
}

function scoreFromCoverage(presentCount: number, expectedCount: number, blockerCount: number): number {
  if (expectedCount === 0) {
    return blockerCount > 0 ? 40 : 80;
  }
  const ratio = presentCount / expectedCount;
  const base = Math.round(ratio * 100);
  if (blockerCount > 0) {
    return Math.min(base, 55);
  }
  return Math.max(70, Math.min(100, base));
}

/**
 * Deterministic structural evaluation bound to a problem (Approach A / AD-027).
 * Baseline: must-have components + scale checklist. Deep fields evaluated in later tasks.
 */
export function evaluateStructuralRubric(input: EvaluateStructuralRubricInput): StructuralReport {
  const graph = normalizeGraph(input.graph);
  const locale = input.locale;
  const problem = input.problem;
  const depth = resolveDepth(problem);
  const types = presentTypes(graph);
  const expected = problem.rubric.expectedComponents;

  const blockers: FeedbackItem[] = [];
  const majors: FeedbackItem[] = [];
  const strengths: FeedbackItem[] = [];
  const codes: string[] = [];

  let presentCount = 0;
  for (const type of expected) {
    if (types.has(type)) {
      presentCount += 1;
      strengths.push(presentComponentStrength(type, locale));
    } else {
      blockers.push(missingComponentMessage(type, locale));
      if (!codes.includes('missing_component')) {
        codes.push('missing_component');
      }
    }
  }

  const scaleChecklistLines = deriveScaleChecklist(problem, locale);
  const scoreHint = scoreFromCoverage(presentCount, expected.length, blockers.length);

  return {
    problemId: problem.id,
    depth,
    scoreHint,
    blockers,
    majors,
    strengths,
    scaleChecklistLines,
    codes,
  };
}
