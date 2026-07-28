import { describe, expect, it } from 'vitest';
import { DEFAULT_SIMULATION } from '@sdq/shared';
import { mountSimControls } from './sim-controls';
import { mountProblemDrawer } from './problem-drawer';
import { mountSessionHeader } from './session-header';
import { URL_SHORTENER } from '@sdq/shared';

describe('sim controls', () => {
  it('updates simulation settings and shows read-heavy hint', () => {
    const host = document.createElement('div');
    document.body.append(host);
    let settings = { ...DEFAULT_SIMULATION, readRatio: 90 };
    const controls = mountSimControls(host, {
      getSettings: () => settings,
      onChange: (partial) => {
        settings = { ...settings, ...partial };
      },
    });

    expect(host.querySelector('[data-testid="sim-controls"]')).toBeTruthy();
    expect(host.querySelector('[data-testid="sim-speed"]')).toBeTruthy();
    expect(host.querySelector('[data-testid="sim-traffic"]')).toBeTruthy();
    expect(host.querySelector('[data-testid="sim-read-ratio"]')).toBeTruthy();

    const traffic = host.querySelector('[data-testid="sim-traffic"]') as HTMLInputElement;
    const speed = host.querySelector('[data-testid="sim-speed"]') as HTMLInputElement;
    expect(speed.max).toBe('5');
    expect(traffic.max).toBe('5');

    traffic.value = '5';
    traffic.dispatchEvent(new Event('input', { bubbles: true }));
    expect(settings.traffic).toBe(5);

    speed.value = '5';
    speed.dispatchEvent(new Event('input', { bubbles: true }));
    expect(settings.speed).toBe(5);

    const rw = host.querySelector('[data-testid="sim-read-ratio"]') as HTMLInputElement;
    rw.value = '90';
    rw.dispatchEvent(new Event('input', { bubbles: true }));
    expect(settings.readRatio).toBe(90);

    const start = host.querySelector('[data-testid="sim-start"]') as HTMLButtonElement;
    start.click();
    expect(settings.running).toBe(true);
    expect(start.textContent).toBe('Stop');
    expect(start.dataset.running).toBe('true');
    const simStyles = document.getElementById('sdq-sim-controls-styles')?.textContent ?? '';
    expect(simStyles).toMatch(
      /\.sdq-sim-controls__start\[data-running="true"\][\s\S]*?color:\s*#0c0c0e/,
    );

    const hint = host.querySelector('[data-testid="sim-rw-hint"]');
    expect(hint?.textContent).toMatch(/Read-heavy/i);
    controls.destroy();
  });
});

describe('problem drawer', () => {
  it('opens and closes with problem title', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const drawer = mountProblemDrawer(host, URL_SHORTENER);
    expect(drawer.isOpen()).toBe(false);
    drawer.open();
    expect(drawer.isOpen()).toBe(true);
    expect(host.querySelector('[data-testid="problem-drawer"]')?.textContent).toContain(
      URL_SHORTENER.title,
    );
    drawer.close();
    expect(drawer.isOpen()).toBe(false);
    drawer.destroy();
  });
});

describe('session header', () => {
  it('shows design session title', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const header = mountSessionHeader(host, 'Design a URL Shortener');
    header.setVisible(true);
    expect(host.querySelector('[data-testid="session-title"]')?.textContent).toContain(
      'Design a URL Shortener',
    );
    expect(host.querySelector('[data-testid="session-header-leading"]')).toBeTruthy();
    expect(header.leadingSlot).toBeTruthy();
    const headerCss = document.getElementById('sdq-session-header-styles')?.textContent ?? '';
    expect(headerCss).toMatch(/\.sdq-session-header__trailing[\s\S]*?gap:\s*8px/);
    header.destroy();
  });
});
