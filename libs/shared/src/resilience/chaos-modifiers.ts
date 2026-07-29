import type { ArchitectureGraph, ComponentNode, PressureLevel } from '../schema/architecture-graph';
import { normalizeGraph } from '../schema/normalize-graph';
import type { ChaosEventId } from './failure-catalog';
import { getChaosEvent } from './failure-catalog';

export interface ChaosContext {
  eventId: ChaosEventId;
  targetNodeId?: string;
}

export interface ChaosEffects {
  capacityMultiplierByNode: Record<string, number>;
  ingressMultiplier: number;
  hitRateOverride: number | null;
  latencyFloorMs: number;
  errorRate: number;
  availabilityCap: number;
  targetNodeId: string | null;
  reasonEn: string;
  reasonPt: string;
}

const CLIENT_TYPES = new Set(['client_web', 'client_mobile']);

export function pickChaosTarget(
  graph: ArchitectureGraph,
  preferredId: string | undefined,
  pressure?: Record<string, PressureLevel>,
): string | null {
  const normalized = normalizeGraph(graph);
  if (normalized.nodes.length === 0) {
    return null;
  }
  if (preferredId && normalized.nodes.some((n) => n.id === preferredId)) {
    return preferredId;
  }
  if (pressure) {
    const hot = normalized.nodes.find((n) => pressure[n.id] === 'hot' && !CLIENT_TYPES.has(n.type));
    if (hot) {
      return hot.id;
    }
    const warn = normalized.nodes.find((n) => pressure[n.id] === 'warn' && !CLIENT_TYPES.has(n.type));
    if (warn) {
      return warn.id;
    }
  }
  const eligible = normalized.nodes.find((n) => !CLIENT_TYPES.has(n.type));
  return eligible?.id ?? normalized.nodes[0]?.id ?? null;
}

function crashMultiplier(node: ComponentNode): number {
  const reps = Math.max(1, node.replicas ?? 1);
  if (reps <= 1) {
    return 0;
  }
  return (reps - 1) / reps;
}

function emptyEffects(reasonEn: string, reasonPt: string): ChaosEffects {
  return {
    capacityMultiplierByNode: {},
    ingressMultiplier: 1,
    hitRateOverride: null,
    latencyFloorMs: 0,
    errorRate: 0,
    availabilityCap: 100,
    targetNodeId: null,
    reasonEn,
    reasonPt,
  };
}

export function resolveChaosEffects(
  graph: ArchitectureGraph,
  ctx: ChaosContext,
  pressure?: Record<string, PressureLevel>,
): ChaosEffects {
  const def = getChaosEvent(ctx.eventId);
  if (!def) {
    return emptyEffects('Unknown chaos event', 'Evento de caos desconhecido');
  }

  const normalized = normalizeGraph(graph);
  if (normalized.nodes.length === 0) {
    return emptyEffects('Empty graph', 'Grafo vazio');
  }

  const targetId =
    def.scope === 'targeted'
      ? pickChaosTarget(graph, ctx.targetNodeId, pressure)
      : null;

  const target = targetId ? normalized.nodes.find((n) => n.id === targetId) : undefined;
  const byNode: Record<string, number> = {};
  let ingressMultiplier = 1;
  let hitRateOverride: number | null = null;
  let latencyFloorMs = 0;
  let errorRate = 0;
  let availabilityCap = 100;

  const setTargetCap = (mult: number) => {
    if (target) {
      byNode[target.id] = mult;
    }
  };

  switch (ctx.eventId) {
    case 'cpu_spike':
    case 'vm_cpu':
      setTargetCap(0.5);
      latencyFloorMs = 160;
      break;
    case 'network_partition':
      setTargetCap(0.15);
      errorRate = 0.35;
      availabilityCap = 40;
      break;
    case 'high_latency':
      latencyFloorMs = 250;
      availabilityCap = 99;
      break;
    case 'connection_flap':
      setTargetCap(0.7);
      errorRate = 0.25;
      availabilityCap = 50;
      break;
    case 'instance_crash':
    case 'host_hardware':
      if (target) {
        byNode[target.id] = crashMultiplier(target);
      }
      errorRate = target && (target.replicas ?? 1) <= 1 ? 0.6 : 0.15;
      availabilityCap = target && (target.replicas ?? 1) <= 1 ? 0 : 70;
      break;
    case 'cache_stampede':
      hitRateOverride = 0;
      errorRate = 0.05;
      availabilityCap = 95;
      break;
    case 'traffic_surge':
      ingressMultiplier = 5;
      break;
    case 'az_failure':
      for (const n of normalized.nodes) {
        if (!CLIENT_TYPES.has(n.type)) {
          byNode[n.id] = 0.5;
        }
      }
      availabilityCap = 50;
      errorRate = 0.1;
      break;
    case 'dc_failure':
      for (const n of normalized.nodes) {
        if (!CLIENT_TYPES.has(n.type)) {
          byNode[n.id] = 0.1;
        }
      }
      availabilityCap = 10;
      errorRate = 0.5;
      break;
    case 'instance_slow':
      setTargetCap(0.4);
      latencyFloorMs = 180;
      break;
    case 'disk_failure':
      setTargetCap(0.5);
      errorRate = 0.2;
      availabilityCap = 85;
      break;
    case 'disk_corruption':
      setTargetCap(0.6);
      errorRate = 0.4;
      availabilityCap = 70;
      break;
    case 'storage_iops':
      setTargetCap(0.35);
      latencyFloorMs = 200;
      break;
    case 'filesystem':
      setTargetCap(0.7);
      latencyFloorMs = 220;
      errorRate = 0.15;
      break;
    case 'cross_region_loss':
      latencyFloorMs = 300;
      errorRate = 0.2;
      availabilityCap = 80;
      break;
    case 'packet_loss':
      errorRate = 0.3;
      availabilityCap = 75;
      break;
    default:
      break;
  }

  return {
    capacityMultiplierByNode: byNode,
    ingressMultiplier,
    hitRateOverride,
    latencyFloorMs,
    errorRate,
    availabilityCap,
    targetNodeId: targetId,
    reasonEn: def.descriptionEn,
    reasonPt: def.descriptionPt,
  };
}
