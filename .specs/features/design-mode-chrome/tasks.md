# Design Mode Chrome — Tasks

**Spec**: `.specs/features/design-mode-chrome/spec.md`  
**Design**: `.specs/features/design-mode-chrome/design.md`  
**Branch**: `feature/design-mode-chrome`

---

## Test Coverage Matrix

> Guidelines found: `AGENTS.md` (tests from spec ACs; `__GAME_STATE__`; Vitest; no wall-clock sleeps).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Session wiring | unit | Mode mounts chrome per DMC-01/02/03 | `client/src/session/phase-navigation.test.ts` | `nx run client:test` |
| FAB panels | unit | Stack CSS + exclusivity + guideline styles | `client/src/ui/*-panel*.test.ts`, `chaos-lab-ui.test.ts` | `nx run client:test` |
| Shared / server | none for this feature | — | — | lint only |

## Gate Check Commands

| Level | Command |
| ----- | ------- |
| quick | `nx run client:test --testPathPattern=phase-navigation|chaos-lab-ui|workload-panel|mentor-panel|live-metrics` (or vitest filter equivalent) |
| full | `nx run-many -t lint test --skip-nx-cache` |

---

## Execution Plan

### Phase 1 — Tokens + stack CSS

#### T1: FAB stack CSS variables

**Reqs:** DMC-04  
**Files:** `client/src/theme/global.css`  
**Done when:** `--sdq-fab-stack-base`, `--sdq-fab-stack-gap` (8px), `--sdq-fab-stack-size` (44px), `--sdq-fab-stack-inset` (12px) defined; documented slot formula in comment  
**Gate:** quick (style present; later tasks assert)  
**Commit:** `style(design-mode-chrome): add right-edge FAB stack CSS variables`

---

### Phase 2 — Panel positions + guidelines

#### T2: Workload FAB right slot 0 + guidelines

**Reqs:** DMC-04, DMC-05  
**Files:** `client/src/ui/workload-panel.ts`, `client/src/ui/workload-panel.test.ts`  
**Done when:** FAB uses right inset + slot 0 bottom; overscroll contain on panel; reduced-motion rule; tests assert `right:` and stack vars / no `left: 12px` on fab  
**Gate:** quick  
**Commit:** `fix(workload): stack Carga FAB on right edge slot 0`

#### T3: Mentor FAB slot 1 + guidelines

**Reqs:** DMC-04, DMC-05  
**Files:** `client/src/ui/mentor-panel.ts`, `client/src/ui/mentor-panel.test.ts`  
**Done when:** Slot 1 positioning; overscroll/reduced-motion; tests assert bottom uses stack formula / gap  
**Gate:** quick  
**Commit:** `fix(mentor): stack Mentor FAB on right edge slot 1`

#### T4: Chaos + Metrics FAB slots 2–3 + guidelines

**Reqs:** DMC-04, DMC-05  
**Files:** `client/src/ui/chaos-lab-panel.ts`, `client/src/ui/live-metrics-panel.ts`, `client/src/ui/chaos-lab-ui.test.ts`  
**Done when:** Chaos slot 2, Metrics slot 3; tabular-nums on metrics values; overscroll/reduced-motion; tests cover stack CSS + tabular-nums  
**Gate:** quick  
**Commit:** `fix(chaos): stack Caos/Metrics FABs slots 2–3 and guideline polish`

---

### Phase 3 — Session wiring

#### T5: Mount design chrome for study + sandbox

**Reqs:** DMC-01, DMC-02, DMC-03  
**Files:** `client/src/session/phase-navigation.ts`, `client/src/session/phase-navigation.test.ts`  
**Done when:** Workload+Mentor+Chaos+Metrics+QuickChaos mount when `mode !== 'speedrun'`; speedrun mounts none of them; exclusivity still closes others; tests cover study / sandbox / speedrun  
**Gate:** quick  
**Commit:** `feat(design-mode-chrome): mount Carga/Mentor/Chaos in all design modes`

---

### Phase 4 — Decisions + verify

#### T6: Record ADs + STATE handoff

**Reqs:** DMC-06  
**Files:** `.specs/STATE.md`  
**Done when:** AD-038 added; AD-033/035/037 notes extended; Handoff points at this feature  
**Gate:** docs only  
**Commit:** `docs(STATE): AD-038 FAB stack and design-mode chrome`

#### T7: Full gate

**Reqs:** success criteria  
**Files:** —  
**Done when:** `nx run-many -t lint test --skip-nx-cache` exit 0  
**Commit:** none (or chore fix if needed)

---

## Traceability

| Req | Tasks |
| --- | ----- |
| DMC-01 | T5 |
| DMC-02 | T5 |
| DMC-03 | T5 |
| DMC-04 | T1–T4 |
| DMC-05 | T2–T4 |
| DMC-06 | T6 |
