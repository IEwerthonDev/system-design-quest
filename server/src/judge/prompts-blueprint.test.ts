import { describe, expect, it } from 'vitest';
import { URL_SHORTENER } from '@sdq/shared';
import { buildRigorousPrompt, formatGraph } from './prompts';
import type { JudgeInput } from '@sdq/shared';

describe('judge prompts blueprint fields', () => {
  it('includes replicas, config, notes, and simulation in formatGraph', () => {
    const input: JudgeInput = {
      problemId: 'url-shortener',
      mode: 'study',
      requirements: { functional: ['shorten'], nonFunctional: ['fast'] },
      graph: {
        nodes: [
          {
            id: 'c1',
            type: 'cache_redis',
            label: 'Cache',
            replicas: 2,
            position: { x: 0, y: 0 },
            config: { kind: 'cache', hitRate: 95 },
            implementationNotes: 'cache-aside',
          },
        ],
        edges: [],
        simulation: { running: false, speed: 1, traffic: 3, readRatio: 82 },
      },
    };

    const text = formatGraph(input);
    expect(text).toContain('replicas=2');
    expect(text).toContain('"hitRate":95');
    expect(text).toContain('cache-aside');
    expect(text).toContain('traffic=3');
    expect(text).toContain('readRatio=82');
  });

  it('applies defaults for legacy graphs without crashing', () => {
    const input: JudgeInput = {
      problemId: 'url-shortener',
      mode: 'study',
      requirements: { functional: [], nonFunctional: [] },
      graph: {
        nodes: [
          {
            id: 'a',
            type: 'app_server',
            label: 'App',
            position: { x: 0, y: 0, z: 0 },
          },
        ],
        edges: [],
      },
    };
    const prompt = buildRigorousPrompt(URL_SHORTENER, input);
    expect(prompt).toContain('replicas=1');
    expect(prompt).toContain('Simulation:');
  });
});
