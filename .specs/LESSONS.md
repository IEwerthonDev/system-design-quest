# LESSONS — auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation — do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 — When an AC requires highlighting multiple UI parts (node and handle), assert each part’s observable state—not only one of them
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `client/scene` · harmful: 0
- features: canvas-graph-dnd
- evidence: CGD-04 / canvas-interaction.test.ts:485-488 (validation.md Fix 1) (client/scene)
- last seen: 2026-07-27T17:05:16Z

### L-002 — Assert animated edge packets sample the Bezier path (not the chord); pair path C/Q tests with packet position checks
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `client/blueprint` · harmful: 0
- features: playground-parity
- evidence: PP-04 AC3 / svg-edges.ts:133-134 (client/blueprint)
- last seen: 2026-07-27T21:21:31Z

### L-003 — Reopen flows must assert the full re-submit confirm transition on the same session id, not only hydrate and submit button presence
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `client/sessions` · harmful: 0
- features: playground-parity
- evidence: PP-08 AC2 / sessions-dashboard.test.ts:263 (client/sessions)
- last seen: 2026-07-27T21:21:31Z

### L-004 — Vague SHALL continue working criteria need at least one concrete post-change interaction assertion, not only element absence
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `client/ui` · harmful: 0
- features: playground-parity
- evidence: PP-03 AC2 (client/ui)
- last seen: 2026-07-27T21:21:31Z

### L-005 — When specs require valid curved paths for near-coincident endpoints, assert d has C/Q and parsed coordinates are non-NaN
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `client/blueprint` · harmful: 0
- features: playground-parity
- evidence: edge from≈to / svg-edges (client/blueprint)
- last seen: 2026-07-27T21:21:31Z

### L-006 — When a feature inherits speedrun ranking, assert elapsedMs-asc (score tie-break) and keep the spec AC wording aligned with that order
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `leaderboard` · harmful: 0
- features: hobby-platform
- evidence: spec.md LB AC2 / design.md Leaderboard ordering (leaderboard)
- last seen: 2026-07-28T16:18:13Z

### L-007 — Assert client soft-fail UI for remote store outages (error empty-state and non-blocking writes), not only server 503
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `client/leaderboard` · harmful: 0
- features: hobby-platform
- evidence: LB AC3 / leaderboard-panel.ts:178 (client/leaderboard)
- last seen: 2026-07-28T16:18:13Z

### L-008 — When UI shows both i18n labels and derived percentages, assert locale toggle updates copy without changing the percent value
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `client/i18n` · harmful: 0
- features: hobby-platform
- evidence: Progress AC3 / problem-library (client/i18n)
- last seen: 2026-07-28T16:18:13Z

### L-009 — When a shortcut has multiple bindings (Ctrl+Y or Ctrl+Shift+Z), assert each binding path in tests
- signal: `spec_precision_gap` · recurrence: 1 feature(s) · scope: `client/canvas` · harmful: 0
- features: hobby-platform
- evidence: UX-02 AC3 Ctrl+Shift+Z (client/canvas)
- last seen: 2026-07-28T16:18:13Z

## Quarantined (failed when applied — ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
