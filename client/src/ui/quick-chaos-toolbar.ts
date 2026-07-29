import type { ChaosEventId } from '@sdq/shared';
import { getChaosEvent, QUICK_CHAOS_IDS } from '@sdq/shared';
import { getLocale, LOCALE_CHANGE_EVENT } from '../i18n/locale';
import { t } from '../i18n/t';

export interface QuickChaosToolbar {
  root: HTMLElement;
  sync(state: { activeEvent: ChaosEventId | null; disabled: boolean }): void;
  destroy(): void;
}

export interface MountQuickChaosToolbarOptions {
  onToggle(eventId: ChaosEventId): void;
  onClear(): void;
}

function injectStyles(): void {
  if (document.getElementById('sdq-quick-chaos-styles')) return;
  const style = document.createElement('style');
  style.id = 'sdq-quick-chaos-styles';
  style.textContent = `
    .sdq-quick-chaos {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 8px 10px;
      border-radius: 12px;
      border: 1px solid var(--sdq-border);
      background: var(--sdq-bg-elevated);
      box-shadow: var(--sdq-shadow);
      max-width: min(100%, 720px);
    }
    .sdq-quick-chaos__title {
      margin: 0;
      font: 700 10px var(--sdq-font-mono);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--sdq-text-subtle);
    }
    .sdq-quick-chaos__chips {
      display: flex;
      flex-wrap: nowrap;
      gap: 6px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      padding-bottom: 2px;
    }
    .sdq-quick-chaos__chip {
      flex: 0 0 auto;
      min-height: 44px;
      min-width: 44px;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--sdq-border);
      background: var(--sdq-bg);
      color: var(--sdq-text);
      font: 600 11px var(--sdq-font-sans, sans-serif);
      cursor: pointer;
      touch-action: manipulation;
      white-space: nowrap;
    }
    .sdq-quick-chaos__chip[data-active="true"] {
      border-color: var(--sdq-accent, #c9a962);
      background: rgba(201, 169, 98, 0.15);
      color: var(--sdq-accent, #c9a962);
    }
    .sdq-quick-chaos__chip:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .sdq-quick-chaos__clear {
      align-self: flex-start;
      min-height: 44px;
      min-width: 44px;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--sdq-border);
      background: transparent;
      color: var(--sdq-text-subtle);
      font: 600 11px var(--sdq-font-mono);
      cursor: pointer;
      touch-action: manipulation;
    }
  `;
  document.head.append(style);
}

export function mountQuickChaosToolbar(
  parent: HTMLElement,
  options: MountQuickChaosToolbarOptions,
): QuickChaosToolbar {
  injectStyles();
  const root = document.createElement('div');
  root.className = 'sdq-quick-chaos';
  root.setAttribute('data-testid', 'quick-chaos-toolbar');

  const title = document.createElement('h2');
  title.className = 'sdq-quick-chaos__title';
  title.setAttribute('data-testid', 'quick-chaos-title');

  const chips = document.createElement('div');
  chips.className = 'sdq-quick-chaos__chips';
  chips.setAttribute('data-testid', 'quick-chaos-chips');

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'sdq-quick-chaos__clear';
  clearBtn.setAttribute('data-testid', 'quick-chaos-clear');

  const chipButtons = new Map<ChaosEventId, HTMLButtonElement>();
  for (const id of QUICK_CHAOS_IDS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sdq-quick-chaos__chip';
    btn.dataset.eventId = id;
    btn.setAttribute('data-testid', `quick-chaos-${id}`);
    btn.addEventListener('click', () => options.onToggle(id));
    chipButtons.set(id, btn);
    chips.append(btn);
  }

  clearBtn.addEventListener('click', () => options.onClear());
  root.append(title, chips, clearBtn);
  parent.append(root);

  let active: ChaosEventId | null = null;
  let disabled = false;

  const refreshLabels = (): void => {
    const locale = getLocale();
    title.textContent = t('chaos.quickTitle');
    clearBtn.textContent = t('chaos.clear');
    for (const [id, btn] of chipButtons) {
      const def = getChaosEvent(id);
      btn.textContent = locale === 'pt-BR' ? (def?.labelPt ?? id) : (def?.labelEn ?? id);
      btn.title = locale === 'pt-BR' ? (def?.descriptionPt ?? '') : (def?.descriptionEn ?? '');
      btn.dataset.active = String(active === id);
      btn.disabled = disabled;
    }
    clearBtn.disabled = disabled || active == null;
  };

  const onLocale = (): void => refreshLabels();
  window.addEventListener(LOCALE_CHANGE_EVENT, onLocale);
  refreshLabels();

  return {
    root,
    sync(state) {
      active = state.activeEvent;
      disabled = state.disabled;
      refreshLabels();
    },
    destroy() {
      window.removeEventListener(LOCALE_CHANGE_EVENT, onLocale);
      root.remove();
    },
  };
}
