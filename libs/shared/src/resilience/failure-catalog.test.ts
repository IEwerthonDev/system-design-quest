import { describe, expect, it } from 'vitest';
import {
  getChaosEvent,
  listChaosEvents,
  QUICK_CHAOS_IDS,
} from './failure-catalog';

describe('failure-catalog', () => {
  it('exposes exactly 7 quick chaos events', () => {
    expect(QUICK_CHAOS_IDS).toHaveLength(7);
    expect(listChaosEvents('quick').map((e) => e.id)).toEqual([...QUICK_CHAOS_IDS]);
  });

  it('lists infra and network groups with scope metadata', () => {
    const infra = listChaosEvents('infra');
    const network = listChaosEvents('network');
    expect(infra.length).toBeGreaterThanOrEqual(8);
    expect(network.length).toBeGreaterThanOrEqual(2);
    expect(infra.every((e) => e.group === 'infra')).toBe(true);
    expect(getChaosEvent('traffic_surge')?.scope).toBe('global');
    expect(getChaosEvent('instance_crash')?.scope).toBe('targeted');
  });

  it('returns undefined for unknown lookups via cast', () => {
    expect(getChaosEvent('cpu_spike')?.labelEn).toBe('CPU Spike');
  });
});
