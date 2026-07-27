import type { ComponentCategory, ComponentType, ComponentTypeMeta } from '../schema/component-types';
import { TIER_1_COMPONENTS, TIER_1_TYPES } from './mvp-tier-1';
import { TIER_2_ADDITIONS, TIER_2_ADDITION_TYPES } from './mvp-tier-2';

export { TIER_1_TYPES };
export { TIER_2_ADDITION_TYPES };
export const TIER_2_TYPES = [...TIER_1_TYPES, ...TIER_2_ADDITION_TYPES] as const;

export type CatalogTier = 1 | 2 | 3;

const TIER_CATALOG: Partial<Record<CatalogTier, readonly ComponentTypeMeta[]>> = {
  1: TIER_1_COMPONENTS,
  2: [...TIER_1_COMPONENTS, ...TIER_2_ADDITIONS],
};

const metaByType = new Map<ComponentType, ComponentTypeMeta>(
  (TIER_CATALOG[2] ?? []).map((meta) => [meta.type, meta]),
);

export function getComponentsForTier(tier: CatalogTier): readonly ComponentTypeMeta[] {
  const catalog = TIER_CATALOG[tier];
  if (!catalog) {
    throw new Error(`Unsupported catalog tier: ${tier}`);
  }
  return catalog;
}

export function getComponentMeta(type: ComponentType): ComponentTypeMeta {
  const meta = metaByType.get(type);
  if (!meta) {
    throw new Error(`Unknown component type: ${type}`);
  }
  return meta;
}

export function getComponentsByCategory(
  tier: CatalogTier,
): ReadonlyMap<ComponentCategory, readonly ComponentTypeMeta[]> {
  const grouped = new Map<ComponentCategory, ComponentTypeMeta[]>();

  for (const meta of getComponentsForTier(tier)) {
    const list = grouped.get(meta.category) ?? [];
    list.push(meta);
    grouped.set(meta.category, list);
  }

  return grouped;
}
