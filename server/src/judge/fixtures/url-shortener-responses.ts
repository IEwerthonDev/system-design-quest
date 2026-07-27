import type { GoldenGraphTier } from '@sdq/shared';
import type { JudgePartialResult } from '@sdq/shared';

export type JudgeRole = 'rigorous' | 'pragmatic';

const BASE_STRENGTHS: Record<GoldenGraphTier, JudgePartialResult['strengths']> = {
  good: [
    {
      title: 'Layered architecture',
      explanation: 'Load balancer, app tier, cache, and database are clearly separated.',
      howToImprove: 'Document cache invalidation on URL writes.',
      whyItMatters: 'Layering supports scale and fault isolation for URL Shortener reads.',
    },
  ],
  medium: [
    {
      title: 'Basic three-tier flow',
      explanation: 'Client reaches an app server before the database.',
      howToImprove: 'Add a cache for hot redirect lookups.',
      whyItMatters: 'A cache reduces read latency at high RPS.',
    },
  ],
  bad: [],
};

const BASE_CRITICAL: Record<GoldenGraphTier, JudgePartialResult['criticalIssues']> = {
  good: [],
  medium: [
    {
      title: 'No cache layer',
      explanation: 'Redirect reads will hit the database on every request.',
      howToImprove: 'Insert Redis between app server and database for hot URLs.',
      whyItMatters: 'URL Shortener read RPS dominates traffic; cache is expected.',
      severity: 'major',
    },
    {
      title: 'No load balancer',
      explanation: 'A single app server becomes a single point of failure.',
      howToImprove: 'Place a load balancer in front of multiple app instances.',
      whyItMatters: 'Availability suffers without horizontal redundancy.',
      severity: 'major',
    },
  ],
  bad: [
    {
      title: 'Client talks directly to database',
      explanation: 'There is no application layer to enforce business logic or auth.',
      howToImprove: 'Add an app server between client and database.',
      whyItMatters: 'Direct DB access exposes data and skips redirect logic.',
      severity: 'blocker',
      relatedComponents: ['golden-bad-client', 'golden-bad-db'],
    },
  ],
};

const BASE_IMPROVEMENTS: Record<GoldenGraphTier, JudgePartialResult['improvements']> = {
  good: [
    {
      title: 'Plan cache TTL strategy',
      explanation: 'Popular URLs need a defined expiration and invalidation path.',
      howToImprove: 'Set TTL aligned with analytics retention and bust cache on update.',
      whyItMatters: 'Stale redirects confuse users and inflate storage.',
    },
  ],
  medium: [
    {
      title: 'Add Redis cache',
      explanation: 'Reads dominate URL Shortener traffic.',
      howToImprove: 'Route GET lookups through cache before SQL.',
      whyItMatters: 'Cache absorbs read spikes and protects the database.',
    },
  ],
  bad: [
    {
      title: 'Introduce application tier',
      explanation: 'Business rules and hashing belong in an app service.',
      howToImprove: 'Add app servers to generate short codes and validate redirects.',
      whyItMatters: 'Without compute tier the design cannot scale or stay secure.',
    },
  ],
};

const ROLE_SCORE_ADJUST: Record<JudgeRole, number> = {
  rigorous: -2,
  pragmatic: 2,
};

const BASE_SCORE: Record<GoldenGraphTier, number> = {
  good: 84,
  medium: 71,
  bad: 32,
};

const ROLE_RATIONALE: Record<JudgeRole, Record<GoldenGraphTier, string>> = {
  rigorous: {
    good: 'Meets scalability and redundancy expectations for the tutorial problem.',
    medium: 'Functional path exists but misses cache and load balancing for production RPS.',
    bad: 'Violates basic layering; client must not reach the database directly.',
  },
  pragmatic: {
    good: 'Solid MVP architecture with room to tune cache policy later.',
    medium: 'Acceptable for a prototype, insufficient for peak read traffic.',
    bad: 'Not viable even as a spike; missing mandatory application layer.',
  },
};

/** Deterministic partial judge output for URL Shortener golden graph tiers. */
export function getUrlShortenerPartialResult(
  role: JudgeRole,
  tier: GoldenGraphTier,
): JudgePartialResult {
  const score = BASE_SCORE[tier] + ROLE_SCORE_ADJUST[role];

  return {
    score,
    strengths: BASE_STRENGTHS[tier],
    criticalIssues: BASE_CRITICAL[tier],
    improvements: BASE_IMPROVEMENTS[tier],
    requirementCoverage: [],
    rationale: ROLE_RATIONALE[role][tier],
  };
}
