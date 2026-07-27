import type { ArchitectureGraph } from '@sdq/shared';
import { getGraph, setGraph } from '../session/session-store';
import { getGameState } from '../test-hook';

export interface SdqE2eHooks {
  setGraph: (graph: ArchitectureGraph) => void;
  getGraph: () => ArchitectureGraph;
  getGameState: () => ReturnType<typeof getGameState>;
}

declare global {
  interface Window {
    __SDQ_E2E__?: SdqE2eHooks;
  }
}

/** Install browser hooks used by Playwright (DOM + graph, not WebGL). */
export function installE2eHooks(): void {
  window.__SDQ_E2E__ = {
    setGraph,
    getGraph,
    getGameState,
  };
}
