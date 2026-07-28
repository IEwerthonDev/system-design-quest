import { describe, expect, it } from 'vitest';
import { CORE_REALISM_IDS, isCoreRealismProblem } from './structural-depth';
import { listProblems } from './index';

describe('CORE_REALISM_IDS', () => {
  it('lists exactly 13 Core Realism problem ids', () => {
    expect(CORE_REALISM_IDS).toHaveLength(13);
  });

  it('every Core id exists in the catalog', () => {
    const catalogIds = new Set(listProblems().map((p) => p.id));
    for (const id of CORE_REALISM_IDS) {
      expect(catalogIds.has(id)).toBe(true);
    }
  });

  it('isCoreRealismProblem returns true only for Core ids', () => {
    expect(isCoreRealismProblem('url-shortener')).toBe(true);
    expect(isCoreRealismProblem('zoom-conference')).toBe(true);
    expect(isCoreRealismProblem('stripe-payments')).toBe(true);
    expect(isCoreRealismProblem('netflix-streaming')).toBe(false);
    expect(isCoreRealismProblem('does-not-exist')).toBe(false);
  });
});
