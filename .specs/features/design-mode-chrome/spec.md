# Design Mode Chrome — Specification

**Branch:** `feature/design-mode-chrome`  
**Depends on:** chaos-lab (AD-037), sandbox-panel-drawers (AD-035), study-mode (AD-033)  
**Complexity:** Medium  
**Status:** Confirmed — user follow-up after chaos-lab ship  
**ADs:** AD-037 extended · AD-033 extended · AD-035 extended · AD-038 (FAB stack)

---

## Problem Statement

Chaos Lab shipped, but design-session chrome is inconsistent: Workload/Mentor stay sandbox-only while Chaos mounts in Practice; FABs scatter (Carga left, Mentor/Caos/Metrics overlapping right bottoms). Learners need the same resilience tools in every **design** mode, with a clear minimized right-edge stack.

## Goals

- [ ] Chaos Lab + Quick Chaos + Live Metrics available in Sandbox **and** Practice (`study`) canvas
- [ ] Speedrun remains without chaos/metrics chrome (ranking fairness)
- [ ] Practice mounts Carga + Mentor + Caos FABs (same exclusivity as sandbox)
- [ ] Minimized FABs Carga → Mentor → Caos stacked on the **right** edge, minimal gap, desktop + mobile

## Out of Scope

| Item | Reason |
| ---- | ------ |
| Speedrun chaos / live metrics | AD-037 ranking fairness |
| Persist chaos / mentor in graph or sessions | AD-037 / AD-033 |
| New chaos events or sim formulas | Already shipped |
| Palette FAB relocation | Stays left/phone dock (AD-023) |
| Mermaid / discrete-event sim | Backlog |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Speedrun vs AD-037 | Keep Speedrun **without** Chaos/Quick Chaos/Live Metrics | Ranking fairness; user said “clarify” not “include” | y (logged) |
| “All design modes” | `sandbox` + `study` (Practice) only | Design = freeform draw; Speedrun is timed contest | y |
| Mentor in Practice | Mount mentor chrome in `study` + `sandbox` | User asked Carga/Mentor/Caos in Study Mode; extends AD-033 chrome scope (API unchanged) | y |
| Workload in Practice | Mount workload FAB in Practice | Same stack as Study Mode request | y |
| Live Metrics FAB | 4th slot **above** Carga/Mentor/Caos stack (still right) | Needed in all design modes; not named in the three-stack but required by goal 1 | y |
| Stack order (bottom→top) | Carga (0), Mentor (1), Caos (2), Metrics (3) | User order for first three; Metrics above | y |
| Gap | 8px between FAB boxes; `right: 12px`; base `16px + safe-area` | Minimal but ≥44px targets | y |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Chaos chrome in all design modes ⭐ MVP

**User Story**: As a learner in Practice or Sandbox, I want Chaos Lab, Quick Chaos, and Live Metrics so I can stress-test any design session.

**Acceptance Criteria**:

1. WHEN canvas phase opens with `mode === 'sandbox'` OR `mode === 'study'` THEN system SHALL mount Live Metrics, Quick Chaos, and Chaos Lab chrome
2. WHEN canvas phase opens with `mode === 'speedrun'` THEN system SHALL NOT mount Live Metrics, Quick Chaos, or Chaos Lab chrome
3. WHEN Practice (`study`) canvas is open THEN Chaos Lab FAB and Quick Chaos toolbar SHALL be usable under the same empty-graph / exclusivity rules as Sandbox

**Independent Test**: Mount session study + sandbox → assert chrome present; speedrun → assert absent via testids / `__GAME_STATE__`.

---

### P1: Practice Carga + Mentor ⭐ MVP

**User Story**: As a Practice learner, I want Carga and Mentor drawers so I can tune workload and ask the mentor without switching to Sandbox.

**Acceptance Criteria**:

1. WHEN Practice canvas opens THEN Workload FAB and Mentor FAB SHALL mount and open/close with backdrop + mutual exclusion vs Chaos/Metrics
2. WHEN Speedrun canvas opens THEN Workload and Mentor FABs SHALL NOT mount
3. WHEN opening any of Workload | Mentor | Chaos Lab | Live Metrics THEN the other three drawers SHALL close

**Independent Test**: phase-navigation study session → click each FAB → only one drawer open.

---

### P1: Right-edge FAB stack ⭐ MVP

**User Story**: As a learner on desktop or phone, I want Carga, Mentor, and Caos minimized FABs stacked on the right so the canvas stays clear and targets stay tappable.

**Acceptance Criteria**:

1. WHEN design-mode canvas is visible THEN Workload, Mentor, and Chaos Lab FABs SHALL use `position: fixed; right: 12px` (not left for Carga)
2. WHEN all three are visible THEN their bottoms SHALL form a vertical stack with gap ≤ 8px between adjacent FAB boxes (centers separated by ≤ 52px = 44+8)
3. WHEN viewport is phone (≤768) OR desktop THEN the same stack order and right edge SHALL apply
4. WHEN a FAB is shown THEN it SHALL keep min 44×44 touch target and `env(safe-area-inset-bottom)` on the stack base

**Independent Test**: CSS/computed style assertions on fab classes + stack CSS variables; layout smoke in Vitest jsdom where feasible.

---

### P2: Design-flow guideline fixes

**User Story**: As a learner, I want drawer chrome to follow Web Interface Guidelines so focus, scroll, and motion behave predictably.

**Acceptance Criteria**:

1. WHEN a design-mode drawer is open THEN its scroll container SHALL use `overscroll-behavior: contain`
2. WHEN FAB / collapse controls are focused via keyboard THEN `:focus-visible` ring SHALL remain visible (no `outline: none` without replacement)
3. WHEN Live Metrics numeric rows render THEN values SHALL use `font-variant-numeric: tabular-nums`
4. WHEN drawers animate or backdrop-filter is present THEN `@media (prefers-reduced-motion: reduce)` SHALL disable non-essential blur/transition on those overlays

**Independent Test**: Style string / computed assertions in panel unit tests.

---

## Edge Cases

- WHEN only Chaos mounts (regression) without workload — N/A after Practice mount
- WHEN Componentes palette FAB is open — right stack unchanged; palette stays independent (AD-023/035)
- WHEN locale changes — FAB labels refresh (existing pattern)
- WHEN phase leaves canvas — all design FABs hide (`setVisible(false)`)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| DMC-01 | Chaos in study+sandbox; not speedrun | Tasks | Pending |
| DMC-02 | Practice mounts Workload + Mentor | Tasks | Pending |
| DMC-03 | Mutual exclusion four drawers | Tasks | Pending |
| DMC-04 | Right stack Carga/Mentor/Caos (+ Metrics slot) | Tasks | Pending |
| DMC-05 | Guideline fixes (overscroll, focus, tabular, reduced-motion) | Tasks | Pending |
| DMC-06 | AD-033/035/037/038 + STATE handoff | Tasks | Pending |

**Coverage:** 6 total, 0 mapped to tasks yet.

---

## Success Criteria

- [ ] Practice session shows Carga, Mentor, Caos FABs stacked on the right
- [ ] Speedrun has no chaos/metrics/workload/mentor FABs
- [ ] Opening one drawer closes the others
- [ ] `nx run-many -t lint test` green
