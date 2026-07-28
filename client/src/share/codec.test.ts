import { describe, expect, it } from 'vitest';
import type { ArchitectureGraph } from '@sdq/shared';
import {
  SHARE_HASH_SOFT_LIMIT,
  applyShareHash,
  decodeShare,
  encodeShare,
  readShareFromLocation,
} from './codec';

const sampleGraph: ArchitectureGraph = {
  nodes: [
    {
      id: 'n1',
      type: 'app_server',
      label: 'App',
      position: { x: 1, y: 2, z: 0 },
    },
  ],
  edges: [],
};

describe('share codec', () => {
  it('roundtrips problemId + graph', () => {
    const encoded = encodeShare({
      v: 1,
      problemId: 'url-shortener',
      graph: sampleGraph,
    });
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) {
      return;
    }
    const decoded = decodeShare(`#${encoded.hash}`);
    expect(decoded).toEqual({
      v: 1,
      problemId: 'url-shortener',
      graph: expect.objectContaining({
        nodes: [expect.objectContaining({ id: 'n1', type: 'app_server' })],
        edges: [],
      }),
    });
  });

  it('refuses oversize payloads near the 8KB soft limit', () => {
    const hugeGraph: ArchitectureGraph = {
      nodes: Array.from({ length: 400 }, (_, i) => ({
        id: `node-${i}-${'x'.repeat(20)}`,
        type: 'app_server' as const,
        label: `Label ${i} ${'y'.repeat(40)}`,
        position: { x: i, y: i, z: 0 },
        implementationNotes: 'n'.repeat(80),
      })),
      edges: [],
    };
    const result = encodeShare({ v: 1, problemId: 'url-shortener', graph: hugeGraph });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.reason).toBe('oversize');
    expect(result.encodedLength).toBeGreaterThan(SHARE_HASH_SOFT_LIMIT);
  });

  it('ignores malformed hash safely', () => {
    expect(decodeShare('')).toBeNull();
    expect(decodeShare('#random')).toBeNull();
    expect(decodeShare('#sdq1.!!!')).toBeNull();
    expect(decodeShare('#sdq1.eyJ2Ijoid3JvbmciLCJwcm9ibGVtSWQiOiJ4In0')).toBeNull();
  });

  it('applyShareHash writes hash; readShareFromLocation restores', () => {
    const loc = { hash: '' } as Location;
    const result = applyShareHash(
      { v: 1, problemId: 'url-shortener', graph: sampleGraph },
      loc,
    );
    expect(result.ok).toBe(true);
    expect(loc.hash.startsWith('#') || loc.hash.startsWith('sdq1.')).toBe(true);
    // jsdom Location may or may not auto-prefix `#` when assigning hash
    const restored = readShareFromLocation({
      hash: loc.hash.startsWith('#') ? loc.hash : `#${loc.hash}`,
    } as Location);
    expect(restored?.problemId).toBe('url-shortener');
    expect(restored?.graph.nodes).toHaveLength(1);
  });
});
