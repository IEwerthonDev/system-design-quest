import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createSvgEdgeLayer,
  curvePath,
  pointOnEdgeCurve,
} from './svg-edges';

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

  it('near-coincident endpoints yield a finite curved path d (no NaN)', () => {
    const cases = [
      { from: { x: 0, y: 0 }, to: { x: 0.1, y: 0 } },
      { from: { x: 40, y: 40 }, to: { x: 40, y: 40 } },
      { from: { x: 10, y: 20 }, to: { x: 10.0001, y: 20.0001 } },
    ];
    for (const { from, to } of cases) {
      const d = curvePath(from, to);
      expect(d).toMatch(/[CQ]/);
      expect(d).not.toMatch(/NaN/i);
      const nums = d.match(/-?\d+(\.\d+)?(e[-+]?\d+)?/gi) ?? [];
      expect(nums.length).toBeGreaterThan(0);
      for (const raw of nums) {
        expect(Number.isFinite(Number(raw))).toBe(true);
      }
    }
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

describe('svg-edges packet animation along Bezier (PP-04 AC3)', () => {
  const from = { x: 0, y: 50 };
  const to = { x: 200, y: 80 };
  /** Phase where cubic ≠ straight chord for horizontal-tangent controls. */
  const phase = 0.25;

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('pointOnEdgeCurve at mid-phase is not the straight chord lerp', () => {
    const onCurve = pointOnEdgeCurve(from, to, phase);
    const chord = {
      x: from.x + (to.x - from.x) * phase,
      y: from.y + (to.y - from.y) * phase,
    };
    expect(onCurve.x).not.toBeCloseTo(chord.x, 5);
    expect(onCurve.y).not.toBeCloseTo(chord.y, 5);
  });

  it('with sim running, packet cx/cy follow the Bezier, not the chord', () => {
    let rafCb: FrameRequestCallback | null = null;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCb = cb;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    vi.stubGlobal('performance', { now: () => 0 });

    const world = document.createElement('div');
    document.body.append(world);
    const layer = createSvgEdgeLayer(world);
    layer.sync(
      [{ id: 'e1', from: 'a', to: 'b', direction: 'forward' }],
      { e1: { from, to } },
      true,
      1,
    );

    expect(rafCb).toBeTypeOf('function');
    // phase = ((now - start) / 1000) * speed * 0.35; start=0, speed=1 → now = phase*1000/0.35
    const nowMs = (phase * 1000) / 0.35;
    rafCb!(nowMs);

    const packet = world.querySelector('circle');
    expect(packet).toBeTruthy();
    const cx = Number(packet!.getAttribute('cx'));
    const cy = Number(packet!.getAttribute('cy'));
    const expected = pointOnEdgeCurve(from, to, phase);
    const chord = {
      x: from.x + (to.x - from.x) * phase,
      y: from.y + (to.y - from.y) * phase,
    };

    expect(cx).toBeCloseTo(expected.x, 5);
    expect(cy).toBeCloseTo(expected.y, 5);
    expect(cx).not.toBeCloseTo(chord.x, 5);
    expect(cy).not.toBeCloseTo(chord.y, 5);

    layer.destroy();
    world.remove();
  });
});
