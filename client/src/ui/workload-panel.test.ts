import { describe, expect, it } from 'vitest';
import { DEFAULT_SIMULATION } from '@sdq/shared';
import { mountWorkloadPanel } from './workload-panel';

describe('workload-panel', () => {
  it('emits onChange when RPS changes', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const changes: unknown[] = [];
    const panel = mountWorkloadPanel(host, {
      getSettings: () => ({
        ...DEFAULT_SIMULATION,
        rps: 1000,
        readRps: 800,
        writeRps: 200,
      }),
      onChange: (partial) => changes.push(partial),
    });

    const input = host.querySelector<HTMLInputElement>('[data-testid="workload-rps"]')!;
    expect(input.value).toBe('1000');
    input.value = '50000';
    input.dispatchEvent(new Event('change'));
    expect(changes).toEqual([{ rps: 50000 }]);
    panel.destroy();
    host.remove();
  });
});
