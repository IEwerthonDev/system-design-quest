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

## Quarantined (failed when applied — ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
