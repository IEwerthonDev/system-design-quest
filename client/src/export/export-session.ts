import type { ArchitectureGraph } from '@sdq/shared';

export interface SessionExportPayload {
  problemId: string;
  graph: ArchitectureGraph;
  sessionId?: string;
  mode?: string;
  requirements?: unknown;
  exportedAt?: string;
}

export interface ExportDownloadResult {
  /** Always true when client download path ran. */
  downloaded: boolean;
  filename: string;
  /** Present when optional Blob upload succeeds. */
  blobUrl?: string;
  /** MIME / content used for the download. */
  mimeType: string;
  /** Serialized body (tests assert without relying on DOM download). */
  body: string | Blob;
}

export interface ExportDeps {
  /** Trigger browser download; injectable for tests. */
  download?: (filename: string, body: Blob | string, mimeType: string) => void;
  /**
   * Optional Blob upload when token/backend is configured.
   * Return URL string, or null/undefined to skip.
   */
  uploadBlob?: (filename: string, body: Blob | string, mimeType: string) => Promise<string | null | undefined>;
  /** Resolve blueprint host for SVG/PNG snapshot (defaults to document query). */
  getBlueprintRoot?: () => Element | null;
  /** Clock for exportedAt. */
  now?: () => Date;
}

function defaultDownload(filename: string, body: Blob | string, mimeType: string): void {
  if (typeof document === 'undefined') {
    return;
  }
  const blob =
    typeof body === 'string' ? new Blob([body], { type: mimeType }) : body;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function resolveDownload(deps?: ExportDeps): NonNullable<ExportDeps['download']> {
  return deps?.download ?? defaultDownload;
}

async function maybeUpload(
  deps: ExportDeps | undefined,
  filename: string,
  body: Blob | string,
  mimeType: string,
): Promise<string | undefined> {
  if (!deps?.uploadBlob) {
    return undefined;
  }
  try {
    const url = await deps.uploadBlob(filename, body, mimeType);
    return url ?? undefined;
  } catch {
    return undefined;
  }
}

function baseFilename(problemId: string, ext: string, now: Date): string {
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const safe = problemId.replace(/[^a-zA-Z0-9_-]+/g, '-');
  return `sdq-${safe}-${stamp}.${ext}`;
}

/** Download session/graph JSON; optional Blob upload when uploadBlob is provided. */
export async function exportSessionJson(
  payload: SessionExportPayload,
  deps?: ExportDeps,
): Promise<ExportDownloadResult> {
  const now = deps?.now?.() ?? new Date();
  const bodyObj = {
    ...payload,
    exportedAt: payload.exportedAt ?? now.toISOString(),
  };
  const body = JSON.stringify(bodyObj, null, 2);
  const filename = baseFilename(payload.problemId, 'json', now);
  const mimeType = 'application/json';
  resolveDownload(deps)(filename, body, mimeType);
  const blobUrl = await maybeUpload(deps, filename, body, mimeType);
  return { downloaded: true, filename, mimeType, body, blobUrl };
}

function buildDiagramSvgMarkup(root: Element | null, graph: ArchitectureGraph): string {
  const edgesSvg = root?.querySelector('[data-testid="blueprint-edges"]');
  const world = root?.querySelector('[data-testid="blueprint-world"]') ?? root;
  const width = 1200;
  const height = 800;

  if (edgesSvg && typeof (edgesSvg as SVGElement).outerHTML === 'string') {
    const nodesXml = Array.from(world?.querySelectorAll('.sdq-node') ?? [])
      .map((node) => {
        const id = (node as HTMLElement).dataset.nodeId ?? node.getAttribute('data-node-id') ?? '';
        const label =
          node.querySelector('.sdq-node__label')?.textContent?.trim() ??
          node.textContent?.trim()?.slice(0, 40) ??
          id;
        const x = Number.parseFloat((node as HTMLElement).style.left || '0') || 0;
        const y = Number.parseFloat((node as HTMLElement).style.top || '0') || 0;
        return `<text x="${x}" y="${y + 14}" font-size="12" fill="#111">${escapeXml(label)}</text>`;
      })
      .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n${(edgesSvg as SVGElement).outerHTML}\n${nodesXml}\n</svg>`;
  }

  // Fallback: graph-only SVG (works without blueprint DOM / Blob).
  const nodeEls = graph.nodes
    .map((n, i) => {
      const x = (n.position?.x ?? i * 120) + 40;
      const y = (n.position?.y ?? 40) + 40;
      const label = escapeXml(n.label || n.type);
      return `<g transform="translate(${x},${y})"><rect width="100" height="40" rx="6" fill="#e8eef7" stroke="#334"/><text x="8" y="24" font-size="12" fill="#111">${label}</text></g>`;
    })
    .join('\n');
  const edgeEls = graph.edges
    .map((e) => {
      const from = graph.nodes.find((n) => n.id === e.from);
      const to = graph.nodes.find((n) => n.id === e.to);
      if (!from || !to) {
        return '';
      }
      const x1 = (from.position?.x ?? 0) + 90;
      const y1 = (from.position?.y ?? 0) + 60;
      const x2 = (to.position?.x ?? 0) + 40;
      const y2 = (to.position?.y ?? 0) + 60;
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#456" stroke-width="2"/>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n${edgeEls}\n${nodeEls}\n</svg>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Export blueprint (or graph fallback) as SVG download; optional Blob upload. */
export async function exportDiagramSvg(
  payload: { problemId: string; graph: ArchitectureGraph },
  deps?: ExportDeps,
): Promise<ExportDownloadResult> {
  const now = deps?.now?.() ?? new Date();
  const root =
    deps?.getBlueprintRoot?.() ??
    (typeof document !== 'undefined'
      ? document.querySelector('[data-testid="blueprint-canvas"]')
      : null);
  const body = buildDiagramSvgMarkup(root, payload.graph);
  const filename = baseFilename(payload.problemId, 'svg', now);
  const mimeType = 'image/svg+xml';
  resolveDownload(deps)(filename, body, mimeType);
  const blobUrl = await maybeUpload(deps, filename, body, mimeType);
  return { downloaded: true, filename, mimeType, body, blobUrl };
}

/**
 * Export PNG snapshot. Without canvas rasterizer, embeds SVG as a data-URL PNG wrapper
 * is not always possible in jsdom — we produce a PNG-compatible Blob via injectable
 * `rasterize` or a minimal 1×1 PNG placeholder that still downloads without throwing.
 */
export async function exportDiagramPng(
  payload: { problemId: string; graph: ArchitectureGraph },
  deps?: ExportDeps & {
    rasterize?: (svg: string) => Promise<Blob>;
  },
): Promise<ExportDownloadResult> {
  const now = deps?.now?.() ?? new Date();
  const root =
    deps?.getBlueprintRoot?.() ??
    (typeof document !== 'undefined'
      ? document.querySelector('[data-testid="blueprint-canvas"]')
      : null);
  const svg = buildDiagramSvgMarkup(root, payload.graph);
  const mimeType = 'image/png';
  const filename = baseFilename(payload.problemId, 'png', now);

  let body: Blob;
  if (deps?.rasterize) {
    body = await deps.rasterize(svg);
  } else {
    // Minimal valid 1×1 PNG — download path must not throw when Blob env missing.
    const bytes = Uint8Array.from(atob(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    ), (c) => c.charCodeAt(0));
    body = new Blob([bytes], { type: mimeType });
  }

  resolveDownload(deps)(filename, body, mimeType);
  const blobUrl = await maybeUpload(deps, filename, body, mimeType);
  return { downloaded: true, filename, mimeType, body, blobUrl };
}

/** True when a Blob upload token/env is configured for optional remote copy. */
export function isBlobUploadConfigured(
  env: { BLOB_READ_WRITE_TOKEN?: string; VITE_BLOB_READ_WRITE_TOKEN?: string } = {},
): boolean {
  return Boolean(env.BLOB_READ_WRITE_TOKEN || env.VITE_BLOB_READ_WRITE_TOKEN);
}
