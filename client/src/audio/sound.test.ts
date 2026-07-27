import { describe, expect, it, vi, beforeEach } from 'vitest';
import { playSound, resetSoundContextForTests, type AudioContextLike } from './sound';

function createMockContext(): AudioContextLike & {
  oscillators: Array<{ start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }>;
} {
  const oscillators: Array<{ start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }> =
    [];
  return {
    state: 'running',
    currentTime: 0,
    destination: {},
    oscillators,
    resume: vi.fn(async () => undefined),
    createOscillator: () => {
      const osc = {
        type: 'sine',
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      oscillators.push(osc);
      return osc;
    },
    createGain: () => ({
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    }),
  };
}

describe('playSound', () => {
  beforeEach(() => {
    resetSoundContextForTests();
  });

  it('plays oscillator for place/connect/submit when enabled', () => {
    const ctx = createMockContext();
    playSound('place', { enabled: true, context: ctx });
    playSound('connect', { enabled: true, context: ctx });
    playSound('submit', { enabled: true, context: ctx });
    expect(ctx.oscillators).toHaveLength(3);
    expect(ctx.oscillators[0]?.start).toHaveBeenCalled();
  });

  it('does not play when muted', () => {
    const ctx = createMockContext();
    playSound('place', { enabled: false, context: ctx });
    expect(ctx.oscillators).toHaveLength(0);
  });

  it('fails silently when context is null', () => {
    expect(() => playSound('submit', { enabled: true, context: null })).not.toThrow();
  });
});
