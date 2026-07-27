import { describe, expect, it } from 'vitest';
import type { ComponentType } from '@sdq/shared';
import {
  CONNECTION_INTENTS,
  defaultLabelForDestination,
  rememberDbIntentRole,
  resolveMenuSelection,
  type EdgeShortLabel,
} from './connection-intents';

describe('CONNECTION_INTENTS catalog (CI-02 / CI-03)', () => {
  it('lists four options with shortLabels REQ | DB | CACHE', () => {
    expect(CONNECTION_INTENTS).toHaveLength(4);
    const ids = CONNECTION_INTENTS.map((o) => o.id);
    expect(ids).toEqual(['req', 'db-default', 'db-origin-fallback', 'cache']);
    const shorts = new Set(CONNECTION_INTENTS.map((o) => o.shortLabel));
    expect(shorts).toEqual(new Set<EdgeShortLabel>(['REQ', 'DB', 'CACHE']));
  });

  it('maps dual DB rows to shortLabel DB with distinct roles', () => {
    const def = CONNECTION_INTENTS.find((o) => o.id === 'db-default');
    const origin = CONNECTION_INTENTS.find((o) => o.id === 'db-origin-fallback');
    expect(def?.shortLabel).toBe('DB');
    expect(origin?.shortLabel).toBe('DB');
    expect(def?.role).toBe('DEFAULT');
    expect(origin?.role).toBe('ORIGIN FALLBACK');
    expect(def?.description).toBeTruthy();
    expect(origin?.description).toBeTruthy();
    expect(def?.description).not.toBe(origin?.description);
  });

  it('includes CACHE with lookup/hit-path description (CI-03)', () => {
    const cache = CONNECTION_INTENTS.find((o) => o.id === 'cache');
    expect(cache?.shortLabel).toBe('CACHE');
    expect(cache?.role).toBe('CACHE');
    expect(cache?.description.toLowerCase()).toMatch(/lookup|hit/);
  });
});

describe('defaultLabelForDestination (CI-03)', () => {
  const cases: Array<{ type: ComponentType; label: EdgeShortLabel }> = [
    { type: 'cache_redis', label: 'CACHE' },
    { type: 'cdn', label: 'CACHE' },
    { type: 'sql_db', label: 'DB' },
    { type: 'nosql_db', label: 'DB' },
    { type: 'object_storage', label: 'DB' },
    { type: 'search_engine', label: 'DB' },
    { type: 'app_server', label: 'REQ' },
    { type: 'load_balancer', label: 'REQ' },
    { type: 'client_web', label: 'REQ' },
    { type: 'api_gateway', label: 'REQ' },
  ];

  it.each(cases)('destination $type → $label', ({ type, label }) => {
    expect(defaultLabelForDestination(type)).toBe(label);
  });
});

describe('resolveMenuSelection (CI-02 CUSTOM / active row)', () => {
  it('returns null for empty or undefined label', () => {
    expect(resolveMenuSelection(undefined)).toBeNull();
    expect(resolveMenuSelection('')).toBeNull();
  });

  it('returns req / cache for catalog short codes', () => {
    expect(resolveMenuSelection('REQ')).toBe('req');
    expect(resolveMenuSelection('CACHE')).toBe('cache');
  });

  it('returns db-default for DB when no session memory', () => {
    expect(resolveMenuSelection('DB')).toBe('db-default');
  });

  it('returns remembered DB role from session Map when edgeId provided', () => {
    rememberDbIntentRole('e1', 'db-origin-fallback');
    expect(resolveMenuSelection('DB', 'e1')).toBe('db-origin-fallback');
    expect(resolveMenuSelection('DB', 'e2')).toBe('db-default');
  });

  it('returns custom for legacy free-text labels', () => {
    expect(resolveMenuSelection('HTTPS')).toBe('custom');
    expect(resolveMenuSelection('WRITE')).toBe('custom');
  });
});
