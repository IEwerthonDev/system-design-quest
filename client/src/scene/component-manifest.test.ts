import { describe, expect, it } from 'vitest';
import { TIER_2_TYPES } from '@sdq/shared';
import { getComponentManifest, getGlbPath } from './component-manifest';

describe('component-manifest', () => {
  it('returns exactly one entry per tier-2 component type (25)', () => {
    const manifest = getComponentManifest();
    expect(manifest).toHaveLength(25);
    expect(manifest).toHaveLength(TIER_2_TYPES.length);

    const types = manifest.map((entry) => entry.type);
    expect(new Set(types).size).toBe(25);
    for (const type of TIER_2_TYPES) {
      expect(types).toContain(type);
    }
  });

  it('maps every type to a GLB path under /assets/components/', () => {
    const manifest = getComponentManifest();
    for (const entry of manifest) {
      expect(entry.glbPath).toMatch(/^\/assets\/components\/[a-z]+\.glb$/);
      expect(getGlbPath(entry.type)).toBe(entry.glbPath);
    }
  });
});
