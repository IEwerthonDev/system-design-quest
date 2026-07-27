import { getComponentMeta, TIER_2_TYPES, type ComponentType } from '@sdq/shared';

export interface ComponentAssetEntry {
  type: ComponentType;
  /** Public URL path to GLB asset, always set for tier-2 types. */
  glbPath: string;
}

const CATEGORY_GLB: Record<string, string> = {
  client: '/assets/components/client.glb',
  edge: '/assets/components/edge.glb',
  traffic: '/assets/components/traffic.glb',
  compute: '/assets/components/compute.glb',
  data: '/assets/components/data.glb',
  messaging: '/assets/components/messaging.glb',
  observability: '/assets/components/observability.glb',
  security: '/assets/components/security.glb',
};

function glbPathForType(type: ComponentType): string {
  const category = getComponentMeta(type).category;
  const path = CATEGORY_GLB[category];
  if (!path) {
    throw new Error(`No GLB mapping for category: ${category}`);
  }
  return path;
}

let cachedManifest: readonly ComponentAssetEntry[] | null = null;

export function getComponentManifest(): readonly ComponentAssetEntry[] {
  if (cachedManifest) {
    return cachedManifest;
  }

  cachedManifest = TIER_2_TYPES.map((type) => ({
    type,
    glbPath: glbPathForType(type),
  }));

  return cachedManifest;
}

export function getGlbPath(type: ComponentType): string {
  const entry = getComponentManifest().find((item) => item.type === type);
  if (!entry) {
    throw new Error(`Unknown component type in manifest: ${type}`);
  }
  return entry.glbPath;
}
