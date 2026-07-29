# Palette Drop Lifecycle Validation

**Date**: 2026-07-29
**Spec**: `.specs/features/palette-drop-lifecycle/spec.md`
**Diff range**: `23ae677..a8416f1` (`a8416f1` — fix(palette): detach canvas drop listeners on session teardown)
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
| WHEN a user drops one palette component on the canvas THEN exactly one placement event SHALL be emitted | Exactly 1 `PALETTE_DROP_EVENT` | `client/src/ui/palette.test.ts:137` — `expect(handler).toHaveBeenCalledTimes(1)` | ✅ PASS |
| WHEN a design session is destroyed THEN its palette SHALL detach its native canvas drop listeners | After session teardown, prior native `drop` listeners must not fire placements | Wiring: `client/src/session/phase-navigation.ts:807` — `palette.destroy()` → `client/src/ui/palette.ts:463` — `detachDropTarget()`; behavioral proof `client/src/session/phase-navigation.test.ts:763` — `expect(placementHandler).toHaveBeenCalledTimes(1)` after five `nav.destroy()` cycles | ✅ PASS |
| WHEN five design sessions mount and are destroyed before a new session THEN one subsequent drop SHALL still emit exactly one placement event | Exactly 1 placement after 5 mount/destroy cycles | `client/src/ui/palette.test.ts:164` — `expect(handler).toHaveBeenCalledTimes(1)`; `client/src/session/phase-navigation.test.ts:763` — `expect(placementHandler).toHaveBeenCalledTimes(1)` | ✅ PASS |
| WHEN the palette is destroyed THEN its locale listener and DOM chrome SHALL also be removed | Locale listener removed; backdrop/fab/palette DOM removed | Implementation only: `client/src/ui/palette.ts:464-469` — `removeEventListener(LOCALE_CHANGE_EVENT, …)` + `.remove()` on chrome. **No test asserts DOM absence or locale detach after `destroy()`** | ❌ GAP |

**Status**: ❌ Gaps present (AC4 lacks test evidence)

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
| Spec-anchored outcome check (asserted values match spec) | ⚠️ AC4 untested |
| Per-layer Coverage Expectation met | ⚠️ AC4 |
| Every test maps to a spec requirement — no unclaimed tests | ✅ New tests map to AC1/AC2/AC3 |
| Documented guidelines followed: `AGENTS.md` testing principles; Vitest via `window`/DOM events (no WebGL) | ✅ |

---

## Edge Cases

- Spec lists no separate edge-case section beyond the five-visit accumulation scenario (covered by AC3).

---

## Gate Check

- **Gate command**: `npx nx run-many -t lint test --skip-nx-cache` (from spec Verification)
- **Author-reported full gate**: green — shared **175** / client **455** / server **153** (not re-run by verifier)
- **Verifier focused runs** (clean tree):
  - `vitest` filter: `dispatches one placement after repeated|processes one component drop after repeated|dispatches palette:drop with ComponentType`
  - Result: **3 passed**, 39 skipped, 0 failed
- **Test count before feature**: N/A (author gate baseline not captured in this report)
- **Test count after feature (author)**: client 455 (includes +2 lifecycle regressions in commit)
- **Delta**: +2 focused lifecycle tests in `a8416f1`
- **Skipped tests**: none in focused run beyond vitest `-t` filter
- **Failures**: none on clean tree; sensor mutants failed as expected

---

## Fix Plans (if issues found)

### Fix 1: AC4 missing test evidence

- **Root cause**: `destroy()` removes locale listener and DOM chrome, but no assertion targets that outcome.
- **Fix task**: Add a palette unit test that after `handle.destroy()` asserts chrome nodes are gone from the container and that a subsequent locale-change dispatch does not re-render labels (or spy `removeEventListener`).
- **Priority**: Minor (does not regress the duplicate-drop bug; AC1–AC3 + sensors cover the defect)

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| AC1 single placement | Implementing | ✅ Verified |
| AC2 detach on session destroy | Implementing | ✅ Verified |
| AC3 five-session accumulation | Implementing | ✅ Verified |
| AC4 locale + DOM teardown | Implementing | ❌ Needs Fix (test gap) |

---

## Summary

**Overall**: ⚠️ Issues (bug fix verified; AC4 test gap)

**Spec-anchored check**: 3/4 ACs matched with `file:line` evidence; 1 gap (AC4)
**Sensor**: 2/2 mutations killed
**Gate**: author-reported green (shared 175 / client 455 / server 153); verifier focused 3/3 pass

**What works**: Detach-on-destroy + session `palette.destroy()` wiring; single-drop and five-cycle regressions discriminate correctly (mutants yield 6 placements).

**Issues found**: AC4 has implementation cleanup but no acceptance assertion.

**Next steps**: Optional minor follow-up test for locale/DOM teardown on `destroy()`; otherwise merge-ready for the duplicate-drop fix.
