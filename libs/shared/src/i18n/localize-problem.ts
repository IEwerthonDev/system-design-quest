import type { Locale, Problem, ProblemCopy, ProblemDefinition } from '../schema/problem';

export const DEFAULT_PROBLEM_LOCALE: Locale = 'pt-BR';

/** Attach EN + pt-BR copy; pt-BR is taken from the definition's current fields. */
export function attachBilingualCopy(definition: ProblemDefinition, en: ProblemCopy): Problem {
  const ptBR: ProblemCopy = {
    title: definition.title,
    description: definition.description,
    constraints: [...definition.constraints],
    suggestedRequirements: {
      functional: [...definition.suggestedRequirements.functional],
      nonFunctional: [...definition.suggestedRequirements.nonFunctional],
    },
  };

  return {
    ...definition,
    copy: {
      en,
      'pt-BR': ptBR,
    },
  };
}

/**
 * Resolve player-facing fields for a locale.
 * Falls back to pt-BR when a locale entry is missing.
 */
export function localizeProblem(problem: Problem, locale: Locale): Problem {
  const copy = problem.copy[locale] ?? problem.copy[DEFAULT_PROBLEM_LOCALE];
  return {
    ...problem,
    title: copy.title,
    description: copy.description,
    constraints: [...copy.constraints],
    suggestedRequirements: {
      functional: [...copy.suggestedRequirements.functional],
      nonFunctional: [...copy.suggestedRequirements.nonFunctional],
    },
  };
}
