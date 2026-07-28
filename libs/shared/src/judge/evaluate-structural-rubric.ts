import { normalizeGraph } from '../schema/normalize-graph';
import type { ArchitectureGraph, ComponentNode } from '../schema/architecture-graph';
import type { FeedbackItem } from '../schema/judge';
import type {
  Locale,
  Problem,
  StructuralAntiPattern,
  StructuralConfigRule,
  StructuralDepth,
} from '../schema/problem';
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

function feedbackFromMessageKey(
  messageKey: string,
  severity: 'blocker' | 'major',
  related: string[],
  locale: Locale,
): FeedbackItem {
  const title =
    locale === 'en'
      ? messageKey.replace(/\./g, ' · ').replace(/_/g, ' ')
      : messageKey.replace(/\./g, ' · ').replace(/_/g, ' ');
  if (locale === 'en') {
    return {
      title,
      explanation: `Structural rule "${messageKey}" was triggered for this problem.`,
      howToImprove: 'Adjust components or scale-critical configs to satisfy the Deep rubric.',
      whyItMatters: 'Deep anti-patterns and config rules catch designs that look complete but fail at problem scale.',
      severity,
      relatedComponents: related,
    };
  }
  return {
    title,
    explanation: `A regra estrutural "${messageKey}" foi acionada para este problema.`,
    howToImprove: 'Ajuste componentes ou configs críticas de escala para satisfazer a rubrica Deep.',
    whyItMatters: 'Anti-padrões e regras de config Deep pegam designs que parecem completos mas falham na escala do problema.',
    severity,
    relatedComponents: related,
  };
}

function antiPatternFires(pattern: StructuralAntiPattern, types: Set<string>, graphNonEmpty: boolean): boolean {
  if (pattern.unlessAnyOf?.some((t) => types.has(t))) {
    return false;
  }

  if (pattern.forbiddenType && types.has(pattern.forbiddenType)) {
    return true;
  }

  if (pattern.requiredAnyOf && pattern.requiredAnyOf.length > 0) {
    if (!graphNonEmpty) {
      return false;
    }
    return !pattern.requiredAnyOf.some((t) => types.has(t));
  }

  return false;
}

function relatedForAntiPattern(pattern: StructuralAntiPattern): string[] {
  if (pattern.forbiddenType) {
    return [pattern.forbiddenType];
  }
  return pattern.requiredAnyOf ?? [];
}

function evaluateAntiPatterns(
  patterns: StructuralAntiPattern[] | undefined,
  types: Set<string>,
  graphNonEmpty: boolean,
  locale: Locale,
): { items: FeedbackItem[]; codes: string[] } {
  const items: FeedbackItem[] = [];
  const codes: string[] = [];
  if (!patterns) {
    return { items, codes };
  }

  for (const pattern of patterns) {
    if (!antiPatternFires(pattern, types, graphNonEmpty)) {
      continue;
    }
    codes.push(pattern.code);
    items.push(
      feedbackFromMessageKey(pattern.messageKey, pattern.severity, relatedForAntiPattern(pattern), locale),
    );
  }
  return { items, codes };
}

function nodesOfType(graph: ArchitectureGraph, componentType: string): ComponentNode[] {
  return graph.nodes.filter((n) => n.type === componentType);
}

function configRuleViolated(rule: StructuralConfigRule, node: ComponentNode): boolean {
  const config = node.config;
  if (!config) {
    return false;
  }

  if (rule.minHitRate != null) {
    if (config.kind === 'cache' || config.kind === 'cdn') {
      if (config.hitRate < rule.minHitRate) {
        return true;
      }
    }
  }

  if (rule.minShardCount != null && config.kind === 'sql_db') {
    if (config.shardCount < rule.minShardCount) {
      return true;
    }
  }

  if (rule.minTtlSeconds != null && config.kind === 'cdn') {
    if (config.ttlSeconds < rule.minTtlSeconds) {
      return true;
    }
  }

  if (rule.minPartitionCount != null && config.kind === 'mq') {
    if (config.partitionCount < rule.minPartitionCount) {
      return true;
    }
  }

  if (rule.minFanOutLimit != null && config.kind === 'ws') {
    if (config.fanOutLimit < rule.minFanOutLimit) {
      return true;
    }
  }

  if (rule.requireMqDurability != null && config.kind === 'mq') {
    if (config.durability !== rule.requireMqDurability) {
      return true;
    }
  }

  return false;
}

function evaluateConfigRules(
  rules: StructuralConfigRule[] | undefined,
  graph: ArchitectureGraph,
  locale: Locale,
): { items: FeedbackItem[]; codes: string[] } {
  const items: FeedbackItem[] = [];
  const codes: string[] = [];
  if (!rules) {
    return { items, codes };
  }

  for (const rule of rules) {
    const nodes = nodesOfType(graph, rule.componentType);
    const violated = nodes.some((n) => configRuleViolated(rule, n));
    if (!violated) {
      continue;
    }
    codes.push(rule.code);
    items.push(
      feedbackFromMessageKey(rule.messageKey, rule.severity, [rule.componentType], locale),
    );
  }
  return { items, codes };
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

function scoreFromCoverage(
  presentCount: number,
  expectedCount: number,
  blockerCount: number,
  majorCount: number,
): number {
  if (expectedCount === 0) {
    return blockerCount > 0 ? 40 : majorCount > 0 ? 60 : 80;
  }
  const ratio = presentCount / expectedCount;
  let base = Math.round(ratio * 100);
  if (blockerCount > 0) {
    return Math.min(base, 55);
  }
  if (majorCount > 0) {
    base = Math.min(base, 75);
    return Math.max(55, base - majorCount * 5);
  }
  return Math.max(70, Math.min(100, base));
}

/**
 * Deterministic structural evaluation bound to a problem (Approach A / AD-027).
 * Baseline: must-have components + scale checklist.
 * Deep: anti-patterns + config adequacy rules.
 */
export function evaluateStructuralRubric(input: EvaluateStructuralRubricInput): StructuralReport {
  const graph = normalizeGraph(input.graph);
  const locale = input.locale;
  const problem = input.problem;
  const depth = resolveDepth(problem);
  const types = presentTypes(graph);
  const expected = problem.rubric.expectedComponents;
  const graphNonEmpty = graph.nodes.length > 0;

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

  if (depth === 'deep') {
    const anti = evaluateAntiPatterns(problem.rubric.antiPatterns, types, graphNonEmpty, locale);
    for (const item of anti.items) {
      if (item.severity === 'blocker') {
        blockers.push(item);
      } else {
        majors.push(item);
      }
    }
    for (const code of anti.codes) {
      if (!codes.includes(code)) {
        codes.push(code);
      }
    }

    const config = evaluateConfigRules(problem.rubric.configRules, graph, locale);
    for (const item of config.items) {
      if (item.severity === 'blocker') {
        blockers.push(item);
      } else {
        majors.push(item);
      }
    }
    for (const code of config.codes) {
      if (!codes.includes(code)) {
        codes.push(code);
      }
    }
  }

  const scaleChecklistLines = deriveScaleChecklist(problem, locale);
  const scoreHint = scoreFromCoverage(presentCount, expected.length, blockers.length, majors.length);

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
