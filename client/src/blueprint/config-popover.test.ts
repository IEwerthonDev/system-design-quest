import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { defaultConfigForType, type ComponentNode } from '@sdq/shared';
import { setLocale } from '../i18n/locale';
import { mountConfigPopover } from './config-popover';

describe('config popover access roles', () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
    setLocale('en');
  });

  afterEach(() => {
    host.remove();
  });

  it('opens sql_db and reports accessPattern read via onConfigChange', () => {
    const onConfigChange = vi.fn();
    const popover = mountConfigPopover(host, {
      onClose: () => undefined,
      onNotesChange: () => undefined,
      onConfigChange,
    });

    const sqlConfig = defaultConfigForType('sql_db');
    expect(sqlConfig?.kind).toBe('sql_db');

    const node: ComponentNode = {
      id: 'db-1',
      type: 'sql_db',
      label: 'SQL Database',
      replicas: 1,
      position: { x: 0, y: 0 },
      config: sqlConfig,
    };

    popover.open(node, new DOMRect(20, 20, 40, 40));
    expect(popover.root.hidden).toBe(false);

    const access = popover.root.querySelector(
      '[data-testid="config-access-pattern"]',
    ) as HTMLSelectElement;
    const topology = popover.root.querySelector(
      '[data-testid="config-topology-role"]',
    ) as HTMLSelectElement;
    expect(access).toBeTruthy();
    expect(topology).toBeTruthy();
    expect(access.value).toBe('read_write');
    expect(topology.value).toBe('primary');

    access.value = 'read';
    access.dispatchEvent(new Event('change', { bubbles: true }));

    expect(onConfigChange).toHaveBeenCalledWith(
      'db-1',
      expect.objectContaining({
        kind: 'sql_db',
        accessPattern: 'read',
        topologyRole: 'primary',
      }),
    );

    popover.destroy();
  });

  it('shows only access + topology for nosql_db', () => {
    const popover = mountConfigPopover(host, {
      onClose: () => undefined,
      onNotesChange: () => undefined,
      onConfigChange: () => undefined,
    });

    const nosqlConfig = defaultConfigForType('nosql_db');
    const node: ComponentNode = {
      id: 'nosql-1',
      type: 'nosql_db',
      label: 'NoSQL Database',
      replicas: 1,
      position: { x: 0, y: 0 },
      config: nosqlConfig,
    };

    popover.open(node, new DOMRect(20, 20, 40, 40));
    expect(popover.root.querySelector('[data-testid="config-access-pattern"]')).toBeTruthy();
    expect(popover.root.querySelector('[data-testid="config-topology-role"]')).toBeTruthy();
    expect(popover.root.querySelector('[data-testid="config-shard-count"]')).toBeNull();
    expect(popover.root.querySelector('[data-testid="config-notes"]')).toBeTruthy();
    popover.destroy();
  });
});
