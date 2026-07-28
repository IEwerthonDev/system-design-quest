# Sandbox Panel Drawers Validation

**Date**: 2026-07-28
**Spec**: `.specs/features/sandbox-panel-drawers/spec.md`
**Diff range**: `160c48e70b191123caf51ef41fe06d29295d0116` (`main`)...`48329612ec37e307bb82ce525fd80dc30cb4ce01` (`HEAD` / `feature/sandbox-panel-drawers`)
**Verifier**: independent sub-agent (author ≠ verifier)
**Re-verify**: after `4832961` — `test(sandbox): assert setVisible collapses drawers and hides FABs`

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 Spec + AD-035 | ✅ Done | `e5459ec` |
| T2 Workload FAB/drawer | ✅ Done | `b865424` |
| T3 Mentor FAB/drawer | ✅ Done | `f797145` |
| T4 Mutual exclusivity API | ✅ Done | `f567853` |
| T5 phase-navigation wire | ✅ Done | `9c217f7` + visibility AC covered by `4832961` |
| T6 i18n chrome | ✅ Done | `ef1517f` |
| T7 Full gate + STATE | ✅ Done | `76c0919` |
| Fix: setVisible tests | ✅ Done | `4832961` |

---

## Spec-Anchored Acceptance Criteria

### SPD-01 — Collapsible Workload

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| WHEN sandbox canvas mounts THEN Workload collapsed + FAB visible | `isOpen()===false`; FAB present; collapsed class | `client/src/ui/workload-panel.test.ts:28-30` — `expect(panel.isOpen()).toBe(false)`; FAB truthy; `sdq-workload--collapsed` | ✅ PASS |
| WHEN Workload FAB clicked THEN expand + dismissible backdrop | `isOpen()===true`; backdrop closes panel | `workload-panel.test.ts:38-48` — FAB click → `isOpen()===true`; backdrop click → `isOpen()===false` | ✅ PASS |
| WHEN collapse control clicked THEN collapse | `isOpen()===false` after collapse click | `workload-panel.test.ts:42-43` — collapse click → `isOpen()===false` | ✅ PASS |
| WHEN backdrop clicked THEN collapse | `isOpen()===false` | `workload-panel.test.ts:47-48` — backdrop click → `isOpen()===false` | ✅ PASS |
| WHEN field edited while open THEN `onChange` still fires | `onChange` receives `{ rps: 50000 }` | `workload-panel.test.ts:61` — `expect(changes).toEqual([{ rps: 50000 }])` | ✅ PASS |

### SPD-02 — Collapsible Mentor

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| WHEN mounts THEN Mentor collapsed + FAB visible | `isOpen()===false`; FAB present | `client/src/ui/mentor-panel.test.ts:33-35` — `isOpen()===false`; FAB truthy; collapsed class | ✅ PASS |
| WHEN Mentor FAB clicked THEN expand + backdrop | open then backdrop/collapse close | `mentor-panel.test.ts:43-51` — FAB → open; collapse + backdrop → closed | ✅ PASS |
| WHEN collapse OR outside THEN collapse | both paths close | `mentor-panel.test.ts:46-51` — collapse and backdrop → `isOpen()===false` | ✅ PASS |
| WHEN action button THEN askMentor path unchanged | `askMentorFn` called; result body shown | `mentor-panel.test.ts:61-63` — `expect(askMentorFn).toHaveBeenCalled()`; body contains `'DB is hot'` | ✅ PASS |

### SPD-03 — Mutual exclusivity + canvas phase

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| WHEN Workload opens while Mentor open THEN Mentor collapses (and vice versa) | only one `isOpen()` true | `client/src/ui/sandbox-panel-drawers.test.ts:43-49` — after `workload.open()` mentor closed; after `mentor.open()` workload closed | ✅ PASS |
| WHEN phase leaves canvas / `setVisible(false)` THEN both collapse and FABs hide | `isOpen()===false`; `fab.hidden===true`; `root.hidden===true` | `workload-panel.test.ts:77-84` — `setVisible(false)` → `isOpen()===false`, `fab.hidden===true`, `root.hidden===true`; restore keeps collapsed; `mentor-panel.test.ts:79-86` — same | ✅ PASS |

Wiring: `phase-navigation.ts` calls `setVisible(phase === 'canvas')` for both panels.

### SPD-04 — i18n chrome

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| WHEN locale en or pt-BR THEN FAB/collapse use catalog keys | keys non-empty; EN/pt-BR values; FAB refresh | `sandbox-drawer-i18n.test.ts:21-29` — keys length > 0; `WORKLOAD`/`CARGA`/`MENTOR`; `sandbox-drawer-i18n.test.ts:45-52` — FAB text refreshes on locale | ✅ PASS |

### SPD-05 — Destroy cleanup + non-blocking collapsed

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| WHEN collapsed THEN pointer events do not block canvas | CSS `pointer-events: none` on collapsed | `workload-panel.test.ts:32`; `mentor-panel.test.ts:37` — regex match collapsed + `pointer-events:\s*none` | ✅ PASS |
| WHEN `destroy()` THEN fab, backdrop, panel removed | nodes null | `workload-panel.test.ts:68-70`; `mentor-panel.test.ts:70-72` — panel/fab/backdrop `toBeNull()` | ✅ PASS |

**Status**: ✅ All ACs covered

---

## Discrimination Sensor

Scratch mutations applied then discarded (working tree restored; no permanent edits).

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 | `workload-panel.ts` mount className | Default open: omit `sdq-workload--collapsed` on mount | ✅ Killed — `workload-panel.test.ts:28` |
| 2 | `workload-panel.ts` backdrop listener | Backdrop click no-op instead of `close` | ✅ Killed — `workload-panel.test.ts:48` |
| 3 | `workload-panel.ts` + `mentor-panel.ts` `open()` | Remove `options.onOpen?.()` (exclusivity broken) | ✅ Killed — `sandbox-panel-drawers.test.ts:45` |
| 4 (re-verify) | `workload-panel.ts` `setVisible` | No-op body (no collapse / FAB hide) | ✅ Killed — `workload-panel.test.ts:78` |

**Sensor depth**: lightweight (+1 re-verify mutation for prior gap)
**Result**: 4/4 killed — PASS ✅

---

## Interactive UAT Results

Not performed (Verifier automated pass only; user-facing UAT deferred to orchestrator/user).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ |
| No scope creep | ✅ |
| Matches patterns | ✅ |
| Spec-anchored outcome check | ✅ |
| Per-layer Coverage Expectation | ✅ |
| Every test maps to a spec requirement | ✅ |
| Documented guidelines followed: `AGENTS.md` | ✅ |

---

## Edge Cases

- [x] Collapsed panel non-blocking (`pointer-events: none`) — tested
- [x] `destroy()` removes fab/backdrop/panel — tested
- [x] Leave-canvas / `setVisible(false)` collapses + hides FABs — tested (`4832961`)
- [x] Resize mid-open does not force reset — no resize listener added (implicit OK)
- [ ] Componentes open does not force-close Workload/Mentor — uncoupled in code; **no automated assertion** (non-blocking residual)

---

## Gate Check

- **Gate command**: `nx run-many -t lint test` (orchestrator reported green); re-verify ran `nx run client:test --testPathPattern='workload-panel|mentor-panel'`
- **Result**: client **440** passed, 0 failed (confirmed live with `--skip-nx-cache`)
- **Test count before feature** (panel files on `main`): workload 1 + mentor 1 = 2
- **Test count after**: client **440** (+2 vs prior verify’s 438 from setVisible tests)
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans

Prior Fix 1 (SPD-03 `setVisible` coverage) — **resolved** by `4832961`.

No blocking fix plans remaining.

Optional residual: Componentes-independence edge (Minor) — skip unless UAT requests it.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| SPD-01 | ✅ Verified | ✅ Verified |
| SPD-02 | ✅ Verified | ✅ Verified |
| SPD-03 | ❌ Needs Fix | ✅ Verified |
| SPD-04 | ✅ Verified | ✅ Verified |
| SPD-05 | ✅ Verified | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 5/5 ACs matched spec outcome (0 evidence gaps)
**Sensor**: 4/4 mutations killed (incl. setVisible re-verify)
**Gate**: client 440 passed

**What works**: Default-collapsed drawers, FAB/collapse/backdrop, field/`askMentor`, mutual exclusivity, `setVisible(false)` collapse + FAB hide, i18n, destroy + non-blocking collapsed.

**Issues found**: none blocking

**Next steps**: PR / merge after optional interactive UAT.
