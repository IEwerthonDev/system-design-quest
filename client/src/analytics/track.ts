export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

export type TrackFn = (name: string, props?: AnalyticsProps) => void;

let overrideTrack: TrackFn | null = null;

/** Test/bootstrap hook to replace the underlying analytics emitter. */
export function setTrackImplementation(fn: TrackFn | null): void {
  overrideTrack = fn;
}

/**
 * Emit a named Web Analytics event.
 * No-ops when analytics is unavailable (ANALYTICS-01).
 */
export function track(name: string, props?: AnalyticsProps): void {
  try {
    if (overrideTrack) {
      overrideTrack(name, props);
      return;
    }

    const win = typeof window !== 'undefined' ? (window as Window & { va?: TrackFn }) : undefined;
    if (typeof win?.va === 'function') {
      // Vercel Web Analytics injects window.va
      win.va(name, props);
    }
  } catch {
    // never break UX
  }
}

export interface AbandonTrackingOptions {
  getProblemId: () => string;
  getPhase: () => string | null | undefined;
  hasReachedResult: () => boolean;
  trackFn?: TrackFn;
  target?: Window | EventTarget;
}

/**
 * Emit `abandon` once on pagehide when the player leaves before result.
 * Returns an unsubscribe function.
 */
export function bindAbandonTracking(options: AbandonTrackingOptions): () => void {
  const target = options.target ?? (typeof window !== 'undefined' ? window : null);
  if (!target || typeof target.addEventListener !== 'function') {
    return () => undefined;
  }

  let emitted = false;
  const emit = (): void => {
    if (emitted || options.hasReachedResult()) {
      return;
    }
    const phase = options.getPhase();
    if (!phase || phase === 'briefing' || phase === 'result') {
      return;
    }
    emitted = true;
    const emitTrack = options.trackFn ?? track;
    emitTrack('abandon', {
      problemId: options.getProblemId(),
      phase,
    });
  };

  target.addEventListener('pagehide', emit);
  return () => {
    target.removeEventListener('pagehide', emit);
  };
}
