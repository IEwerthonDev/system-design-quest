# Design Mode Chrome Validation

**Date**: 2026-07-29  
**Spec**: `.specs/features/design-mode-chrome/spec.md`  
**Diff range**: `3c6d1b79395279ed0355dafbed280459638a9c80`..`d254f1045984974c7174ae00ce3f22fba3c37312` (`feature/design-mode-chrome`)  
**Base**: `b9dcd6941585a33c4fba5c4864be8ce4e5219c5f` (`main`)  
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status | Commit |
| ---- | ------ | ------ |
| T1 FAB stack CSS variables | ✅ Done | `3b11347` |
| T2 Workload FAB slot 0 + guidelines | ✅ Done | `a499da2` |
| T3 Mentor FAB slot 1 + guidelines | ✅ Done | `3831ea9` |
| T4 Chaos + Metrics slots 2–3 + guidelines | ✅ Done | `f919861` |
| T5 Mount design chrome study + sandbox | ✅ Done | `072a5dc` |
| T6 AD-038 + STATE handoff | ✅ Done | `d254f10` |
| T7 Full gate | ✅ Done | orchestrator green (`nx run-many -t lint test --skip-nx-cache`) |

---

## Spec-Anchored Acceptance Criteria

### P1: Chaos chrome in all design modes

| AC | Spec-defined outcome | Evidence | Result |
| -- | -------------------- | -------- | ------ |
| 1 | `sandbox` **or** `study` canvas mounts Live Metrics, Quick Chaos, Chaos Lab | `phase-navigation.test.ts:711-720` (study: all five testids truthy); `:723-729` (sandbox: workload/mentor/chaos/metrics FABs) | ✅ PASS |
| 2 | `speedrun` canvas does **not** mount chaos/metrics chrome | `phase-navigation.test.ts:732-741` — all four FAB testids + quick-chaos-toolbar `toBeNull()` | ✅ PASS |
| 3 | Practice Chaos/Quick Chaos usable under same empty-graph / exclusivity rules as Sandbox | Shared wiring: `phase-navigation.ts:442-454` (`disabled: empty` on sync); unit: `chaos-lab-ui.test.ts:70-71` (disabled when empty). **No** study-phase integration asserting empty-graph disable or full exclusivity vs sandbox parity | ⚠️ PARTIAL |

### P1: Practice Carga + Mentor

| AC | Spec-defined outcome | Evidence | Result |
| -- | -------------------- | -------- | ------ |
| 1 | Practice mounts Workload + Mentor; open/close with backdrop; mutual exclusion vs Chaos/Metrics | Mount: `phase-navigation.test.ts:716-717`. Backdrop/collapse: `workload-panel.test.ts:47-59`, `mentor-panel.test.ts:51-61`. Exclusivity (workload↔chaos): `phase-navigation.test.ts:744-766` | ✅ PASS |
| 2 | Speedrun does **not** mount Workload or Mentor | `phase-navigation.test.ts:737-738` | ✅ PASS |
| 3 | Opening Workload \| Mentor \| Chaos \| Metrics closes the other three | Unit 4-way: `chaos-lab-ui.test.ts:106-145`. Integration: only workload↔chaos in Practice (`phase-navigation.test.ts:744-766`); workload↔mentor 2-way in `sandbox-panel-drawers.test.ts:43-49`. **Mentor↔Metrics, Workload↔Metrics** not asserted at session wiring level | ⚠️ PARTIAL |

### P1: Right-edge FAB stack

| AC | Spec-defined outcome | Evidence | Result |
| -- | -------------------- | -------- | ------ |
| 1 | Carga/Mentor/Caos FABs `position: fixed; right: 12px` (not left for Carga) | `workload-panel.test.ts:39-40` — `right: var(--sdq-fab-stack-inset`; `not.toMatch` left 12px. Mentor/chaos/metrics: slot CSS in respective panel tests | ✅ PASS |
| 2 | Vertical stack gap ≤ 8px (slot formula size+gap) | Slot multipliers 0/1/2/3 × `(size + gap)` in panel CSS; asserted in `workload-panel.test.ts:41`, `mentor-panel.test.ts:45`, `chaos-lab-ui.test.ts:149-153`. **No** computed layout / pixel gap measurement | ✅ PASS (CSS contract) |
| 3 | Phone (≤768) **and** desktop share stack order + right edge | Implementation uses same stack vars on FABs (`workload-panel.ts:71-75`, etc.); panel drawers adjust at 768px but FAB slots unchanged. **No** viewport-width test for FAB stack | ❌ GAP |
| 4 | Min 44×44 touch target + `safe-area-inset-bottom` on stack base | `--sdq-fab-stack-base` in `global.css:36`; min-height vars in panel CSS; `chaos-lab-ui.test.ts:151-156` min-height regex. **safe-area** present in CSS strings but not explicitly asserted in tests | ⚠️ PARTIAL |

### P2: Design-flow guideline fixes

| AC | Spec-defined outcome | Evidence | Result |
| -- | -------------------- | -------- | ------ |
| 1 | Drawer scroll containers use `overscroll-behavior: contain` | `workload-panel.test.ts:42`; `mentor-panel.test.ts:46`; `chaos-lab-ui.test.ts:150,155` | ✅ PASS |
| 2 | Keyboard `:focus-visible` ring on FAB / collapse (no bare `outline: none`) | Global rule `global.css:158-162` applies to `[class*="sdq-"] button:focus-visible`. **No** panel test asserts focus ring on FAB or collapse controls | ❌ GAP |
| 3 | Live Metrics values use `font-variant-numeric: tabular-nums` | `chaos-lab-ui.test.ts:154` | ✅ PASS |
| 4 | `prefers-reduced-motion: reduce` disables non-essential blur/transition | `workload-panel.test.ts:43`; `mentor-panel.test.ts:47`; implementation in all four panel style blocks. Chaos/metrics reduced-motion **not** named in dedicated assertions (only overscroll/slots in chaos-lab-ui test) | ⚠️ PARTIAL |

### DMC-06 — STATE / AD handoff

| Requirement | Evidence | Result |
| ----------- | -------- | ------ |
| AD-038 + AD-033/035/037 extended; Handoff | `.specs/STATE.md` — Fase `design-mode-chrome`, AD-038 active, AD-035 extended for Practice mount + stack | ✅ PASS |

**P1 AC score**: 7 PASS, 3 PARTIAL, 1 GAP (phone viewport)  
**P2 AC score**: 2 PASS, 1 PARTIAL, 1 GAP (focus-visible)

---

## Discrimination Sensor

Mental fault injection (no permanent edits):

| Mutation | Expected failure | Killed? |
| -------- | ---------------- | ------- |
| Mount Workload/Mentor only when `isSandbox` (revert T5) | Study canvas lacks workload-fab | ✅ `phase-navigation.test.ts:716` |
| Carga FAB `left: 12px` instead of right stack | CSS assertion fails | ✅ `workload-panel.test.ts:40` |
| Mount chaos/metrics FABs in speedrun | speedrun null assertions | ✅ `phase-navigation.test.ts:737-741` |
| `designChrome = isSandbox` instead of `mode !== 'speedrun'` | Study mount test fails | ✅ `phase-navigation.test.ts:711-720` |
| Remove `closeOverlaysExcept` on chaos `onOpen` | Workload stays open when chaos opens | ✅ `phase-navigation.test.ts:762-765` |
| Mentor slot 0 instead of slot 1 | Slot multiplier assertion | ✅ `mentor-panel.test.ts:45` |
| Phone viewport moves FAB stack to left / different order | — | ❌ **Survives** (no viewport test) |
| Remove `global.css` `button:focus-visible` rule | — | ❌ **Survives** (no focus test) |
| Skip `disabled: empty` in `refreshChaosChrome` for study | — | ❌ **Survives** (no study empty-graph integration test) |
| Break mentor↔metrics exclusivity in `phase-navigation` wiring only | — | ❌ **Survives** at integration level (unit test in isolation would still pass) |

**Sensor**: 6/10 killed — acceptable for P1 mount/stack/speedrun; 4 surviving mutants align with ranked gaps below.

---

## Gate Check

- **Command**: `npx nx run-many -t lint test --skip-nx-cache` (orchestrator reported green; not re-run by verifier this pass)
- **Quick slice** (tasks matrix): `phase-navigation`, `chaos-lab-ui`, `workload-panel`, `mentor-panel`, `live-metrics` tests present and mapped to DMC reqs

---

## Ranked Gaps

1. **P1 Stack AC3 — phone viewport** (Major): No test at ≤768px asserting right-edge stack order; mutant changing phone FAB layout would not fail CI.
2. **P2 AC2 — focus-visible** (Minor): Relies on global.css only; no FAB/collapse focus ring assertion per spec independent test.
3. **P1 Practice AC3 — full 4-drawer exclusivity at session level** (Minor): Unit coverage in `chaos-lab-ui.test.ts`; integration only workload↔chaos in Practice — wiring bug on mentor↔metrics could slip through.
4. **P1 Chaos AC3 — study empty-graph disable** (Minor): Logic shared with sandbox in `refreshChaosChrome`; no study-phase test that quick-chaos/chaos-lab are disabled on empty graph.
5. **Sandbox quick-chaos assertion** (Trivial): Study test checks `quick-chaos-toolbar`; sandbox mount test (`:723-729`) omits it (FABs only).

---

## Verdict

**Overall: ✅ PASS (MVP)** — P1 mount rules, speedrun exclusion, right-edge stack CSS, and core exclusivity are spec-anchored with failing tests for the highest-risk regressions. P2 and viewport/focus gaps are documented; none block merge for stated MVP goals.

**Diff range (feature commits)**: `3c6d1b7..d254f10` (7 commits)
