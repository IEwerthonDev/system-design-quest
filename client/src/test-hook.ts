import type {
  ArchitectureGraph,
  ChaosEventId,
  JudgeResult,
  LiveMetrics,
  ResilienceResult,
} from '@sdq/shared';
import type { ExperienceLevel } from './storage/preferences';

export type GamePhase = 'briefing' | 'requirements' | 'canvas' | 'result';
export type GameMode = 'study' | 'speedrun' | 'sandbox';
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
  elapsedMs: number | null;
  canvasInteraction: {
    mode: string;
    hoverComponentId: string | null;
    linkingFromId: string | null;
    selectedEdgeId: string | null;
    previewActive: boolean;
    reconnectEnd: 'from' | 'to' | null;
  } | null;
  /** Ephemeral chaos (AD-037) — never persisted on ArchitectureGraph */
  activeChaosEvent: ChaosEventId | null;
  chaosTargetNodeId: string | null;
  liveMetrics: LiveMetrics | null;
  resilienceReport: ResilienceResult[];
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
  elapsedMs: null,
  canvasInteraction: null,
  activeChaosEvent: null,
  chaosTargetNodeId: null,
  liveMetrics: null,
  resilienceReport: [],
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
    elapsedMs: null,
    canvasInteraction: null,
    activeChaosEvent: null,
    chaosTargetNodeId: null,
    liveMetrics: null,
    resilienceReport: [],
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
    nodes: graph.nodes.map((n) => ({
      ...n,
      position: { ...n.position },
      ...(n.config ? { config: { ...n.config } } : {}),
    })),
    edges: graph.edges.map((e) => ({ ...e })),
    ...(graph.simulation ? { simulation: { ...graph.simulation } } : {}),
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

export function setCanvasInteraction(
  state: GameState['canvasInteraction'],
): void {
  getGameState().canvasInteraction = state
    ? {
        mode: state.mode,
        hoverComponentId: state.hoverComponentId,
        linkingFromId: state.linkingFromId,
        selectedEdgeId: state.selectedEdgeId,
        previewActive: state.previewActive,
        reconnectEnd: state.reconnectEnd,
      }
    : null;
}

export function setActiveChaos(
  eventId: GameState['activeChaosEvent'],
  targetNodeId: string | null = null,
): void {
  const state = getGameState();
  state.activeChaosEvent = eventId;
  state.chaosTargetNodeId = eventId ? targetNodeId : null;
}

export function setLiveMetrics(metrics: GameState['liveMetrics']): void {
  getGameState().liveMetrics = metrics ? { ...metrics, slo: metrics.slo.map((s) => ({ ...s })) } : null;
}

export function setResilienceReport(report: GameState['resilienceReport']): void {
  getGameState().resilienceReport = report.map((r) => ({ ...r }));
}

export function appendResilienceResult(result: NonNullable<GameState['resilienceReport'][number]>): void {
  getGameState().resilienceReport = [...getGameState().resilienceReport, { ...result }];
}

export function clearResilienceReport(): void {
  getGameState().resilienceReport = [];
}
