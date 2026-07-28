import { describe, expect, it, vi } from 'vitest';
import type { ArchitectureGraph } from '@sdq/shared';
import { SHARE_HASH_SOFT_LIMIT, encodeShare } from './codec';
import { shareDesign, sharedPayloadToDesignSession } from './share-design';

const sampleGraph: ArchitectureGraph = {
  nodes: [
    {
      id: 'n1',
      type: 'cdn',
      label: 'CDN',
      position: { x: 0, y: 0, z: 0 },
    },
  ],
  edges: [],
};

describe('shareDesign', () => {
  it('writes hash and copies URL for a compact design', async () => {
    const loc = { hash: '', href: 'https://example.test/app' } as Location;
    const copyText = vi.fn().mockResolvedValue(undefined);
    const onCopied = vi.fn();

    const status = await shareDesign({
      problemId: 'url-shortener',
      graph: sampleGraph,
      location: loc,
      copyText,
      onCopied,
    });

    expect(status).toBe('shared');
    expect(loc.hash.length).toBeGreaterThan(0);
    expect(copyText).toHaveBeenCalled();
    expect(onCopied).toHaveBeenCalled();
  });

  it('offers JSON backup hook when oversize without writing hash', async () => {
    const huge: ArchitectureGraph = {
      nodes: Array.from({ length: 400 }, (_, i) => ({
        id: `n${i}${'x'.repeat(24)}`,
        type: 'app_server' as const,
        label: `L${i}${'y'.repeat(40)}`,
        position: { x: i, y: 0, z: 0 },
        implementationNotes: 'z'.repeat(100),
      })),
      edges: [],
    };
    expect(encodeShare({ v: 1, problemId: 'url-shortener', graph: huge }).ok).toBe(false);

    const loc = { hash: '', href: 'https://example.test/app' } as Location;
    const onOversized = vi.fn();
    const status = await shareDesign({
      problemId: 'url-shortener',
      graph: huge,
      location: loc,
      onOversized,
    });

    expect(status).toBe('oversized');
    expect(loc.hash).toBe('');
    expect(onOversized).toHaveBeenCalled();
    const [json, message] = onOversized.mock.calls[0]!;
    expect(typeof json).toBe('string');
    expect(JSON.parse(json as string).problemId).toBe('url-shortener');
    expect(String(message).length).toBeGreaterThan(0);
    expect((json as string).length).toBeGreaterThan(SHARE_HASH_SOFT_LIMIT / 4);
  });

  it('builds a design session for shared payloads without nickname', () => {
    const record = sharedPayloadToDesignSession({
      v: 1,
      problemId: 'url-shortener',
      graph: sampleGraph,
    });
    expect(record.playerNickname).toBe('');
    expect(record.problemId).toBe('url-shortener');
    expect(record.graph.nodes).toHaveLength(1);
    expect(record.status).toBe('in_progress');
  });
});
