import type { ArchitectureGraph } from '../schema/architecture-graph';
import { evaluateSimulation } from '../simulation/evaluate-simulation';
import type { ChaosEventId } from './failure-catalog';
import { getChaosEvent } from './failure-catalog';
import type { SloTargets } from './derive-live-metrics';

export type ResilienceVerdict = 'SURVIVED' | 'FAILED';

export interface ResilienceResult {
  eventId: ChaosEventId;
  eventLabelEn: string;
  eventLabelPt: string;
  minAvailability: number;
  p99Ms: number;
  verdict: ResilienceVerdict;
}

/**
 * Evaluate a single chaos event alone against the current graph+workload (2A).
 * Does not compose with any UI-active chaos overlay.
 */
export function runResilienceProbe(
  graph: ArchitectureGraph,
  eventId: ChaosEventId,
  targetNodeId?: string | null,
  slo: SloTargets = {},
): ResilienceResult | null {
  if (graph.nodes.length === 0) {
    return null;
  }
  const def = getChaosEvent(eventId);
  if (!def) {
    return null;
  }

  const evaluation = evaluateSimulation(graph, {
    eventId,
    targetNodeId: targetNodeId ?? undefined,
  });

  const availabilityTarget = slo.availabilityTarget ?? graph.simulation?.targetAvailability ?? 99.9;
  const latencyTarget = slo.latencyP99TargetMs;
  const hasLatency = latencyTarget != null && Number.isFinite(latencyTarget);

  const availOk = evaluation.availability >= availabilityTarget;
  const latencyOk = hasLatency ? evaluation.p99LatencyMs <= (latencyTarget as number) : true;
  const heuristicOk =
    hasLatency || slo.availabilityTarget != null || graph.simulation?.targetAvailability != null
      ? true
      : !Object.values(evaluation.nodes).includes('hot') && evaluation.availability >= 99;

  const survived = availOk && latencyOk && heuristicOk;

  return {
    eventId,
    eventLabelEn: def.labelEn,
    eventLabelPt: def.labelPt,
    minAvailability: Math.round(evaluation.availability * 10) / 10,
    p99Ms: evaluation.p99LatencyMs,
    verdict: survived ? 'SURVIVED' : 'FAILED',
  };
}
