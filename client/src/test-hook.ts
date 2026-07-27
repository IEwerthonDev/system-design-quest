import type { ArchitectureGraph, JudgeResult } from '@sdq/shared';
import type { ExperienceLevel } from './storage/preferences';

export type GamePhase = 'briefing' | 'requirements' | 'canvas' | 'result';
export type GameMode = 'study' | 'speedrun';
export type JudgingStep = 'analyzing' | 'rigorous' | 'pragmatic' | 'consensus';

export interface GameRequirements {
  functional: string[];
  nonFunctional: string[];
}

export interface GameState {
  problemId: string;
  graph: ArchitectureGraph;
  phase: GamePhase;
  mode: GameMode;
  requirements: GameRequirements;
  guidedMode: boolean;
  experienceLevel: ExperienceLevel | null;
  guidedStep: string | null;
  judgeResult: JudgeResult | null;
  judgingStep: JudgingStep | null;
}

declare global {
  interface Window {
    __GAME_STATE__: GameState;
  }
}

const emptyGraph: ArchitectureGraph = { nodes: [], edges: [] };

const emptyRequirements: GameRequirements = { functional: [], nonFunctional: [] };

const initialState: GameState = {
  problemId: '',
  graph: emptyGraph,
  phase: 'canvas',
  mode: 'study',
  requirements: emptyRequirements,
  guidedMode: false,
  experienceLevel: null,
  guidedStep: null,
  judgeResult: null,
  judgingStep: null,
};

export function initGameState(overrides?: Partial<GameState>): GameState {
  window.__GAME_STATE__ = {
    ...initialState,
    graph: { ...emptyGraph, nodes: [], edges: [] },
    requirements: { functional: [], nonFunctional: [] },
    guidedMode: false,
    experienceLevel: null,
    guidedStep: null,
    judgeResult: null,
    judgingStep: null,
    ...overrides,
  };
  return window.__GAME_STATE__;
}

export function getGameState(): GameState {
  if (!window.__GAME_STATE__) {
    return initGameState();
  }
  return window.__GAME_STATE__;
}

export function setGraph(graph: ArchitectureGraph): void {
  getGameState().graph = {
    nodes: graph.nodes.map((n) => ({ ...n, position: { ...n.position } })),
    edges: graph.edges.map((e) => ({ ...e })),
  };
}

export function setPhase(phase: GamePhase): void {
  getGameState().phase = phase;
}

export function setRequirements(requirements: GameRequirements): void {
  getGameState().requirements = {
    functional: [...requirements.functional],
    nonFunctional: [...requirements.nonFunctional],
  };
}

export function setMode(mode: GameMode): void {
  getGameState().mode = mode;
}

export function setGuidedStep(step: string | null): void {
  getGameState().guidedStep = step;
}

export function setJudgingStep(step: JudgingStep | null): void {
  getGameState().judgingStep = step;
}
