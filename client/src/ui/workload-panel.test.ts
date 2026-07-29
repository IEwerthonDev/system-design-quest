import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_SIMULATION } from '@sdq/shared';
import { mountWorkloadPanel } from './workload-panel';

describe('workload-panel', () => {
  let host: HTMLElement;

  afterEach(() => {
    host?.remove();
  });

  function mount(onChange: (partial: unknown) => void = () => undefined) {
    host = document.createElement('div');
    document.body.append(host);
    return mountWorkloadPanel(host, {
      getSettings: () => ({
        ...DEFAULT_SIMULATION,
        rps: 1000,
        readRps: 800,
        writeRps: 200,
      }),
      onChange,
    });
  }

  it('starts collapsed with FAB visible and panel non-blocking', () => {
    const panel = mount();
    expect(panel.isOpen()).toBe(false);
    expect(host.querySelector('[data-testid="workload-fab"]')).toBeTruthy();
    expect(panel.root.classList.contains('sdq-workload--collapsed')).toBe(true);
    const css = document.getElementById('sdq-workload-styles')?.textContent ?? '';
    expect(css).toMatch(/\.sdq-workload--collapsed[\s\S]*pointer-events:\s*none/);
    panel.destroy();
  });

  it('stacks Carga FAB on the right edge slot 0 with guideline polish', () => {
    const panel = mount();
    const css = document.getElementById('sdq-workload-styles')?.textContent ?? '';
    expect(css).toMatch(/\.sdq-workload-fab[\s\S]*right:\s*var\(--sdq-fab-stack-inset/);
    expect(css).not.toMatch(/\.sdq-workload-fab[\s\S]*left:\s*12px/);
    expect(css).toContain('0 * (var(--sdq-fab-stack-size');
    expect(css).toContain('overscroll-behavior: contain');
    expect(css).toContain('prefers-reduced-motion: reduce');
    panel.destroy();
  });

  it('opens via FAB and closes via collapse and backdrop', () => {
    const panel = mount();
    panel.fab.click();
    expect(panel.isOpen()).toBe(true);
    expect(panel.root.classList.contains('sdq-workload--collapsed')).toBe(false);

    host.querySelector<HTMLButtonElement>('[data-testid="workload-collapse"]')!.click();
    expect(panel.isOpen()).toBe(false);

    panel.fab.click();
    expect(panel.isOpen()).toBe(true);
    host.querySelector<HTMLElement>('[data-testid="workload-backdrop"]')!.click();
    expect(panel.isOpen()).toBe(false);
    panel.destroy();
  });

  it('emits onChange when RPS changes while open', () => {
    const changes: unknown[] = [];
    const panel = mount((partial) => changes.push(partial));
    panel.open();

    const input = host.querySelector<HTMLInputElement>('[data-testid="workload-rps"]')!;
    expect(input.value).toBe('1000');
    input.value = '50000';
    input.dispatchEvent(new Event('change'));
    expect(changes).toEqual([{ rps: 50000 }]);
    panel.destroy();
  });

  it('destroy removes fab, backdrop, and panel', () => {
    const panel = mount();
    panel.destroy();
    expect(host.querySelector('[data-testid="workload-panel"]')).toBeNull();
    expect(host.querySelector('[data-testid="workload-fab"]')).toBeNull();
    expect(host.querySelector('[data-testid="workload-backdrop"]')).toBeNull();
  });

  it('setVisible(false) collapses panel and hides FAB', () => {
    const panel = mount();
    panel.open();
    expect(panel.isOpen()).toBe(true);
    panel.setVisible(false);
    expect(panel.isOpen()).toBe(false);
    expect(panel.fab.hidden).toBe(true);
    expect(panel.root.hidden).toBe(true);
    panel.setVisible(true);
    expect(panel.root.hidden).toBe(false);
    expect(panel.isOpen()).toBe(false);
    expect(panel.fab.hidden).toBe(false);
    panel.destroy();
  });
});
