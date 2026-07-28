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

  it('shows only access + topology for nosql_db in basic view', () => {
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
    const advanced = popover.root.querySelector('[data-testid="config-advanced"]');
    expect(advanced?.hasAttribute('hidden')).toBe(true);
    expect(advanced?.querySelector('[data-testid="config-shard-count"]')).toBeTruthy();
    expect(popover.root.querySelector('[data-testid="config-notes"]')).toBeTruthy();
    popover.destroy();
  });
});

describe('config popover basic vs advanced', () => {
  let host: HTMLDivElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
    setLocale('en');
  });

  afterEach(() => {
    host.remove();
  });

  it('opens cache and shows hit rate in basic view', () => {
    const popover = mountConfigPopover(host, {
      onClose: () => undefined,
      onNotesChange: () => undefined,
      onConfigChange: () => undefined,
    });

    const cacheConfig = defaultConfigForType('cache_redis');
    const node: ComponentNode = {
      id: 'cache-1',
      type: 'cache_redis',
      label: 'Cache',
      replicas: 1,
      position: { x: 0, y: 0 },
      config: cacheConfig,
    };

    popover.open(node, new DOMRect(20, 20, 40, 40));
    expect(popover.root.querySelector('[data-testid="config-hit-rate"]')).toBeTruthy();
    const advanced = popover.root.querySelector('[data-testid="config-advanced"]');
    expect(advanced?.hasAttribute('hidden')).toBe(true);
    expect(advanced?.querySelector('[data-testid="config-cache-eviction"]')).toBeTruthy();
    popover.destroy();
  });

  it('toggle advanced shows cache eviction field', () => {
    const popover = mountConfigPopover(host, {
      onClose: () => undefined,
      onNotesChange: () => undefined,
      onConfigChange: () => undefined,
    });

    const cacheConfig = defaultConfigForType('cache_redis');
    const node: ComponentNode = {
      id: 'cache-1',
      type: 'cache_redis',
      label: 'Cache',
      replicas: 1,
      position: { x: 0, y: 0 },
      config: cacheConfig,
    };

    popover.open(node, new DOMRect(20, 20, 40, 40));
    const toggle = popover.root.querySelector(
      '[data-testid="config-advanced-toggle"]',
    ) as HTMLButtonElement;
    expect(toggle).toBeTruthy();

    toggle.click();
    const advanced = popover.root.querySelector('[data-testid="config-advanced"]');
    expect(advanced?.hasAttribute('hidden')).toBe(false);
    expect(popover.root.querySelector('[data-testid="config-cache-eviction"]')).toBeTruthy();
    popover.destroy();
  });

  it('rate_limiter shows limitPerSec in basic view', () => {
    const popover = mountConfigPopover(host, {
      onClose: () => undefined,
      onNotesChange: () => undefined,
      onConfigChange: () => undefined,
    });

    const rlConfig = defaultConfigForType('rate_limiter');
    const node: ComponentNode = {
      id: 'rl-1',
      type: 'rate_limiter',
      label: 'Rate Limiter',
      replicas: 1,
      position: { x: 0, y: 0 },
      config: rlConfig,
    };

    popover.open(node, new DOMRect(20, 20, 40, 40));
    const limit = popover.root.querySelector(
      '[data-testid="config-rate-limit"]',
    ) as HTMLInputElement;
    expect(limit).toBeTruthy();
    expect(limit.value).toBe('100');
    popover.destroy();
  });

  it('patching cache hitRate preserves eviction and maxMemoryGb', () => {
    const onConfigChange = vi.fn();
    const popover = mountConfigPopover(host, {
      onClose: () => undefined,
      onNotesChange: () => undefined,
      onConfigChange,
    });

    const node: ComponentNode = {
      id: 'cache-1',
      type: 'cache_redis',
      label: 'Cache',
      replicas: 1,
      position: { x: 0, y: 0 },
      config: {
        kind: 'cache',
        hitRate: 90,
        eviction: 'lfu',
        maxMemoryGb: 16,
      },
    };

    popover.open(node, new DOMRect(20, 20, 40, 40));
    const slider = popover.root.querySelector(
      '[data-testid="config-hit-rate"]',
    ) as HTMLInputElement;
    slider.value = '75';
    slider.dispatchEvent(new Event('input', { bubbles: true }));

    expect(onConfigChange).toHaveBeenCalledWith('cache-1', {
      kind: 'cache',
      hitRate: 75,
      eviction: 'lfu',
      maxMemoryGb: 16,
    });
    popover.destroy();
  });
});
