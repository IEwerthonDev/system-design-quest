import type { ChaosEventId, ResilienceResult } from '@sdq/shared';
import { listChaosEvents } from '@sdq/shared';
import { getLocale, LOCALE_CHANGE_EVENT } from '../i18n/locale';
import { t } from '../i18n/t';
import { mountResilienceReport } from './resilience-report';

export interface ChaosLabPanel {
  root: HTMLElement;
  fab: HTMLButtonElement;
  backdrop: HTMLElement;
  sync(state: {
    report: ResilienceResult[];
    activeEvent: ChaosEventId | null;
    disabled: boolean;
  }): void;
  open(): void;
  close(): void;
  isOpen(): boolean;
  setVisible(visible: boolean): void;
  destroy(): void;
}

export interface MountChaosLabPanelOptions {
  onRun(eventId: ChaosEventId): void;
  onClearReport(): void;
  onOpen?: () => void;
}

function injectStyles(): void {
  if (document.getElementById('sdq-chaos-lab-styles')) return;
  const style = document.createElement('style');
  style.id = 'sdq-chaos-lab-styles';
  style.textContent = `
    .sdq-chaos-lab-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 21;
      background: rgba(2, 8, 23, 0.45);
      backdrop-filter: blur(2px);
    }
    .sdq-chaos-lab-backdrop.is-open { display: block; }
    .sdq-chaos-lab-fab {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      position: fixed;
      right: 12px;
      bottom: calc(128px + env(safe-area-inset-bottom, 0px));
      z-index: 19;
      min-height: 44px;
      min-width: 44px;
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
    .sdq-chaos-lab-fab[hidden] { display: none !important; }
    .sdq-chaos-lab {
      position: absolute;
      right: 12px;
      top: 72px;
      z-index: 23;
      width: min(420px, calc(100vw - 24px));
      max-height: min(70vh, 640px);
      overflow: auto;
      background: var(--sdq-bg-elevated);
      border: 1px solid var(--sdq-border);
      border-radius: 12px;
      padding: 10px 12px;
      box-shadow: var(--sdq-shadow);
      font-family: var(--sdq-font-mono);
      font-size: 11px;
      color: var(--sdq-text);
    }
    .sdq-chaos-lab[hidden] { display: none !important; }
    .sdq-chaos-lab--collapsed { visibility: hidden; pointer-events: none; }
    .sdq-chaos-lab__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }
    .sdq-chaos-lab__title {
      margin: 0;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      font-size: 10px;
      color: var(--sdq-text-subtle);
    }
    .sdq-chaos-lab__collapse {
      border: 1px solid var(--sdq-border);
      background: var(--sdq-bg);
      color: var(--sdq-text);
      border-radius: 6px;
      min-width: 44px;
      min-height: 44px;
      cursor: pointer;
      touch-action: manipulation;
    }
    .sdq-chaos-lab__blurb {
      margin: 0 0 10px;
      color: var(--sdq-text-subtle);
      line-height: 1.35;
    }
    .sdq-chaos-lab__section-title {
      margin: 12px 0 6px;
      font: 700 10px var(--sdq-font-mono);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--sdq-text-subtle);
    }
    .sdq-chaos-lab__grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .sdq-chaos-lab__card {
      text-align: left;
      min-height: 72px;
      padding: 10px;
      border-radius: 10px;
      border: 1px solid var(--sdq-border);
      background: var(--sdq-bg);
      color: var(--sdq-text);
      cursor: pointer;
      touch-action: manipulation;
      font: inherit;
    }
    .sdq-chaos-lab__card[data-active="true"] {
      border-color: var(--sdq-accent, #c9a962);
      background: rgba(201, 169, 98, 0.12);
    }
    .sdq-chaos-lab__card:disabled { opacity: 0.45; cursor: not-allowed; }
    .sdq-chaos-lab__card strong { display: block; margin-bottom: 4px; }
    .sdq-chaos-lab__card span { color: var(--sdq-text-subtle); line-height: 1.3; }
    @media (max-width: 768px) {
      .sdq-chaos-lab {
        top: auto;
        bottom: calc(72px + env(safe-area-inset-bottom, 0px));
        width: calc(100vw - 24px);
        max-height: min(70vh, 640px);
      }
      .sdq-chaos-lab__grid { grid-template-columns: 1fr; }
    }
  `;
  document.head.append(style);
}

export function mountChaosLabPanel(
  parent: HTMLElement,
  options: MountChaosLabPanelOptions,
): ChaosLabPanel {
  injectStyles();
  let openState = false;
  let visible = true;
  let disabled = false;
  let activeEvent: ChaosEventId | null = null;

  const backdrop = document.createElement('div');
  backdrop.className = 'sdq-chaos-lab-backdrop';
  backdrop.setAttribute('data-testid', 'chaos-lab-backdrop');

  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'sdq-chaos-lab-fab';
  fab.setAttribute('data-testid', 'chaos-lab-fab');

  const root = document.createElement('section');
  root.className = 'sdq-chaos-lab sdq-chaos-lab--collapsed';
  root.setAttribute('data-testid', 'chaos-lab-panel');
  root.hidden = true;

  const header = document.createElement('div');
  header.className = 'sdq-chaos-lab__header';
  const title = document.createElement('h2');
  title.className = 'sdq-chaos-lab__title';
  const collapse = document.createElement('button');
  collapse.type = 'button';
  collapse.className = 'sdq-chaos-lab__collapse';
  collapse.setAttribute('data-testid', 'chaos-lab-collapse');
  collapse.textContent = '–';
  header.append(title, collapse);

  const blurb = document.createElement('p');
  blurb.className = 'sdq-chaos-lab__blurb';
  blurb.setAttribute('data-testid', 'chaos-lab-blurb');

  const reportHost = document.createElement('div');
  const catalogHost = document.createElement('div');

  root.append(header, blurb, reportHost, catalogHost);
  parent.append(backdrop, fab, root);

  const report = mountResilienceReport(reportHost, {
    onClear: () => options.onClearReport(),
  });

  const cardButtons: HTMLButtonElement[] = [];
  const renderCatalog = (): void => {
    const locale = getLocale();
    catalogHost.replaceChildren();
    cardButtons.length = 0;
    for (const group of ['infra', 'network'] as const) {
      const sectionTitle = document.createElement('h3');
      sectionTitle.className = 'sdq-chaos-lab__section-title';
      sectionTitle.textContent = group === 'infra' ? t('chaos.infra') : t('chaos.network');
      const grid = document.createElement('div');
      grid.className = 'sdq-chaos-lab__grid';
      grid.setAttribute('data-testid', `chaos-lab-${group}`);
      for (const event of listChaosEvents(group)) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sdq-chaos-lab__card';
        btn.dataset.eventId = event.id;
        btn.dataset.active = String(activeEvent === event.id);
        btn.disabled = disabled;
        btn.setAttribute('data-testid', `chaos-lab-event-${event.id}`);
        const strong = document.createElement('strong');
        strong.textContent = locale === 'pt-BR' ? event.labelPt : event.labelEn;
        const span = document.createElement('span');
        span.textContent = locale === 'pt-BR' ? event.descriptionPt : event.descriptionEn;
        btn.append(strong, span);
        btn.addEventListener('click', () => options.onRun(event.id));
        cardButtons.push(btn);
        grid.append(btn);
      }
      catalogHost.append(sectionTitle, grid);
    }
  };

  const applyChrome = (): void => {
    title.textContent = t('chaos.labTitle');
    fab.textContent = t('chaos.fab');
    collapse.setAttribute('aria-label', t('chaos.collapse'));
    blurb.textContent = t('chaos.blurb');
    fab.hidden = !visible;
    root.hidden = !visible || !openState;
    root.classList.toggle('sdq-chaos-lab--collapsed', !openState);
    backdrop.classList.toggle('is-open', openState && visible);
    renderCatalog();
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
    sync(state) {
      activeEvent = state.activeEvent;
      disabled = state.disabled;
      report.sync(state.report);
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
      report.destroy();
      backdrop.remove();
      fab.remove();
      root.remove();
    },
  };
}
