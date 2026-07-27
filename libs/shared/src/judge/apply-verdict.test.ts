import { describe, expect, it } from 'vitest';
import type { FeedbackItem } from '../schema/judge';
import { applyVerdictRules, isBlocker } from './apply-verdict';

const blockerIssue: FeedbackItem = {
  title: 'Missing load balancer',
  explanation: 'Single app server is a SPOF.',
  howToImprove: 'Add a load balancer in front of app servers.',
  whyItMatters: 'High availability requires redundancy.',
  severity: 'blocker',
};

const majorIssue: FeedbackItem = {
  title: 'No cache layer',
  explanation: 'Reads hit the database directly.',
  howToImprove: 'Add Redis cache for hot URLs.',
  whyItMatters: 'Cache reduces read latency and DB load.',
  severity: 'major',
};

describe('isBlocker', () => {
  it('returns true when severity is blocker', () => {
    expect(isBlocker(blockerIssue)).toBe(true);
  });

  it('returns false when severity is major', () => {
    expect(isBlocker(majorIssue)).toBe(false);
  });

  it('returns false when severity is omitted', () => {
    const issue: FeedbackItem = {
      title: 'Minor gap',
      explanation: 'Could add monitoring.',
      howToImprove: 'Add metrics.',
      whyItMatters: 'Observability helps ops.',
    };
    expect(isBlocker(issue)).toBe(false);
  });
});

describe('applyVerdictRules (AD-016)', () => {
  it('returns PASS at score 80 with zero blockers', () => {
    expect(applyVerdictRules(80, [])).toBe('PASS');
  });

  it('returns PASS above score 80 with zero blockers', () => {
    expect(applyVerdictRules(95, [majorIssue])).toBe('PASS');
  });

  it('returns PARTIAL at score 79 with zero blockers', () => {
    expect(applyVerdictRules(79, [])).toBe('PARTIAL');
  });

  it('returns PARTIAL at score 70 with zero blockers', () => {
    expect(applyVerdictRules(70, [])).toBe('PARTIAL');
  });

  it('returns FAIL at score 69 with zero blockers', () => {
    expect(applyVerdictRules(69, [])).toBe('FAIL');
  });

  it('returns FAIL at score 80 when a blocker is present', () => {
    expect(applyVerdictRules(80, [blockerIssue])).toBe('FAIL');
  });

  it('returns FAIL at score 70 when a blocker is present', () => {
    expect(applyVerdictRules(70, [blockerIssue])).toBe('FAIL');
  });

  it('returns FAIL at score 100 when a blocker is present', () => {
    expect(applyVerdictRules(100, [blockerIssue])).toBe('FAIL');
  });
});
