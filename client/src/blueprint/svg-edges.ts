import type { ConnectionEdge } from '@sdq/shared';

export interface EdgeEndpoints {
  from: { x: number; y: number };
  to: { x: number; y: number };
}

export interface SvgEdgeLayer {
  svg: SVGSVGElement;
  sync(edges: ConnectionEdge[], endpoints: Record<string, EdgeEndpoints>, running: boolean, speed: number): void;
  setSelected(edgeId: string | null): void;
  setPreview(from: { x: number; y: number } | null, to?: { x: number; y: number } | null): void;
  destroy(): void;
}

/** Cubic Bezier path between edge anchors (PP-04 — must not be straight-only L). */
export function curvePath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const dx = Math.abs(to.x - from.x) * 0.4;
  const c1x = from.x + dx;
  const c2x = to.x - dx;
  return `M ${from.x} ${from.y} C ${c1x} ${from.y}, ${c2x} ${to.y}, ${to.x} ${to.y}`;
}

export function createSvgEdgeLayer(world: HTMLElement): SvgEdgeLayer {
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

  const clearPreview = (): void => {
    previewEl?.remove();
    previewEl = null;
  };

  const setPreview = (
    from: { x: number; y: number } | null,
    to?: { x: number; y: number } | null,
  ): void => {
    clearPreview();
    if (!from || !to) {
      return;
    }
    previewEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    previewEl.setAttribute('d', curvePath(from, to));
    previewEl.setAttribute('fill', 'none');
    previewEl.setAttribute('stroke', '#38bdf8');
    previewEl.setAttribute('stroke-width', '1.5');
    previewEl.setAttribute('stroke-dasharray', '6 4');
    previewEl.setAttribute('data-testid', 'edge-preview');
    previewEl.style.pointerEvents = 'none';
    svg.append(previewEl);
  };

  const sync = (
    edges: ConnectionEdge[],
    endpoints: Record<string, EdgeEndpoints>,
    running: boolean,
    speed: number,
  ): void => {
    svg.innerHTML = '';
    packetEls.length = 0;

    for (const edge of edges) {
      const ep = endpoints[edge.id];
      if (!ep) {
        continue;
      }
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.dataset.edgeId = edge.id;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', curvePath(ep.from, ep.to));
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', selectedId === edge.id ? '#38bdf8' : '#e2e8f0');
      path.setAttribute('stroke-width', selectedId === edge.id ? '2.5' : '1.5');
      path.style.pointerEvents = 'stroke';
      path.style.cursor = 'pointer';

      g.append(path);

      if (edge.label) {
        const midX = (ep.from.x + ep.to.x) / 2;
        const midY = (ep.from.y + ep.to.y) / 2 - 8;
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', String(midX));
        label.setAttribute('y', String(midY));
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('fill', '#f8fafc');
        label.setAttribute('font-size', '10');
        label.setAttribute('font-family', 'ui-monospace, monospace');
        label.textContent = edge.label;
        g.append(label);
      }

      if (running) {
        const packet = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        packet.setAttribute('r', '4');
        packet.setAttribute('fill', '#38bdf8');
        packet.dataset.edgeId = edge.id;
        g.append(packet);
        packetEls.push(packet);
      }

      svg.append(g);
    }

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
          const x = ep.from.x + (ep.to.x - ep.from.x) * phase;
          const y = ep.from.y + (ep.to.y - ep.from.y) * phase;
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
      clearPreview();
      svg.remove();
    },
  };
}
