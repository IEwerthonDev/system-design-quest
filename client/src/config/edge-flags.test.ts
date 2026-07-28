import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_EDGE_FLAGS,
  loadEdgeFlags,
  parseEdgeFlags,
} from './edge-flags';

describe('edge flags (EDGE-01)', () => {
  it('parseEdgeFlags maps maintenance / newProblemIds / bannerText', () => {
    expect(
      parseEdgeFlags({
        maintenance: true,
        newProblemIds: ['url-shortener', 'youtube'],
        bannerText: 'New problems this week',
      }),
    ).toEqual({
      maintenance: true,
      newProblemIds: ['url-shortener', 'youtube'],
      bannerText: 'New problems this week',
    });
  });

  it('parseEdgeFlags fails open on garbage', () => {
    expect(parseEdgeFlags(null)).toEqual(DEFAULT_EDGE_FLAGS);
    expect(parseEdgeFlags({ maintenance: 'yes' })).toEqual(DEFAULT_EDGE_FLAGS);
  });

  it('loadEdgeFlags returns defaults when connection string missing', async () => {
    const flags = await loadEdgeFlags({ connectionString: '' });
    expect(flags).toEqual(DEFAULT_EDGE_FLAGS);
  });

  it('loadEdgeFlags fails open when fetch unreachable', async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error('network down');
    });
    const flags = await loadEdgeFlags({
      connectionString: 'https://edge-config.example/cfg',
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    expect(flags).toEqual(DEFAULT_EDGE_FLAGS);
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it('loadEdgeFlags maps successful config payload', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        maintenance: true,
        newProblemIds: ['youtube'],
        bannerText: 'Maintenance window',
      }),
    }));
    const flags = await loadEdgeFlags({
      connectionString: 'https://edge-config.example/cfg',
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    expect(flags).toEqual({
      maintenance: true,
      newProblemIds: ['youtube'],
      bannerText: 'Maintenance window',
    });
  });
});
