import type { FeedbackItem, Verdict } from '../schema/judge';

/** AD-016: severity `blocker` on a critical issue forces FAIL regardless of score. */
export function isBlocker(issue: FeedbackItem): boolean {
  return issue.severity === 'blocker';
}

/**
 * Apply AD-016 verdict rules to a score and critical issues list.
 * PASS: score ≥ 80 and zero blockers.
 * PARTIAL: score ≥ 70 and zero blockers (but below PASS threshold).
 * FAIL: score < 70 or any blocker present.
 */
export function applyVerdictRules(score: number, criticalIssues: FeedbackItem[]): Verdict {
  if (criticalIssues.some(isBlocker)) {
    return 'FAIL';
  }

  if (score >= 80) {
    return 'PASS';
  }

  if (score >= 70) {
    return 'PARTIAL';
  }

  return 'FAIL';
}
