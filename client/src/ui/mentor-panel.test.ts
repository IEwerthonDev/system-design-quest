import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSession, resetSessionStore } from '../session/session-store';
import { mountMentorPanel } from './mentor-panel';

describe('mentor-panel', () => {
  let host: HTMLElement;

  afterEach(() => {
    host?.remove();
    resetSessionStore();
  });

  function mount(askMentorFn = vi.fn().mockResolvedValue({
    action: 'bottlenecks',
    title: 'Bottlenecks',
    body: 'DB is hot',
  })) {
    resetSessionStore();
    createSession('__sandbox__', 'sandbox');
    host = document.createElement('div');
    document.body.append(host);
    return {
      panel: mountMentorPanel(host, {
        getFindings: () => [],
        askMentorFn,
      }),
      askMentorFn,
    };
  }

  it('starts collapsed with FAB visible and panel non-blocking', () => {
    const { panel } = mount();
    expect(panel.isOpen()).toBe(false);
    expect(host.querySelector('[data-testid="mentor-fab"]')).toBeTruthy();
    expect(panel.root.classList.contains('sdq-mentor--collapsed')).toBe(true);
    const css = document.getElementById('sdq-mentor-styles')?.textContent ?? '';
    expect(css).toMatch(/\.sdq-mentor--collapsed[\s\S]*pointer-events:\s*none/);
    panel.destroy();
  });

  it('opens via FAB and closes via collapse and backdrop', () => {
    const { panel } = mount();
    panel.fab.click();
    expect(panel.isOpen()).toBe(true);

    host.querySelector<HTMLButtonElement>('[data-testid="mentor-collapse"]')!.click();
    expect(panel.isOpen()).toBe(false);

    panel.fab.click();
    host.querySelector<HTMLElement>('[data-testid="mentor-backdrop"]')!.click();
    expect(panel.isOpen()).toBe(false);
    panel.destroy();
  });

  it('calls mentor API for bottlenecks action when open', async () => {
    const { panel, askMentorFn } = mount();
    panel.open();

    host.querySelector<HTMLButtonElement>('[data-testid="mentor-action-bottlenecks"]')!.click();
    await vi.waitFor(() => {
      expect(askMentorFn).toHaveBeenCalled();
    });
    expect(host.querySelector('[data-testid="mentor-result-body"]')?.textContent).toContain('DB is hot');
    panel.destroy();
  });

  it('destroy removes fab, backdrop, and panel', () => {
    const { panel } = mount();
    panel.destroy();
    expect(host.querySelector('[data-testid="mentor-panel"]')).toBeNull();
    expect(host.querySelector('[data-testid="mentor-fab"]')).toBeNull();
    expect(host.querySelector('[data-testid="mentor-backdrop"]')).toBeNull();
  });
});
