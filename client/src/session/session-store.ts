import type { ArchitectureGraph } from '@sdq/shared';
import type { GameMode, GamePhase } from '../test-hook';
import { initGameState } from '../test-hook';
import { advancePhase as computeNextPhase, retreatPhase as computePreviousPhase } from './phase-machine';

export interface SessionRequirements {
  functional: string[];
  nonFunctional: string[];
}

export interface Session {
  id: string;
  problemId: string;
  mode: GameMode;
  phase: GamePhase;
  requirements: SessionRequirements;
  graph: ArchitectureGraph;
  startedAt: number;
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

function syncToGameState(session: Session): void {
  initGameState({
    problemId: session.problemId,
    mode: session.mode,
    phase: session.phase,
    graph: cloneGraph(session.graph),
  });
}

export function createSession(problemId: string, mode: GameMode): Session {
  sessionIdCounter += 1;
  activeSession = {
    id: `session-${sessionIdCounter}`,
    problemId,
    mode,
    phase: 'briefing',
    requirements: { functional: [], nonFunctional: [] },
    graph: { nodes: [], edges: [] },
    startedAt: Date.now(),
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
}

export function getGraph(): ArchitectureGraph {
  if (!activeSession) {
    throw new Error('No active session');
  }
  return cloneGraph(activeSession.graph);
}

/** Test helper — clears module session state between tests */
export function resetSessionStore(): void {
  activeSession = null;
  sessionIdCounter = 0;
}
