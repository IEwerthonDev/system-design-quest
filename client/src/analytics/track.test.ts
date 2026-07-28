import { afterEach, describe, expect, it, vi } from 'vitest';
import { bindAbandonTracking, setTrackImplementation, track } from './track';

describe('analytics track (ANALYTICS-01)', () => {
  afterEach(() => {
    setTrackImplementation(null);
    delete (window as Window & { va?: unknown }).va;
  });

  it('no-ops when analytics is unavailable', () => {
    expect(() => track('phase_canvas', { problemId: 'url-shortener' })).not.toThrow();
  });

  it('forwards events to the injected implementation', () => {
    const spy = vi.fn();
    setTrackImplementation(spy);
    track('phase_requirements', { problemId: 'youtube' });
    expect(spy).toHaveBeenCalledWith('phase_requirements', { problemId: 'youtube' });
  });

  it('uses window.va when present', () => {
    const va = vi.fn();
    (window as Window & { va?: typeof va }).va = va;
    track('phase_result', { problemId: 'url-shortener' });
    expect(va).toHaveBeenCalledWith('phase_result', { problemId: 'url-shortener' });
  });

  it('emits abandon once on pagehide before result', () => {
    const spy = vi.fn();
    let phase: string | null = 'canvas';
    const unbind = bindAbandonTracking({
      getProblemId: () => 'url-shortener',
      getPhase: () => phase,
      hasReachedResult: () => false,
      trackFn: spy,
      target: window,
    });

    window.dispatchEvent(new Event('pagehide'));
    window.dispatchEvent(new Event('pagehide'));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('abandon', {
      problemId: 'url-shortener',
      phase: 'canvas',
    });

    phase = 'result';
    unbind();
  });

  it('skips abandon when result was reached', () => {
    const spy = vi.fn();
    bindAbandonTracking({
      getProblemId: () => 'url-shortener',
      getPhase: () => 'canvas',
      hasReachedResult: () => true,
      trackFn: spy,
      target: window,
    });
    window.dispatchEvent(new Event('pagehide'));
    expect(spy).not.toHaveBeenCalled();
  });
});
