import type { GamePhase } from '../test-hook';

export const PHASE_ORDER: readonly GamePhase[] = [
  'briefing',
  'requirements',
  'canvas',
  'result',
];

export function getPreviousPhase(phase: GamePhase): GamePhase | null {
  const index = PHASE_ORDER.indexOf(phase);
  if (index <= 0) {
    return null;
  }
  return PHASE_ORDER[index - 1] ?? null;
}

export function canGoBackPhase(phase: GamePhase): boolean {
  return getPreviousPhase(phase) !== null;
}

export function retreatPhase(phase: GamePhase): GamePhase {
  const previous = getPreviousPhase(phase);
  if (!previous) {
    throw new Error(`Cannot go back from phase: ${phase}`);
  }
  return previous;
}

export function canAdvancePhase(phase: GamePhase): boolean {
  return phase !== 'result';
}

export function getNextPhase(phase: GamePhase): GamePhase | null {
  const index = PHASE_ORDER.indexOf(phase);
  if (index === -1 || index >= PHASE_ORDER.length - 1) {
    return null;
  }
  return PHASE_ORDER[index + 1] ?? null;
}

export function advancePhase(phase: GamePhase): GamePhase {
  const next = getNextPhase(phase);
  if (!next) {
    throw new Error(`Cannot advance from phase: ${phase}`);
  }
  return next;
}
