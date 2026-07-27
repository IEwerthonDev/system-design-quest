import { describe, expect, it } from 'vitest';
import { createSvgEdgeLayer, curvePath } from './svg-edges';

describe('svg-edges curvePath', () => {
  it('uses Bezier C or Q commands, not a straight-only L segment', () => {
    const d = curvePath({ x: 0, y: 50 }, { x: 200, y: 80 });
    expect(d).toMatch(/[CQ]/);
    expect(d).not.toMatch(/^M [^L]+ L [^C]+$/);
    // A straight-only path would be M … L … with no curve command
    const straightOnly = `M 0 50 L 200 80`;
    expect(straightOnly).not.toMatch(/[CQ]/);
    expect(d).not.toBe(straightOnly);
  });

  it('renders edge paths with Bezier curves via the SVG layer', () => {
    const world = document.createElement('div');
    document.body.append(world);
    const layer = createSvgEdgeLayer(world);
    layer.sync(
      [{ id: 'e1', from: 'a', to: 'b', direction: 'forward', label: 'REQ' }],
      {
        e1: { from: { x: 10, y: 20 }, to: { x: 210, y: 40 } },
      },
      false,
      1,
    );
    const path = world.querySelector('path');
    expect(path).toBeTruthy();
    const d = path!.getAttribute('d') ?? '';
    expect(d).toMatch(/[CQ]/);
    expect(d).not.toMatch(/^M [\d.]+ [\d.]+ L [\d.]+ [\d.]+$/);
    layer.destroy();
  });

  it('preview connection path also uses a Bezier curve', () => {
    const world = document.createElement('div');
    document.body.append(world);
    const layer = createSvgEdgeLayer(world);
    layer.setPreview({ x: 0, y: 0 }, { x: 100, y: 50 });
    const preview = world.querySelector('[data-testid="edge-preview"]');
    expect(preview).toBeTruthy();
    const d = preview!.getAttribute('d') ?? '';
    expect(d).toMatch(/[CQ]/);
    layer.setPreview(null);
    expect(world.querySelector('[data-testid="edge-preview"]')).toBeNull();
    layer.destroy();
  });
});
