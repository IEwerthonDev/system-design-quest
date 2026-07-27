export type SoundId = 'place' | 'connect' | 'submit';

export interface PlaySoundOptions {
  enabled?: boolean;
  /** Injected for tests. */
  context?: AudioContextLike | null;
}

export interface AudioContextLike {
  state: string;
  resume(): Promise<void>;
  createOscillator(): OscillatorLike;
  createGain(): GainLike;
  currentTime: number;
  destination: unknown;
}

interface OscillatorLike {
  type: string;
  frequency: { setValueAtTime(value: number, time: number): void };
  connect(node: unknown): void;
  start(time?: number): void;
  stop(time?: number): void;
}

interface GainLike {
  gain: {
    setValueAtTime(value: number, time: number): void;
    linearRampToValueAtTime(value: number, time: number): void;
  };
  connect(node: unknown): void;
}

const FREQUENCIES: Record<SoundId, number> = {
  place: 520,
  connect: 660,
  submit: 880,
};

let sharedContext: AudioContextLike | null | undefined;

function getAudioContext(): AudioContextLike | null {
  if (sharedContext !== undefined) {
    return sharedContext;
  }
  try {
    const Ctx =
      typeof window !== 'undefined'
        ? window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        : undefined;
    if (!Ctx) {
      sharedContext = null;
      return null;
    }
    sharedContext = new Ctx() as unknown as AudioContextLike;
    return sharedContext;
  } catch {
    sharedContext = null;
    return null;
  }
}

/** Test helper — reset cached AudioContext. */
export function resetSoundContextForTests(): void {
  sharedContext = undefined;
}

export function playSound(id: SoundId, options: PlaySoundOptions = {}): void {
  if (options.enabled === false) {
    return;
  }

  try {
    const ctx = options.context !== undefined ? options.context : getAudioContext();
    if (!ctx) {
      return;
    }

    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => undefined);
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(FREQUENCIES[id], now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.01);
    gain.gain.linearRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  } catch {
    // Autoplay / unsupported — fail silently
  }
}
