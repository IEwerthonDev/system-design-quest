import type { ArchitectureGraph, PressureLevel } from '../schema/architecture-graph';
import type { SimulationEvaluation } from '../simulation/evaluate-simulation';

export interface SloTargets {
  availabilityTarget?: number;
  latencyP99TargetMs?: number;
}

export interface SloStatus {
  id: 'availability' | 'latency_p99';
  labelEn: string;
  labelPt: string;
  target: string;
  met: boolean;
}

export interface LiveMetrics {
  totalRps: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorRate: number;
  availability: number;
  budgetBurn: number;
  hottestNodeId: string | null;
  hottestLabel: string | null;
  hottestPressurePct: number;
  activeCount: number;
  failingCount: number;
  slo: SloStatus[];
  tipEn: string;
  tipPt: string;
}

function pressurePct(level: PressureLevel | undefined): number {
  if (level === 'hot') return 92;
  if (level === 'warn') return 72;
  return 18;
}

function findHottest(
  graph: ArchitectureGraph,
  evaluation: SimulationEvaluation,
): { id: string | null; label: string | null; pct: number } {
  let bestId: string | null = null;
  let bestScore = -1;
  for (const node of graph.nodes) {
    const level = evaluation.nodes[node.id];
    const score = level === 'hot' ? 3 : level === 'warn' ? 2 : 1;
    const lat = evaluation.latencyMs[node.id] ?? 0;
    const combined = score * 1000 + lat;
    if (combined > bestScore) {
      bestScore = combined;
      bestId = node.id;
    }
  }
  const node = graph.nodes.find((n) => n.id === bestId);
  const level = bestId ? evaluation.nodes[bestId] : undefined;
  return {
    id: bestId,
    label: node?.label ?? node?.type ?? null,
    pct: pressurePct(level),
  };
}

export function deriveLiveMetrics(
  graph: ArchitectureGraph,
  evaluation: SimulationEvaluation,
  sloTargets: SloTargets = {},
): LiveMetrics {
  const availabilityTarget = sloTargets.availabilityTarget ?? graph.simulation?.targetAvailability ?? 99.9;
  const latencyTarget = sloTargets.latencyP99TargetMs ?? 200;

  const availMet = evaluation.availability >= availabilityTarget;
  const latencyMet = evaluation.p99LatencyMs <= latencyTarget;
  const budgetDenom = Math.max(0.01, 100 - availabilityTarget);
  const budgetBurn = Math.max(0, (availabilityTarget - evaluation.availability) / budgetDenom);

  const hottest = findHottest(graph, evaluation);
  const levels = Object.values(evaluation.nodes);
  const failingCount = levels.filter((l) => l === 'hot').length;
  const activeCount = graph.nodes.length;
  const constrained = failingCount > 0 || levels.some((l) => l === 'warn');

  const tipEn = constrained
    ? `Hottest: ${hottest.label ?? 'component'} (${hottest.pct}%). Add capacity, caching, or redundancy — then re-check Quick Chaos.`
    : 'Design is healthy at this load. Raise the traffic slider to find the next bottleneck, or open Quick Chaos and see whether the design survives failures.';
  const tipPt = constrained
    ? `Mais quente: ${hottest.label ?? 'componente'} (${hottest.pct}%). Adicione capacidade, cache ou redundância — depois reteste no Quick Chaos.`
    : 'Design saudável nesta carga. Aumente o tráfego para achar o próximo gargalo, ou abra Quick Chaos e veja se o design sobrevive a falhas.';

  return {
    totalRps: evaluation.ingressRps,
    avgLatencyMs: evaluation.avgLatencyMs,
    p95LatencyMs: evaluation.p95LatencyMs,
    p99LatencyMs: evaluation.p99LatencyMs,
    errorRate: evaluation.errorRate,
    availability: evaluation.availability,
    budgetBurn: Math.round(budgetBurn * 100) / 100,
    hottestNodeId: hottest.id,
    hottestLabel: hottest.label,
    hottestPressurePct: hottest.pct,
    activeCount,
    failingCount,
    slo: [
      {
        id: 'latency_p99',
        labelEn: 'p99 latency target',
        labelPt: 'Meta de latência p99',
        target: `≤ ${latencyTarget}ms`,
        met: latencyMet,
      },
      {
        id: 'availability',
        labelEn: 'Availability target',
        labelPt: 'Meta de disponibilidade',
        target: `≥ ${availabilityTarget}%`,
        met: availMet,
      },
    ],
    tipEn,
    tipPt,
  };
}
