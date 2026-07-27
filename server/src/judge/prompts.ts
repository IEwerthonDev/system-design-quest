import type { JudgeInput, Problem } from '@sdq/shared';
import { normalizeGraph } from '@sdq/shared';

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

function buildJudgePrompt(role: 'rigorous' | 'pragmatic', problem: Problem, input: JudgeInput): string {
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
    '',
    `Problem: ${problem.title}`,
    problem.description,
    '',
    'Constraints:',
    ...problem.constraints.map((constraint) => `- ${constraint}`),
    ...rubricLines,
    '',
    formatRequirements(input),
    '',
    formatGraph(input),
    '',
    'Return JSON matching JudgePartialResult: score (0-100), strengths, criticalIssues, improvements, requirementCoverage, rationale.',
  ].join('\n');
}

/** Build the rigorous judge system/user prompt for the LLM adapter. */
export function buildRigorousPrompt(problem: Problem, input: JudgeInput): string {
  return buildJudgePrompt('rigorous', problem, input);
}

/** Build the pragmatic judge system/user prompt for the LLM adapter. */
export function buildPragmaticPrompt(problem: Problem, input: JudgeInput): string {
  return buildJudgePrompt('pragmatic', problem, input);
}

/** Exposed for unit tests */
export { formatGraph };
