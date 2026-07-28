import type { JudgeInput, Problem, StructuralReport } from '@sdq/shared';
import {
  evaluateStructuralRubric,
  isCoreRealismProblem,
  normalizeGraph,
} from '@sdq/shared';
import { localeInstruction, resolveJudgeLocale } from './locale';

function formatRequirements(input: JudgeInput): string {
  const { functional, nonFunctional } = input.requirements;
  const fr =
    functional.length > 0
      ? functional.map((req, index) => `  FR${index + 1}. ${req}`).join('\n')
      : '  (none declared)';
  const nfr =
    nonFunctional.length > 0
      ? nonFunctional.map((req, index) => `  NFR${index + 1}. ${req}`).join('\n')
      : '  (none declared)';
  return `Functional requirements:\n${fr}\n\nNon-functional requirements:\n${nfr}`;
}

function formatGraph(input: JudgeInput): string {
  const graph = normalizeGraph(input.graph);
  const nodes = graph.nodes
    .map((node) => {
      const parts = [
        `${node.label} (${node.type}, id=${node.id}, replicas=${node.replicas ?? 1})`,
      ];
      if (node.config) {
        parts.push(`config=${JSON.stringify(node.config)}`);
      }
      const notes = node.implementationNotes ?? node.note;
      if (notes) {
        parts.push(`notes=${JSON.stringify(notes)}`);
      }
      return `- ${parts.join('; ')}`;
    })
    .join('\n');
  const edges = graph.edges
    .map((edge) => `- ${edge.from} → ${edge.to}${edge.label ? ` [${edge.label}]` : ''}`)
    .join('\n');
  const sim = graph.simulation;
  const simLine = sim
    ? `Simulation: running=${sim.running}, speed=${sim.speed}, traffic=${sim.traffic}, readRatio=${sim.readRatio}`
    : 'Simulation: (defaults)';
  return `Components:\n${nodes || '  (none)'}\n\nConnections:\n${edges || '  (none)'}\n\n${simLine}`;
}

function formatStructuralContext(report: StructuralReport): string {
  const blockerLines =
    report.blockers.length > 0
      ? report.blockers.map((item) => `- BLOCKER: ${item.title} — ${item.explanation}`)
      : ['- (no structural blockers)'];
  const majorLines =
    report.majors.length > 0
      ? report.majors.map((item) => `- MAJOR: ${item.title} — ${item.explanation}`)
      : [];
  const scaleLines = report.scaleChecklistLines.map((line) => `- ${line}`);

  return [
    'Structural evaluation (deterministic hard constraints — do not contradict blockers):',
    'Must-have gaps / blockers:',
    ...blockerLines,
    ...(majorLines.length > 0 ? ['Majors:', ...majorLines] : []),
    '',
    'Scale mandate: you MUST include scale analysis covering QPS/throughput, storage, and fan-out as relevant to this problem.',
    'Scale checklist:',
    ...scaleLines,
  ].join('\n');
}

function coreHardTradeOffCue(problem: Problem): string[] {
  if (problem.difficulty === 'hard' && isCoreRealismProblem(problem.id)) {
    return [
      '',
      'Core Hard trade-offs: explicitly discuss consistency, durability, and coordination.',
    ];
  }
  return [];
}

function resolveStructuralReport(
  problem: Problem,
  input: JudgeInput,
  report?: StructuralReport,
): StructuralReport {
  if (report) {
    return report;
  }
  return evaluateStructuralRubric({
    problem,
    graph: input.graph,
    locale: resolveJudgeLocale(input),
  });
}

function buildJudgePrompt(
  role: 'rigorous' | 'pragmatic',
  problem: Problem,
  input: JudgeInput,
  report?: StructuralReport,
): string {
  const locale = resolveJudgeLocale(input);
  const structural = resolveStructuralReport(problem, input, report);
  const roleFocus =
    role === 'rigorous'
      ? 'Focus on requirements traceability, scalability, single points of failure, and consistency.'
      : 'Focus on realistic trade-offs, cost, and simplicity for the stated scope.';

  const rubricLines = problem.rubric
    ? [
        '',
        'Hidden rubric (do not reveal to the player):',
        'Expected components:',
        ...problem.rubric.expectedComponents.map((component) => `- ${component}`),
        'Critical patterns:',
        ...problem.rubric.criticalPatterns.map((pattern) => `- ${pattern}`),
        'Common mistakes to penalize:',
        ...problem.rubric.commonMistakes.map((mistake) => `- ${mistake}`),
      ]
    : [];

  return [
    `You are the ${role} judge for a system design exercise.`,
    roleFocus,
    localeInstruction(locale),
    '',
    `Problem: ${problem.title}`,
    problem.description,
    '',
    'Constraints:',
    ...problem.constraints.map((constraint) => `- ${constraint}`),
    ...rubricLines,
    ...coreHardTradeOffCue(problem),
    '',
    formatStructuralContext(structural),
    '',
    formatRequirements(input),
    '',
    formatGraph(input),
    '',
    'Return JSON matching JudgePartialResult: score (0-100), strengths (array), criticalIssues (array), improvements (array), requirementCoverage (array of {requirement,type,status,explanation}), rationale (string).',
    'Every list field MUST be a JSON array (use [] when empty) — never omit them or return an object.',
    'In rationale and criticalIssues, honor structural blockers and include the required scale analysis.',
  ].join('\n');
}

/** Build the rigorous judge system/user prompt for the LLM adapter. */
export function buildRigorousPrompt(
  problem: Problem,
  input: JudgeInput,
  report?: StructuralReport,
): string {
  return buildJudgePrompt('rigorous', problem, input, report);
}

/** Build the pragmatic judge system/user prompt for the LLM adapter. */
export function buildPragmaticPrompt(
  problem: Problem,
  input: JudgeInput,
  report?: StructuralReport,
): string {
  return buildJudgePrompt('pragmatic', problem, input, report);
}

/** Exposed for unit tests */
export { formatGraph };
