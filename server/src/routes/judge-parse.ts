import {
  getProblem,
  validateGraph,
  type ArchitectureGraph,
  type GameMode,
  type JudgeInput,
} from '@sdq/shared';

type ParseResult =
  | { ok: true; input: JudgeInput }
  | { ok: false; message: string };

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isGameMode(value: unknown): value is GameMode {
  return value === 'study' || value === 'speedrun';
}

function isArchitectureGraph(value: unknown): value is ArchitectureGraph {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const graph = value as ArchitectureGraph;
  return Array.isArray(graph.nodes) && Array.isArray(graph.edges);
}

export function parseJudgeRequestBody(body: unknown): ParseResult {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Request body must be a JSON object' };
  }

  const record = body as Record<string, unknown>;
  const problemId = record.problemId;
  const requirements = record.requirements;
  const graph = record.graph;
  const mode = record.mode;

  if (typeof problemId !== 'string' || problemId.trim() === '') {
    return { ok: false, message: 'problemId must be a non-empty string' };
  }

  if (!getProblem(problemId)) {
    return { ok: false, message: `Unknown problemId: ${problemId}` };
  }

  if (!requirements || typeof requirements !== 'object') {
    return { ok: false, message: 'requirements must be an object with functional and nonFunctional arrays' };
  }

  const req = requirements as Record<string, unknown>;
  if (!isStringArray(req.functional) || !isStringArray(req.nonFunctional)) {
    return { ok: false, message: 'requirements.functional and requirements.nonFunctional must be string arrays' };
  }

  if (!isArchitectureGraph(graph)) {
    return { ok: false, message: 'graph must include nodes and edges arrays' };
  }

  const graphValidation = validateGraph(graph);
  if (!graphValidation.valid) {
    return { ok: false, message: graphValidation.errors[0]?.message ?? 'Invalid architecture graph' };
  }

  if (!isGameMode(mode)) {
    return { ok: false, message: 'mode must be "study" or "speedrun"' };
  }

  return {
    ok: true,
    input: {
      problemId,
      requirements: {
        functional: req.functional,
        nonFunctional: req.nonFunctional,
      },
      graph,
      mode,
    },
  };
}
