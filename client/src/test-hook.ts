import type { ArchitectureGraph } from '@sdq/shared';

export type GamePhase = 'briefing' | 'requirements' | 'canvas' | 'result';
export type GameMode = 'study' | 'speedrun';

export interface GameState {
  graph: ArchitectureGraph;
  phase: GamePhase;
  mode: GameMode;
}

declare global {
  interface Window {
    __GAME_STATE__: GameState;
  }
}

const emptyGraph: ArchitectureGraph = { nodes: [], edges: [] };

const initialState: GameState = {
  graph: emptyGraph,
  phase: 'canvas',
  mode: 'study',
};

export function initGameState(overrides?: Partial<GameState>): GameState {
  window.__GAME_STATE__ = {
    ...initialState,
    graph: { ...emptyGraph, nodes: [], edges: [] },
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

export function setMode(mode: GameMode): void {
  getGameState().mode = mode;
}
