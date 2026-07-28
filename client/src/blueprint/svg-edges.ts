import type { ConnectionEdge, ConnectionPairStatus } from '@sdq/shared';
import { SDQ_COLORS } from '../theme/tokens';

export interface EdgeEndpoints {
  from: { x: number; y: number };
  to: { x: number; y: number };
}

export interface SvgEdgeLayer {
  svg: SVGSVGElement;
  sync(
    edges: ConnectionEdge[],
    endpoints: Record<string, EdgeEndpoints>,
    running: boolean,
    speed: number,
    pairStatus?: Record<string, ConnectionPairStatus>,
  ): void;
  setSelected(edgeId: string | null): void;
  setPreview(
    from: { x: number; y: number } | null,
    to?: { x: number; y: number } | null,
    status?: ConnectionPairStatus,
  ): void;
  destroy(): void;
}

export interface CurveControlPoints {
  p0: { x: number; y: number };
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  p3: { x: number; y: number };
}

/** Control points for the cubic Bezier used by `curvePath` / packet animation (PP-04). */
export function edgeCurveControls(
  from: { x: number; y: number },
  to: { x: number; y: number },
): CurveControlPoints {
  const dx = Math.abs(to.x - from.x) * 0.4;
  return {
    p0: { x: from.x, y: from.y },
    p1: { x: from.x + dx, y: from.y },
    p2: { x: to.x - dx, y: to.y },
    p3: { x: to.x, y: to.y },
  };
}

/** Sample a point on the same cubic Bezier as the edge `d` (PP-04 AC3). */
export function pointOnEdgeCurve(
  from: { x: number; y: number },
  to: { x: number; y: number },
  t: number,
): { x: number; y: number } {
  const { p0, p1, p2, p3 } = edgeCurveControls(from, to);
  const u = 1 - t;
  const uu = u * u;
  const tt = t * t;
  const uuu = uu * u;
  const ttt = tt * t;
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}

/** Cubic Bezier path between edge anchors (PP-04 — must not be straight-only L). */
export function curvePath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const { p0, p1, p2, p3 } = edgeCurveControls(from, to);
  return `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`;
}

export function strokeForPairStatus(
  status: ConnectionPairStatus | undefined,
  selected: boolean,
): string {
  if (selected) {
    return SDQ_COLORS.accent;
  }
  if (status === 'warn') {
    return SDQ_COLORS.warning;
  }
  if (status === 'invalid') {
    return SDQ_COLORS.danger;
  }
  return SDQ_COLORS.edgeStroke;
}

export interface SvgEdgeLayerOptions {
  onEdgeActivate?: (edgeId: string) => void;
}

export function createSvgEdgeLayer(
  world: HTMLElement,
  options: SvgEdgeLayerOptions = {},
): SvgEdgeLayer {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('sdq-blueprint-edges');
  svg.setAttribute('data-testid', 'blueprint-edges');
  Object.assign(svg.style, {
    position: 'absolute',
    inset: '0',
    width: '100%',
    height: '100%',
    overflow: 'visible',
    pointerEvents: 'none',
    zIndex: '1',
  });
  world.append(svg);

  let selectedId: string | null = null;
  let animFrame = 0;
  const packetEls: SVGCircleElement[] = [];
  let previewEl: SVGPathElement | null = null;
  let lastPreview: {
    from: { x: number; y: number };
    to: { x: number; y: number };
    status: ConnectionPairStatus;
  } | null = null;

  // Delegation survives sync's innerHTML clear (listeners on the SVG root).
  svg.addEventListener('pointerdown', (ev) => {
    if (!options.onEdgeActivate) return;
    const target = ev.target;
    if (!(target instanceof Element)) return;
    const edgeHost = target.closest('[data-edge-id]');
    const edgeId = edgeHost?.getAttribute('data-edge-id');
    if (!edgeId) return;
    ev.stopPropagation();
    options.onEdgeActivate(edgeId);
  });

  const clearPreview = (): void => {
    previewEl?.remove();
    previewEl = null;
  };

  const paintPreview = (): void => {
    clearPreview();
    if (!lastPreview) {
      return;
    }
    previewEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    previewEl.setAttribute('d', curvePath(lastPreview.from, lastPreview.to));
    previewEl.setAttribute('fill', 'none');
    previewEl.setAttribute('stroke', strokeForPairStatus(lastPreview.status, false));
    previewEl.setAttribute('stroke-width', '1.5');
    previewEl.setAttribute('stroke-dasharray', '6 4');
    previewEl.setAttribute('data-testid', 'edge-preview');
    previewEl.setAttribute('data-pair-status', lastPreview.status);
    previewEl.style.pointerEvents = 'none';
    svg.append(previewEl);
  };

  const setPreview = (
    from: { x: number; y: number } | null,
    to?: { x: number; y: number } | null,
    status: ConnectionPairStatus = 'ok',
  ): void => {
    if (!from || !to) {
      lastPreview = null;
      clearPreview();
      return;
    }
    lastPreview = { from, to, status };
    paintPreview();
  };

  const sync = (
    edges: ConnectionEdge[],
    endpoints: Record<string, EdgeEndpoints>,
    running: boolean,
    speed: number,
    pairStatus: Record<string, ConnectionPairStatus> = {},
  ): void => {
    svg.innerHTML = '';
    packetEls.length = 0;
    previewEl = null;

    for (const edge of edges) {
      const ep = endpoints[edge.id];
      if (!ep) {
        continue;
      }
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.dataset.edgeId = edge.id;
      const status = pairStatus[edge.id];
      if (status) {
        g.dataset.pairStatus = status;
      }

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', curvePath(ep.from, ep.to));
      path.setAttribute('fill', 'none');
      const selected = selectedId === edge.id;
      path.setAttribute('stroke', strokeForPairStatus(status, selected));
      path.setAttribute('stroke-width', selected ? '2.5' : '1.5');
      path.style.pointerEvents = 'stroke';
      path.style.cursor = 'pointer';

      g.append(path);

      if (edge.label) {
        const mid = pointOnEdgeCurve(ep.from, ep.to, 0.5);
        const midX = mid.x;
        const midY = mid.y - 10;
        const pill = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        pill.setAttribute('data-testid', 'edge-label');
        pill.setAttribute('data-edge-id', edge.id);
        if (selected) {
          pill.classList.add('is-selected');
          pill.setAttribute('data-selected', 'true');
        }
        pill.style.pointerEvents = 'all';
        pill.style.cursor = 'pointer';

        const labelText = edge.label;
        const padX = 6;
        const approxW = Math.max(28, labelText.length * 7 + padX * 2);
        const h = 16;
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', String(midX - approxW / 2));
        rect.setAttribute('y', String(midY - h / 2));
        rect.setAttribute('width', String(approxW));
        rect.setAttribute('height', String(h));
        rect.setAttribute('rx', '8');
        rect.setAttribute('ry', '8');
        rect.setAttribute('fill', selected ? SDQ_COLORS.accent : SDQ_COLORS.bgSurface);
        rect.setAttribute('stroke', selected ? SDQ_COLORS.accent : SDQ_COLORS.textSubtle);
        rect.setAttribute('stroke-width', '1');

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(midX));
        text.setAttribute('y', String(midY + 3.5));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', selected ? SDQ_COLORS.bg : SDQ_COLORS.text);
        text.setAttribute('font-size', '10');
        text.setAttribute('font-family', 'ui-monospace, monospace');
        text.style.pointerEvents = 'none';
        text.textContent = labelText;

        pill.append(rect, text);
        g.append(pill);
      }

      if (running) {
        const packet = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        packet.setAttribute('r', '4');
        packet.setAttribute('fill', SDQ_COLORS.accent);
        packet.dataset.edgeId = edge.id;
        g.append(packet);
        packetEls.push(packet);
      }

      svg.append(g);
    }

    // Re-apply live linking preview after sync clears SVG children.
    paintPreview();

    cancelAnimationFrame(animFrame);
    if (running && packetEls.length > 0) {
      const start = performance.now();
      const tick = (now: number): void => {
        const t = ((now - start) / 1000) * Math.max(1, speed) * 0.35;
        const phase = t % 1;
        for (const edge of edges) {
          const ep = endpoints[edge.id];
          const packet = packetEls.find((p) => p.dataset.edgeId === edge.id);
          if (!ep || !packet) {
            continue;
          }
          const { x, y } = pointOnEdgeCurve(ep.from, ep.to, phase);
          packet.setAttribute('cx', String(x));
          packet.setAttribute('cy', String(y));
        }
        animFrame = requestAnimationFrame(tick);
      };
      animFrame = requestAnimationFrame(tick);
    }
  };

  return {
    svg,
    sync,
    setSelected(edgeId) {
      selectedId = edgeId;
    },
    setPreview,
    destroy() {
      cancelAnimationFrame(animFrame);
      lastPreview = null;
      clearPreview();
      svg.remove();
    },
  };
}
