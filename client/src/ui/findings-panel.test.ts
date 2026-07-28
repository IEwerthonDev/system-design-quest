import { describe, expect, it, vi } from 'vitest';
import { mountFindingsPanel } from './findings-panel';
import type { ArchitectureFinding } from '@sdq/shared';

describe('findings-panel', () => {
  it('renders findings and hides when empty', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const panel = mountFindingsPanel(host);
    expect(panel.root.hidden).toBe(true);

    const findings: ArchitectureFinding[] = [
      {
        code: 'SPOF',
        severity: 'major',
        nodeIds: ['db'],
        reasonPt: 'SPOF pt',
        reasonEn: 'SPOF en',
      },
    ];
    panel.sync(findings);
    expect(panel.root.hidden).toBe(false);
    expect(host.querySelector('[data-testid="finding-SPOF"]')).toBeTruthy();

    panel.sync([]);
    expect(panel.root.hidden).toBe(true);
    panel.destroy();
    host.remove();
  });
});
