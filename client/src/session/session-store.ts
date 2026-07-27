import type { ArchitectureGraph, JudgeResult } from '@sdq/shared';
import type { ExperienceLevel } from '../storage/preferences';
import type { GameMode, GamePhase } from '../test-hook';
import { getGameState, initGameState } from '../test-hook';
import { advancePhase as computeNextPhase, retreatPhase as computePreviousPhase } from './phase-machine';

type GraphChangeListener = (graph: ArchitectureGraph) => void;

const graphChangeListeners = new Set<GraphChangeListener>();

export interface SessionRequirements {
  functional: string[];
  nonFunctional: string[];
}

export interface CreateSessionOptions {
  guidedMode?: boolean;
  experienceLevel?: ExperienceLevel | null;
}

export interface Session {
  id: string;
  problemId: string;
  mode: GameMode;
  phase: GamePhase;
  requirements: SessionRequirements;
  graph: ArchitectureGraph;
  guidedMode: boolean;
  experienceLevel: ExperienceLevel | null;
  startedAt: number;
  judgeResult: JudgeResult | null;
}

let activeSession: Session | null = null;
let sessionIdCounter = 0;

function cloneGraph(graph: ArchitectureGraph): ArchitectureGraph {
  return {
    nodes: graph.nodes.map((node) => ({
      ...node,
      position: { ...node.position },
    })),
    edges: graph.edges.map((edge) => ({ ...edge })),
  };
}

function cloneRequirements(requirements: SessionRequirements): SessionRequirements {
  return {
    functional: [...requirements.functional],
    nonFunctional: [...requirements.nonFunctional],
  };
}

function cloneJudgeResult(result: JudgeResult): JudgeResult {
  return JSON.parse(JSON.stringify(result)) as JudgeResult;
}

function syncToGameState(session: Session): void {
  initGameState({
    problemId: session.problemId,
    mode: session.mode,
    phase: session.phase,
    graph: cloneGraph(session.graph),
    requirements: cloneRequirements(session.requirements),
    guidedMode: session.guidedMode,
    experienceLevel: session.experienceLevel,
    judgeResult: session.judgeResult ? cloneJudgeResult(session.judgeResult) : null,
    judgingStep: getGameState().judgingStep,
  });
}

export function createSession(
  problemId: string,
  mode: GameMode,
  options: CreateSessionOptions = {},
): Session {
  sessionIdCounter += 1;
  activeSession = {
    id: `session-${sessionIdCounter}`,
    problemId,
    mode,
    phase: 'briefing',
    requirements: { functional: [], nonFunctional: [] },
    graph: { nodes: [], edges: [] },
    guidedMode: options.guidedMode ?? false,
    experienceLevel: options.experienceLevel ?? null,
    startedAt: Date.now(),
    judgeResult: null,
  };
  syncToGameState(activeSession);
  return activeSession;
}

export function getSession(): Session | null {
  return activeSession;
}

export function advancePhase(): Session {
  if (!activeSession) {
    throw new Error('No active session');
  }

  activeSession = {
    ...activeSession,
    phase: computeNextPhase(activeSession.phase),
  };
  syncToGameState(activeSession);
  return activeSession;
}

export function goBackPhase(): Session {
  if (!activeSession) {
    throw new Error('No active session');
  }

  activeSession = {
    ...activeSession,
    phase: computePreviousPhase(activeSession.phase),
  };
  syncToGameState(activeSession);
  return activeSession;
}

export function setRequirements(requirements: SessionRequirements): void {
  if (!activeSession) {
    throw new Error('No active session');
  }

  activeSession = {
    ...activeSession,
    requirements: cloneRequirements(requirements),
  };
  syncToGameState(activeSession);
}

export function getRequirements(): SessionRequirements {
  if (!activeSession) {
    throw new Error('No active session');
  }
  return cloneRequirements(activeSession.requirements);
}

export function setGraph(graph: ArchitectureGraph): void {
  if (!activeSession) {
    throw new Error('No active session');
  }

  activeSession = {
    ...activeSession,
    graph: cloneGraph(graph),
  };
  syncToGameState(activeSession);
  const snapshot = cloneGraph(graph);
  for (const listener of graphChangeListeners) {
    listener(snapshot);
  }
}

export function subscribeGraphChanges(listener: GraphChangeListener): () => void {
  graphChangeListeners.add(listener);
  return () => {
    graphChangeListeners.delete(listener);
  };
}

export function getGraph(): ArchitectureGraph {
  if (!activeSession) {
    throw new Error('No active session');
  }
  return cloneGraph(activeSession.graph);
}

export function setJudgeResult(result: JudgeResult): void {
  if (!activeSession) {
    throw new Error('No active session');
  }

  activeSession = {
    ...activeSession,
    judgeResult: cloneJudgeResult(result),
  };
  syncToGameState(activeSession);
}

export function getJudgeResult(): JudgeResult | null {
  if (!activeSession?.judgeResult) {
    return null;
  }
  return cloneJudgeResult(activeSession.judgeResult);
}

export function clearJudgeResult(): void {
  if (!activeSession) {
    throw new Error('No active session');
  }

  activeSession = {
    ...activeSession,
    judgeResult: null,
  };
  syncToGameState(activeSession);
}

/** Test helper — clears module session state between tests */
export function resetSessionStore(): void {
  activeSession = null;
  sessionIdCounter = 0;
}
