import { describe, expect, it, vi } from 'vitest';
import { createSession, resetSessionStore } from '../session/session-store';
import { mountMentorPanel } from './mentor-panel';

describe('mentor-panel', () => {
  it('calls mentor API for bottlenecks action', async () => {
    resetSessionStore();
    createSession('__sandbox__', 'sandbox');
    const host = document.createElement('div');
    document.body.append(host);
    const askMentorFn = vi.fn().mockResolvedValue({
      action: 'bottlenecks',
      title: 'Bottlenecks',
      body: 'DB is hot',
    });
    const panel = mountMentorPanel(host, {
      getFindings: () => [],
      askMentorFn,
    });

    host.querySelector<HTMLButtonElement>('[data-testid="mentor-action-bottlenecks"]')!.click();
    await vi.waitFor(() => {
      expect(askMentorFn).toHaveBeenCalled();
    });
    expect(host.querySelector('[data-testid="mentor-result-body"]')?.textContent).toContain('DB is hot');
    panel.destroy();
    host.remove();
  });
});
