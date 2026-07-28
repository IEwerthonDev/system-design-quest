import type { Problem } from '../schema/problem';
import { SANDBOX_PROBLEM_ID } from '../schema/normalize-graph';

/** Sentinel problem for freeform Study Mode — not listed in the library. */
export const SANDBOX_PROBLEM: Problem = {
  id: SANDBOX_PROBLEM_ID,
  company: 'Sandbox',
  title: 'Study Mode',
  difficulty: 'easy',
  description:
    'Freeform architecture lab. Configure workload metrics, draw any design, run the simulation, and ask the AI mentor for feedback.',
  metrics: {
    rps: 1000,
    readRps: 800,
    writeRps: 200,
  },
  constraints: [],
  tags: ['sandbox', 'study-mode'],
  suggestedRequirements: { functional: [], nonFunctional: [] },
  estimatedMinutes: { study: 30, speedrun: 30 },
  rubric: {
    expectedComponents: [],
    criticalPatterns: [],
    commonMistakes: [],
    structuralDepth: 'baseline',
  },
  copy: {
    en: {
      title: 'Study Mode',
      description:
        'Freeform architecture lab. Configure workload metrics, draw any design, run the simulation, and ask the AI mentor for feedback.',
      constraints: [],
      suggestedRequirements: { functional: [], nonFunctional: [] },
    },
    'pt-BR': {
      title: 'Modo Estudo',
      description:
        'Laboratório livre de arquitetura. Configure métricas de carga, desenhe qualquer design, rode a simulação e peça feedback ao mentor de IA.',
      constraints: [],
      suggestedRequirements: { functional: [], nonFunctional: [] },
    },
  },
};
