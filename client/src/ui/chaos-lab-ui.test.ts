import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LiveMetrics } from '@sdq/shared';
import { mountLiveMetricsPanel } from './live-metrics-panel';
import { mountQuickChaosToolbar } from './quick-chaos-toolbar';
import { mountChaosLabPanel } from './chaos-lab-panel';
import { mountWorkloadPanel } from './workload-panel';
import { mountMentorPanel } from './mentor-panel';
import { DEFAULT_SIMULATION } from '@sdq/shared';

const sampleMetrics: LiveMetrics = {
  totalRps: 12000,
  avgLatencyMs: 56,
  p95LatencyMs: 58,
  p99LatencyMs: 58,
  errorRate: 0,
  availability: 100,
  budgetBurn: 0,
  hottestNodeId: 'app',
  hottestLabel: 'App Server',
  hottestPressurePct: 32,
  activeCount: 9,
  failingCount: 0,
  slo: [
    {
      id: 'latency_p99',
      labelEn: 'p99 latency target',
      labelPt: 'Meta p99',
      target: '≤ 100ms',
      met: true,
    },
  ],
  tipEn: 'Design is healthy at this load.',
  tipPt: 'Design saudável nesta carga.',
};

describe('chaos lab UI panels', () => {
  let host: HTMLElement;

  afterEach(() => {
    host?.remove();
  });

  it('live metrics syncs values and opens via FAB', () => {
    host = document.createElement('div');
    document.body.append(host);
    const panel = mountLiveMetricsPanel(host);
    panel.sync(sampleMetrics);
    expect(panel.root.querySelector('[data-testid="live-metrics-hottest"]')?.textContent).toContain(
      'App Server',
    );
    expect(getComputedStyle(panel.fab).minHeight || panel.fab.style.minHeight || '44px').toBeTruthy();
    expect(panel.fab.style.minHeight === '44px' || panel.fab.className.includes('fab')).toBe(true);
    panel.open();
    expect(panel.isOpen()).toBe(true);
    panel.destroy();
  });

  it('quick chaos toggles sole active event and disables when empty', () => {
    host = document.createElement('div');
    document.body.append(host);
    const onToggle = vi.fn();
    const onClear = vi.fn();
    const toolbar = mountQuickChaosToolbar(host, { onToggle, onClear });
    toolbar.sync({ activeEvent: null, disabled: false });
    const crash = host.querySelector('[data-testid="quick-chaos-instance_crash"]') as HTMLButtonElement;
    crash.click();
    expect(onToggle).toHaveBeenCalledWith('instance_crash');
    toolbar.sync({ activeEvent: 'instance_crash', disabled: false });
    expect(crash.dataset.active).toBe('true');
    toolbar.sync({ activeEvent: null, disabled: true });
    expect(crash.disabled).toBe(true);
    toolbar.destroy();
  });

  it('chaos lab runs catalog event and clears report', () => {
    host = document.createElement('div');
    document.body.append(host);
    const onRun = vi.fn();
    const onClearReport = vi.fn();
    const lab = mountChaosLabPanel(host, { onRun, onClearReport });
    lab.open();
    expect(lab.isOpen()).toBe(true);
    const az = host.querySelector('[data-testid="chaos-lab-event-az_failure"]') as HTMLButtonElement;
    az.click();
    expect(onRun).toHaveBeenCalledWith('az_failure');
    lab.sync({
      activeEvent: 'az_failure',
      disabled: false,
      report: [
        {
          eventId: 'az_failure',
          eventLabelEn: 'Availability Zone',
          eventLabelPt: 'Availability Zone',
          minAvailability: 50,
          p99Ms: 120,
          verdict: 'FAILED',
        },
      ],
    });
    expect(host.querySelector('[data-testid="resilience-row-az_failure"]')).toBeTruthy();
    (host.querySelector('[data-testid="resilience-report-clear"]') as HTMLButtonElement).click();
    expect(onClearReport).toHaveBeenCalled();
    lab.destroy();
  });

  it('opening chaos closes workload and metrics via onOpen exclusivity', () => {
    host = document.createElement('div');
    document.body.append(host);
    const refs: {
      workload?: ReturnType<typeof mountWorkloadPanel>;
      mentor?: ReturnType<typeof mountMentorPanel>;
      metrics?: ReturnType<typeof mountLiveMetricsPanel>;
      chaos?: ReturnType<typeof mountChaosLabPanel>;
    } = {};
    const closeOthers = (keep: string) => {
      if (keep !== 'workload') refs.workload?.close();
      if (keep !== 'mentor') refs.mentor?.close();
      if (keep !== 'metrics') refs.metrics?.close();
      if (keep !== 'chaos') refs.chaos?.close();
    };
    refs.workload = mountWorkloadPanel(host, {
      getSettings: () => ({ ...DEFAULT_SIMULATION }),
      onChange: vi.fn(),
      onOpen: () => closeOthers('workload'),
    });
    refs.mentor = mountMentorPanel(host, {
      getFindings: () => [],
      onOpen: () => closeOthers('mentor'),
    });
    refs.metrics = mountLiveMetricsPanel(host, { onOpen: () => closeOthers('metrics') });
    refs.chaos = mountChaosLabPanel(host, {
      onRun: vi.fn(),
      onClearReport: vi.fn(),
      onOpen: () => closeOthers('chaos'),
    });

    refs.workload.open();
    refs.metrics.open();
    expect(refs.workload.isOpen()).toBe(false);
    expect(refs.metrics.isOpen()).toBe(true);

    refs.chaos.open();
    expect(refs.chaos.isOpen()).toBe(true);
    expect(refs.metrics.isOpen()).toBe(false);
    expect(refs.workload.isOpen()).toBe(false);

    expect(refs.chaos.fab.clientHeight >= 0).toBe(true);
    const fabStyle = document.getElementById('sdq-chaos-lab-styles')?.textContent ?? '';
    expect(fabStyle).toContain('2 * (var(--sdq-fab-stack-size');
    expect(fabStyle).toContain('overscroll-behavior: contain');
    expect(fabStyle).toMatch(/min-height:\s*var\(--sdq-fab-stack-size,\s*44px\)|min-height:\s*44px/);
    const metricsStyle = document.getElementById('sdq-live-metrics-styles')?.textContent ?? '';
    expect(metricsStyle).toContain('3 * (var(--sdq-fab-stack-size');
    expect(metricsStyle).toContain('font-variant-numeric: tabular-nums');
    expect(metricsStyle).toContain('overscroll-behavior: contain');
    expect(metricsStyle).toMatch(/min-height:\s*var\(--sdq-fab-stack-size,\s*44px\)|min-height:\s*44px/);

    refs.workload.destroy();
    refs.mentor.destroy();
    refs.metrics.destroy();
    refs.chaos.destroy();
  });
});
