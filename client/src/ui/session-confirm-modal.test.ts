import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mountSessionConfirmModal,
  SESSION_STATUS_COPY,
} from './session-confirm-modal';

describe('session-confirm-modal', () => {
  let host: HTMLDivElement;
  let previousInnerWidth: number;
  let previousInnerHeight: number;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
    previousInnerWidth = window.innerWidth;
    previousInnerHeight = window.innerHeight;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 667 });
    document.getElementById('sdq-session-confirm-styles')?.remove();
  });

  afterEach(() => {
    host.remove();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousInnerWidth });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: previousInnerHeight,
    });
    document.getElementById('sdq-session-confirm-styles')?.remove();
  });

  it('shows status copy for approved, rejected, and partial', () => {
    for (const status of ['approved', 'rejected', 'partial'] as const) {
      host.innerHTML = '';
      const modal = mountSessionConfirmModal(host, {
        status,
        onConfirm: () => undefined,
        onBack: () => undefined,
      });
      expect(host.querySelector('[data-testid="session-confirm-title"]')?.textContent).toBe(
        SESSION_STATUS_COPY[status].title,
      );
      expect(host.querySelector('[data-testid="session-confirm-body"]')?.textContent).toBe(
        SESSION_STATUS_COPY[status].body,
      );
      modal.destroy();
    }
  });

  it('keeps Confirmar and Voltar visible in a 375×667 viewport fixture', () => {
    const modal = mountSessionConfirmModal(host, {
      status: 'partial',
      onConfirm: () => undefined,
      onBack: () => undefined,
    });

    const dialog = host.querySelector('[data-testid="session-confirm-dialog"]') as HTMLElement;
    const actions = host.querySelector('[data-testid="session-confirm-actions"]') as HTMLElement;
    const confirm = host.querySelector('[data-testid="session-confirm-confirm"]') as HTMLElement;
    const back = host.querySelector('[data-testid="session-confirm-back"]') as HTMLElement;

    expect(confirm).toBeTruthy();
    expect(back).toBeTruthy();
    expect(confirm.textContent).toBe('Confirmar');
    expect(back.textContent).toBe('Voltar');
    expect(actions.contains(confirm)).toBe(true);
    expect(actions.contains(back)).toBe(true);

    const styles = document.getElementById('sdq-session-confirm-styles')?.textContent ?? '';
    expect(styles).toMatch(/max-height:\s*min\(90dvh,\s*100%\)/);
    expect(styles).toMatch(/overflow-y:\s*auto/);
    expect(styles).toMatch(/width:\s*min\(420px,\s*100%\)/);

    // Dialog must not declare a fixed height larger than the fixture viewport
    expect(styles).not.toMatch(/height:\s*(8|9)\d{2,}px/);
    expect(dialog.className).toContain('sdq-session-confirm__dialog');

    modal.destroy();
  });

  it('invokes onConfirm and onBack from action buttons', () => {
    const onConfirm = vi.fn();
    const onBack = vi.fn();
    mountSessionConfirmModal(host, {
      status: 'approved',
      onConfirm,
      onBack,
    });

    host.querySelector<HTMLButtonElement>('[data-testid="session-confirm-confirm"]')!.click();
    host.querySelector<HTMLButtonElement>('[data-testid="session-confirm-back"]')!.click();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
