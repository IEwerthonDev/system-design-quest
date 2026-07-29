import type { LiveMetrics } from '@sdq/shared';
import { getLocale, LOCALE_CHANGE_EVENT } from '../i18n/locale';
import { t } from '../i18n/t';

export interface LiveMetricsPanel {
  root: HTMLElement;
  fab: HTMLButtonElement;
  backdrop: HTMLElement;
  sync(metrics: LiveMetrics | null): void;
  open(): void;
  close(): void;
  isOpen(): boolean;
  setVisible(visible: boolean): void;
  destroy(): void;
}

export interface MountLiveMetricsPanelOptions {
  onOpen?: () => void;
}

function injectStyles(): void {
  if (document.getElementById('sdq-live-metrics-styles')) return;
  const style = document.createElement('style');
  style.id = 'sdq-live-metrics-styles';
  style.textContent = `
    .sdq-live-metrics-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 21;
      background: rgba(2, 8, 23, 0.45);
      backdrop-filter: blur(2px);
    }
    .sdq-live-metrics-backdrop.is-open { display: block; }
    .sdq-live-metrics-fab {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      position: fixed;
      right: var(--sdq-fab-stack-inset, 12px);
      bottom: calc(
        var(--sdq-fab-stack-base, calc(16px + env(safe-area-inset-bottom, 0px))) +
          3 * (var(--sdq-fab-stack-size, 44px) + var(--sdq-fab-stack-gap, 8px))
      );
      z-index: 19;
      min-height: var(--sdq-fab-stack-size, 44px);
      min-width: var(--sdq-fab-stack-size, 44px);
      padding: 10px 14px;
      border-radius: var(--sdq-radius, 10px);
      border: 1px solid var(--sdq-accent-border, rgba(201,169,98,0.35));
      background: var(--sdq-bg-elevated, #141416);
      color: var(--sdq-accent, #c9a962);
      font: 600 11px var(--sdq-font-mono, monospace);
      letter-spacing: 0.06em;
      cursor: pointer;
      touch-action: manipulation;
      box-shadow: var(--sdq-shadow);
    }
    .sdq-live-metrics-fab[hidden] { display: none !important; }
    .sdq-live-metrics {
      position: absolute;
      right: var(--sdq-fab-stack-inset, 12px);
      top: 72px;
      z-index: 22;
      width: min(300px, calc(100vw - 24px));
      max-height: min(55vh, 480px);
      overflow: auto;
      overscroll-behavior: contain;
      background: var(--sdq-bg-elevated);
      border: 1px solid var(--sdq-border);
      border-radius: 12px;
      padding: 10px 12px;
      box-shadow: var(--sdq-shadow);
      font-family: var(--sdq-font-mono);
      font-size: 11px;
      color: var(--sdq-text);
    }
    .sdq-live-metrics[hidden] { display: none !important; }
    .sdq-live-metrics--collapsed {
      visibility: hidden;
      pointer-events: none;
    }
    .sdq-live-metrics__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }
    .sdq-live-metrics__title {
      font-weight: 700;
      margin: 0;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      font-size: 10px;
      color: var(--sdq-text-subtle);
    }
    .sdq-live-metrics__collapse {
      border: 1px solid var(--sdq-border);
      background: var(--sdq-bg);
      color: var(--sdq-text);
      border-radius: 6px;
      min-width: 44px;
      min-height: 44px;
      cursor: pointer;
      touch-action: manipulation;
      font: inherit;
    }
    .sdq-live-metrics__row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin: 0 0 4px;
      line-height: 1.35;
    }
    .sdq-live-metrics__label { color: var(--sdq-text-subtle); }
    .sdq-live-metrics__value {
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .sdq-live-metrics__slo {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--sdq-border);
    }
    .sdq-live-metrics__slo-item {
      display: flex;
      justify-content: space-between;
      gap: 6px;
      margin: 0 0 4px;
    }
    .sdq-live-metrics__slo-item[data-met="true"] .sdq-live-metrics__slo-status { color: #4ade80; }
    .sdq-live-metrics__slo-item[data-met="false"] .sdq-live-metrics__slo-status { color: #f87171; }
    .sdq-live-metrics__hot {
      margin-top: 8px;
      color: #fbbf24;
      font-weight: 700;
    }
    .sdq-live-metrics__tip {
      margin-top: 8px;
      padding: 8px;
      border-radius: 8px;
      border: 1px solid var(--sdq-border);
      background: rgba(201, 169, 98, 0.08);
      line-height: 1.4;
    }
    @media (max-width: 768px) {
      .sdq-live-metrics {
        top: auto;
        bottom: calc(72px + env(safe-area-inset-bottom, 0px));
        max-height: min(60vh, 520px);
        width: min(100vw - 24px, 100%);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .sdq-live-metrics-backdrop { backdrop-filter: none; }
    }
  `;
  document.head.append(style);
}

function formatRps(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}K`;
  }
  return String(Math.round(n));
}

export function mountLiveMetricsPanel(
  parent: HTMLElement,
  options: MountLiveMetricsPanelOptions = {},
): LiveMetricsPanel {
  injectStyles();
  let openState = false;
  let visible = true;
  let latest: LiveMetrics | null = null;

  const backdrop = document.createElement('div');
  backdrop.className = 'sdq-live-metrics-backdrop';
  backdrop.setAttribute('data-testid', 'live-metrics-backdrop');

  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'sdq-live-metrics-fab';
  fab.setAttribute('data-testid', 'live-metrics-fab');

  const root = document.createElement('section');
  root.className = 'sdq-live-metrics sdq-live-metrics--collapsed';
  root.setAttribute('data-testid', 'live-metrics-panel');
  root.hidden = true;

  const header = document.createElement('div');
  header.className = 'sdq-live-metrics__header';
  const title = document.createElement('h2');
  title.className = 'sdq-live-metrics__title';
  const collapse = document.createElement('button');
  collapse.type = 'button';
  collapse.className = 'sdq-live-metrics__collapse';
  collapse.setAttribute('data-testid', 'live-metrics-collapse');
  collapse.textContent = '–';
  header.append(title, collapse);

  const body = document.createElement('div');
  body.setAttribute('data-testid', 'live-metrics-body');
  root.append(header, body);
  parent.append(backdrop, fab, root);

  const applyChrome = (): void => {
    const locale = getLocale();
    title.textContent = t('metrics.title');
    fab.textContent = t('metrics.fab');
    fab.setAttribute('aria-label', t('metrics.fab'));
    collapse.setAttribute('aria-label', t('metrics.collapse'));
    fab.hidden = !visible;
    root.hidden = !visible || !openState;
    root.classList.toggle('sdq-live-metrics--collapsed', !openState);
    backdrop.classList.toggle('is-open', openState && visible);
    renderBody(locale);
  };

  const renderBody = (locale: string): void => {
    body.replaceChildren();
    if (!latest) {
      const empty = document.createElement('p');
      empty.textContent = t('metrics.empty');
      body.append(empty);
      return;
    }
    const rows: [string, string][] = [
      [t('metrics.totalRps'), formatRps(latest.totalRps)],
      [t('metrics.avgLatency'), `${latest.avgLatencyMs}ms`],
      [t('metrics.p95p99'), `${latest.p95LatencyMs} / ${latest.p99LatencyMs}ms`],
      [t('metrics.errorRate'), `${(latest.errorRate * 100).toFixed(1)}%`],
      [t('metrics.availability'), `${latest.availability.toFixed(1)}%`],
      [t('metrics.budgetBurn'), `${latest.budgetBurn.toFixed(1)}x`],
    ];
    for (const [label, value] of rows) {
      const row = document.createElement('div');
      row.className = 'sdq-live-metrics__row';
      const l = document.createElement('span');
      l.className = 'sdq-live-metrics__label';
      l.textContent = label;
      const v = document.createElement('span');
      v.className = 'sdq-live-metrics__value';
      v.textContent = value;
      row.append(l, v);
      body.append(row);
    }

    const sloWrap = document.createElement('div');
    sloWrap.className = 'sdq-live-metrics__slo';
    sloWrap.setAttribute('data-testid', 'live-metrics-slos');
    const sloTitle = document.createElement('div');
    sloTitle.className = 'sdq-live-metrics__label';
    sloTitle.textContent = t('metrics.slos');
    sloWrap.append(sloTitle);
    for (const slo of latest.slo) {
      const item = document.createElement('div');
      item.className = 'sdq-live-metrics__slo-item';
      item.dataset.met = String(slo.met);
      const name = document.createElement('span');
      name.textContent = `${locale === 'pt-BR' ? slo.labelPt : slo.labelEn} ${slo.target}`;
      const status = document.createElement('span');
      status.className = 'sdq-live-metrics__slo-status';
      status.textContent = slo.met ? t('metrics.met') : t('metrics.missed');
      item.append(name, status);
      sloWrap.append(item);
    }
    body.append(sloWrap);

    if (latest.hottestLabel) {
      const hot = document.createElement('div');
      hot.className = 'sdq-live-metrics__hot';
      hot.setAttribute('data-testid', 'live-metrics-hottest');
      hot.textContent = `${t('metrics.hottest')}: ${latest.hottestLabel} (${latest.hottestPressurePct}%)`;
      body.append(hot);
    }

    const tip = document.createElement('div');
    tip.className = 'sdq-live-metrics__tip';
    tip.setAttribute('data-testid', 'live-metrics-tip');
    tip.textContent = locale === 'pt-BR' ? latest.tipPt : latest.tipEn;
    body.append(tip);

    const counts = document.createElement('div');
    counts.className = 'sdq-live-metrics__row';
    counts.innerHTML = `<span class="sdq-live-metrics__label">${t('metrics.activeFailing')}</span><span class="sdq-live-metrics__value">${latest.activeCount} / ${latest.failingCount}</span>`;
    body.append(counts);
  };

  const open = (): void => {
    if (!visible) return;
    openState = true;
    options.onOpen?.();
    applyChrome();
  };
  const close = (): void => {
    openState = false;
    applyChrome();
  };

  fab.addEventListener('click', () => (openState ? close() : open()));
  collapse.addEventListener('click', () => close());
  backdrop.addEventListener('click', () => close());

  const onLocale = (): void => applyChrome();
  window.addEventListener(LOCALE_CHANGE_EVENT, onLocale);
  applyChrome();

  return {
    root,
    fab,
    backdrop,
    sync(metrics) {
      latest = metrics;
      applyChrome();
    },
    open,
    close,
    isOpen: () => openState,
    setVisible(v) {
      visible = v;
      if (!v) close();
      else applyChrome();
    },
    destroy() {
      window.removeEventListener(LOCALE_CHANGE_EVENT, onLocale);
      backdrop.remove();
      fab.remove();
      root.remove();
    },
  };
}
