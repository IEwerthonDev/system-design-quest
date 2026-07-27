import { describe, expect, it } from 'vitest';
import type { ComponentCategory, ComponentType, ComponentTypeMeta } from '../schema/component-types';
import {
  getComponentMeta,
  getComponentsByCategory,
  getComponentsForTier,
  TIER_1_TYPES,
  TIER_2_TYPES,
} from './component-catalog';

const PALETTE_CATEGORIES: ComponentCategory[] = [
  'client',
  'edge',
  'traffic',
  'compute',
  'data',
  'messaging',
  'observability',
  'security',
];

const REQUIRED_META_KEYS: (keyof ComponentTypeMeta)[] = [
  'type',
  'label',
  'category',
  'description',
  'whenToUse',
];

describe('component catalog — Tier 1', () => {
  it('getComponentsForTier(1) returns exactly 15 component types', () => {
    const tier1 = getComponentsForTier(1);
    expect(tier1).toHaveLength(15);
  });

  it('Tier 1 includes all AD-017 Tier 1 type IDs', () => {
    const types = getComponentsForTier(1).map((c) => c.type);
    expect(types).toEqual(expect.arrayContaining([...TIER_1_TYPES]));
    expect(new Set(types).size).toBe(15);
  });

  it('each entry has complete metadata shape', () => {
    for (const meta of getComponentsForTier(1)) {
      for (const key of REQUIRED_META_KEYS) {
        expect(meta[key], `${meta.type}.${key}`).toBeTruthy();
        expect(typeof meta[key], `${meta.type}.${key}`).toBe('string');
      }
    }
  });

  it('Tier 1 type IDs are unique', () => {
    const types = getComponentsForTier(1).map((c) => c.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it('each entry uses a valid palette category', () => {
    for (const meta of getComponentsForTier(1)) {
      expect(PALETTE_CATEGORIES, `${meta.type} category`).toContain(meta.category);
    }
  });

  it('getComponentsByCategory(1) groups all 15 types under palette categories', () => {
    const grouped = getComponentsByCategory(1);
    const groupedTypes = [...grouped.values()].flat().map((c) => c.type);

    expect(groupedTypes).toHaveLength(15);
    expect(new Set(groupedTypes).size).toBe(15);
    expect(groupedTypes).toEqual(expect.arrayContaining([...TIER_1_TYPES]));
  });

  it('getComponentMeta returns metadata for any Tier 1 type', () => {
    for (const type of TIER_1_TYPES) {
      const meta = getComponentMeta(type);
      expect(meta.type).toBe(type);
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.whenToUse.length).toBeGreaterThan(0);
    }
  });

  it('getComponentMeta rejects unknown types', () => {
    expect(() => getComponentMeta('unknown_type' as ComponentType)).toThrow(/unknown/i);
  });

  it('getComponentsForTier rejects unsupported tiers', () => {
    expect(() => getComponentsForTier(3)).toThrow(/tier/i);
  });
});

describe('component catalog — Tier 2', () => {
  it('getComponentsForTier(2) returns exactly 25 component types', () => {
    expect(getComponentsForTier(2)).toHaveLength(25);
  });

  it('Tier 2 includes all Tier 1 types plus AD-017 additions', () => {
    const types = getComponentsForTier(2).map((c) => c.type);
    expect(types).toEqual(expect.arrayContaining([...TIER_2_TYPES]));
    expect(new Set(types).size).toBe(25);
  });

  it('Tier 2 adds microservice, nosql_db, kafka, pub_sub, search_engine, waf, reverse_proxy, logging, notification, serverless', () => {
    const types = getComponentsForTier(2).map((c) => c.type);
    expect(types).toEqual(
      expect.arrayContaining([
        'microservice',
        'nosql_db',
        'kafka',
        'pub_sub',
        'search_engine',
        'waf',
        'reverse_proxy',
        'logging',
        'notification',
        'serverless',
      ]),
    );
  });

  it('getComponentMeta returns metadata for Tier 2-only types', () => {
    const meta = getComponentMeta('kafka');
    expect(meta.label).toBe('Kafka');
    expect(meta.whenToUse.length).toBeGreaterThan(0);
  });

  it('getComponentsByCategory(2) groups all 25 types', () => {
    const grouped = getComponentsByCategory(2);
    const groupedTypes = [...grouped.values()].flat().map((c) => c.type);
    expect(groupedTypes).toHaveLength(25);
  });
});
