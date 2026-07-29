# Palette Drop Lifecycle Validation

**Date**: 2026-07-29
**Spec**: `.specs/features/palette-drop-lifecycle/spec.md`
**Diff range**: `23ae677..dd693de` (implementation `a8416f1`; explicit AC4 assertions `dd693de`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| Spec + fix + regression tests (atomic commit) | ✅ Done | Single Small-scope commit; no formal `tasks.md` |

---

## Spec-Anchored Acceptance Criteria

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| WHEN a user drops one palette component on the canvas THEN exactly one placement event SHALL be emitted | Exactly 1 `PALETTE_DROP_EVENT` | `client/src/ui/palette.test.ts:138` — `expect(handler).toHaveBeenCalledTimes(1)` | ✅ PASS |
| WHEN a design session is destroyed THEN its palette SHALL detach its native canvas drop listeners | After session teardown, prior native `drop` listeners must not fire placements | Wiring: `client/src/session/phase-navigation.ts:807` — `palette.destroy()` → `client/src/ui/palette.ts:463` — `detachDropTarget()`; behavioral proof `client/src/session/phase-navigation.test.ts:763` — `expect(placementHandler).toHaveBeenCalledTimes(1)` after five `nav.destroy()` cycles | ✅ PASS |
| WHEN five design sessions mount and are destroyed before a new session THEN one subsequent drop SHALL still emit exactly one placement event | Exactly 1 placement after 5 mount/destroy cycles | `client/src/ui/palette.test.ts:165` — `expect(handler).toHaveBeenCalledTimes(1)`; `client/src/session/phase-navigation.test.ts:763` — `expect(placementHandler).toHaveBeenCalledTimes(1)` | ✅ PASS |
| WHEN the palette is destroyed THEN its locale listener and DOM chrome SHALL also be removed | Locale listener removed; backdrop/fab/palette DOM removed | `client/src/ui/palette.test.ts:174-177` — `expect(handle.root.isConnected).toBe(false)`, equivalent assertions for `fab` and `backdrop`, and `expect(removeListener).toHaveBeenCalledWith(LOCALE_CHANGE_EVENT, expect.any(Function))` | ✅ PASS |

**Status**: ✅ All ACs covered

---

## Discrimination Sensor

Scratch mutations applied and restored on the working tree (node_modules-linked; worktree copy lacked deps).

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 (a) | `client/src/ui/palette.ts:463` | Omitted `detachDropTarget()` from `palette.destroy` | ✅ Killed — both targeted tests: expected 1 call, received 6 |
| 2 (b) | `client/src/session/phase-navigation.ts:807` | Removed `palette.destroy()` from session teardown | ✅ Killed — phase-navigation test: expected 1 call, received 6; palette unit test still passed (expected — it calls `handle.destroy()` directly) |

**Sensor depth**: lightweight (2 targeted behavior-level faults per user request)
**Result**: 2/2 killed — PASS ✅
**Tree restored**: yes (both cleanup calls present after sensor)

---

## Interactive UAT Results

Not performed (automated regression sufficient for this Small bug-fix).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ |
| No scope creep | ✅ |
| Matches patterns | ✅ |
| Spec-anchored outcome check (asserted values match spec) | ✅ |
| Per-layer Coverage Expectation met | ✅ |
| Every test maps to a spec requirement — no unclaimed tests | ✅ New tests map to AC1/AC2/AC3/AC4 |
| Documented guidelines followed: `AGENTS.md` testing principles; Vitest via `window`/DOM events (no WebGL) | ✅ |

---

## Edge Cases

- Spec lists no separate edge-case section beyond the five-visit accumulation scenario (covered by AC3).

---

## Gate Check

- **Gate command**: `npx nx run-many -t lint test --skip-nx-cache` (from spec Verification)
- **Author-provided full gate result after `dd693de`**: green — shared **175** / client **456** / server **153**
- **Verifier focused runs** (clean tree):
  - `vitest` filter: `dispatches one placement after repeated|processes one component drop after repeated|dispatches palette:drop with ComponentType`
  - Result: **3 passed**, 39 skipped, 0 failed
  - AC4 filter: `removes palette chrome and its locale listener when destroyed`
  - Result: **1 passed**, 8 skipped, 0 failed
- **Test count before feature**: N/A (author gate baseline not captured in this report)
- **Test count after feature**: client 456 (includes +2 lifecycle regressions in `a8416f1` and +1 explicit AC4 teardown test in `dd693de`)
- **Delta**: +3 focused lifecycle tests across the verified range
- **Skipped tests**: none in focused run beyond vitest `-t` filter
- **Failures**: none on clean tree; sensor mutants failed as expected

---

## Fix Plans

None.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| AC1 single placement | Implementing | ✅ Verified |
| AC2 detach on session destroy | Implementing | ✅ Verified |
| AC3 five-session accumulation | Implementing | ✅ Verified |
| AC4 locale + DOM teardown | Needs Fix | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 4/4 ACs matched with exact `file:line` evidence
**Sensor**: 2/2 mutations killed
**Gate**: author-provided full gate green (shared 175 / client 456 / server 153); verifier focused lifecycle checks 4/4 pass

**What works**: Detach-on-destroy + session `palette.destroy()` wiring; single-drop and five-cycle regressions discriminate correctly (mutants yield 6 placements); palette chrome and locale-listener teardown have explicit assertions.

**Issues found**: None.

**Next steps**: Merge-ready.
