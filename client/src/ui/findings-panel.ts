import type { ArchitectureFinding } from '@sdq/shared';
import { getLocale } from '../i18n/locale';
import { t } from '../i18n/t';

export interface FindingsPanel {
  root: HTMLElement;
  sync(findings: ArchitectureFinding[]): void;
  destroy(): void;
}

function injectStyles(): void {
  if (document.getElementById('sdq-findings-styles')) return;
  const style = document.createElement('style');
  style.id = 'sdq-findings-styles';
  style.textContent = `
    .sdq-findings {
      position: absolute;
      right: 12px;
      top: 72px;
      z-index: 22;
      width: min(320px, calc(100vw - 24px));
      max-height: min(40vh, 360px);
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
    .sdq-findings[hidden] { display: none !important; }
    .sdq-findings__title {
      font-weight: 700;
      margin: 0 0 8px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      font-size: 10px;
      color: var(--sdq-text-subtle);
    }
    .sdq-findings__item {
      margin: 0 0 8px;
      padding: 6px 8px;
      border-radius: 8px;
      border: 1px solid var(--sdq-border);
      line-height: 1.35;
    }
    .sdq-findings__item[data-severity="blocker"] {
      border-color: rgba(239, 68, 68, 0.5);
      background: rgba(239, 68, 68, 0.08);
    }
    .sdq-findings__item[data-severity="major"] {
      border-color: rgba(234, 179, 8, 0.45);
      background: rgba(234, 179, 8, 0.08);
    }
    .sdq-findings__code {
      font-weight: 700;
      color: var(--sdq-accent);
      margin-right: 6px;
    }
  `;
  document.head.append(style);
}

export function mountFindingsPanel(container: HTMLElement): FindingsPanel {
  injectStyles();
  const root = document.createElement('aside');
  root.className = 'sdq-findings';
  root.setAttribute('data-testid', 'findings-panel');
  root.hidden = true;

  const title = document.createElement('h2');
  title.className = 'sdq-findings__title';
  title.textContent = t('findings.title');

  const list = document.createElement('div');
  list.setAttribute('data-testid', 'findings-list');

  root.append(title, list);
  container.append(root);

  return {
    root,
    sync(findings) {
      title.textContent = t('findings.title');
      const locale = getLocale();
      list.replaceChildren();
      if (findings.length === 0) {
        root.hidden = true;
        return;
      }
      root.hidden = false;
      for (const f of findings) {
        const item = document.createElement('p');
        item.className = 'sdq-findings__item';
        item.dataset.severity = f.severity;
        item.setAttribute('data-testid', `finding-${f.code}`);
        const code = document.createElement('span');
        code.className = 'sdq-findings__code';
        code.textContent = f.code;
        item.append(code, document.createTextNode(locale === 'en' ? f.reasonEn : f.reasonPt));
        list.append(item);
      }
    },
    destroy() {
      root.remove();
    },
  };
}
