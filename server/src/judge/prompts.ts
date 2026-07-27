import type { JudgeInput, Problem } from '@sdq/shared';

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
  const nodes = input.graph.nodes
    .map((node) => `- ${node.label} (${node.type}, id=${node.id})`)
    .join('\n');
  const edges = input.graph.edges
    .map((edge) => `- ${edge.from} → ${edge.to}${edge.label ? ` [${edge.label}]` : ''}`)
    .join('\n');
  return `Components:\n${nodes || '  (none)'}\n\nConnections:\n${edges || '  (none)'}`;
}

function buildJudgePrompt(role: 'rigorous' | 'pragmatic', problem: Problem, input: JudgeInput): string {
  const roleFocus =
    role === 'rigorous'
      ? 'Focus on requirements traceability, scalability, single points of failure, and consistency.'
      : 'Focus on realistic trade-offs, cost, and simplicity for the stated scope.';

  return [
    `You are the ${role} judge for a system design exercise.`,
    roleFocus,
    '',
    `Problem: ${problem.title}`,
    problem.description,
    '',
    'Constraints:',
    ...problem.constraints.map((constraint) => `- ${constraint}`),
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
