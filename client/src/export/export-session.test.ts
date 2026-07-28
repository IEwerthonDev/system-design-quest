import { describe, expect, it, vi } from 'vitest';
import type { ArchitectureGraph } from '@sdq/shared';
import {
  exportDiagramPng,
  exportDiagramSvg,
  exportSessionJson,
  isBlobUploadConfigured,
} from './export-session';

const sampleGraph: ArchitectureGraph = {
  nodes: [
    {
      id: 'n1',
      type: 'app_server',
      label: 'App',
      position: { x: 10, y: 20, z: 0 },
    },
    {
      id: 'n2',
      type: 'sql_database',
      label: 'DB',
      position: { x: 200, y: 20, z: 0 },
    },
  ],
  edges: [{ id: 'e1', from: 'n1', to: 'n2' }],
};

describe('export session / diagram (BLOB-01)', () => {
  it('exportSessionJson contains session/graph fields without Blob env', async () => {
    const downloads: Array<{ filename: string; body: string | Blob; mime: string }> = [];
    const result = await exportSessionJson(
      {
        problemId: 'url-shortener',
        sessionId: 'sess-1',
        graph: sampleGraph,
        mode: 'study',
      },
      {
        now: () => new Date('2026-07-28T12:00:00.000Z'),
        download: (filename, body, mime) => {
          downloads.push({ filename, body, mime });
        },
      },
    );

    expect(result.downloaded).toBe(true);
    expect(result.blobUrl).toBeUndefined();
    expect(result.mimeType).toBe('application/json');
    expect(downloads).toHaveLength(1);

    const parsed = JSON.parse(String(result.body)) as Record<string, unknown>;
    expect(parsed).toMatchObject({
      problemId: 'url-shortener',
      sessionId: 'sess-1',
      mode: 'study',
      exportedAt: '2026-07-28T12:00:00.000Z',
    });
    expect(parsed.graph).toEqual(
      expect.objectContaining({
        nodes: expect.arrayContaining([expect.objectContaining({ id: 'n1' })]),
      }),
    );
  });

  it('SVG and PNG paths do not throw without Blob', async () => {
    const download = vi.fn();
    await expect(
      exportDiagramSvg(
        { problemId: 'url-shortener', graph: sampleGraph },
        { download, now: () => new Date('2026-07-28T12:00:00.000Z') },
      ),
    ).resolves.toMatchObject({ downloaded: true, blobUrl: undefined });

    await expect(
      exportDiagramPng(
        { problemId: 'url-shortener', graph: sampleGraph },
        { download, now: () => new Date('2026-07-28T12:00:00.000Z') },
      ),
    ).resolves.toMatchObject({ downloaded: true, blobUrl: undefined });

    expect(download).toHaveBeenCalledTimes(2);
    const svgBody = String(
      (await exportDiagramSvg(
        { problemId: 'url-shortener', graph: sampleGraph },
        { download: () => undefined },
      )).body,
    );
    expect(svgBody).toContain('<svg');
    expect(svgBody).toContain('App');
  });

  it('returns Blob URL when upload is mocked', async () => {
    const uploadBlob = vi.fn(async () => 'https://blob.example/sdq-export.json');
    const result = await exportSessionJson(
      { problemId: 'url-shortener', graph: sampleGraph },
      {
        download: () => undefined,
        uploadBlob,
        now: () => new Date('2026-07-28T12:00:00.000Z'),
      },
    );
    expect(result.blobUrl).toBe('https://blob.example/sdq-export.json');
    expect(uploadBlob).toHaveBeenCalledOnce();
  });

  it('isBlobUploadConfigured reflects token presence', () => {
    expect(isBlobUploadConfigured({})).toBe(false);
    expect(isBlobUploadConfigured({ BLOB_READ_WRITE_TOKEN: 'tok' })).toBe(true);
  });
});
