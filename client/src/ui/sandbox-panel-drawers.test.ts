import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SIMULATION } from '@sdq/shared';
import { createSession, resetSessionStore } from '../session/session-store';
import { mountMentorPanel } from './mentor-panel';
import { mountWorkloadPanel } from './workload-panel';

describe('sandbox panel drawer exclusivity', () => {
  let host: HTMLElement;

  afterEach(() => {
    host?.remove();
    resetSessionStore();
  });

  it('opening workload closes mentor and vice versa via onOpen', () => {
    resetSessionStore();
    createSession('__sandbox__', 'sandbox');
    host = document.createElement('div');
    document.body.append(host);

    let workload: ReturnType<typeof mountWorkloadPanel>;
    let mentor: ReturnType<typeof mountMentorPanel>;

    workload = mountWorkloadPanel(host, {
      getSettings: () => ({ ...DEFAULT_SIMULATION }),
      onChange: vi.fn(),
      onOpen: () => mentor.close(),
    });
    mentor = mountMentorPanel(host, {
      getFindings: () => [],
      onOpen: () => workload.close(),
    });

    mentor.open();
    expect(mentor.isOpen()).toBe(true);
    expect(workload.isOpen()).toBe(false);

    workload.open();
    expect(workload.isOpen()).toBe(true);
    expect(mentor.isOpen()).toBe(false);

    mentor.open();
    expect(mentor.isOpen()).toBe(true);
    expect(workload.isOpen()).toBe(false);

    workload.destroy();
    mentor.destroy();
  });
});
