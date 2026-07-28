# Sandbox Panel Drawers — Specification

**Branch:** `feature/sandbox-panel-drawers`  
**Depends on:** study-mode (AD-032·033), mobile chrome (AD-023)  
**Complexity:** Medium  
**Status:** Confirmed — UX decided (FAB/chip mirroring Componentes); proceed Execute  
**ADs:** AD-035 (sandbox Workload + Mentor FAB/drawer)

---

## Problem Statement

In Study Mode (sandbox), the Workload (Carga) and Mentor IA panels stay permanently open and cover large parts of the canvas on both phone and desktop. Players cannot freely draw without fighting overlays. The Componentes palette already solves this with a FAB + drawer (collapsed by default on phone; collapse control on desktop). Workload and Mentor need the same canvas-first behavior on **all** viewports.

## Goals

- [ ] Workload and Mentor panels minimized by default so the sandbox canvas is free
- [ ] Maximize only on explicit FAB/chip click; minimize via panel button **or** click/tap outside
- [ ] Same interaction model on mobile and desktop (FAB/chip row mirroring Componentes)
- [ ] Existing workload field sync + mentor API actions unchanged when panel is open

## Out of Scope

| Item | Reason |
| ---- | ------ |
| Changing Componentes palette behavior | Already correct (AD-023); reference only |
| Collapsing sim strip / session header / findings | Not requested |
| Non-sandbox problem Practice / Speedrun panels | Workload+Mentor are sandbox-only today |
| Persisting open/closed across reloads | Ephemeral chrome; default always collapsed |
| Redesigning mentor/workload field contents | Chrome only |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Trigger chrome | Dedicated FAB/chip per panel (`workload-fab`, `mentor-fab`), always shown when that panel is collapsed | Mirrors Componentes `palette-fab`; works on desktop too (user asked both viewports) | y (user: decide UX) |
| Default state | Both panels **collapsed** on mount (phone + desktop + tablet) | Canvas-first | y |
| Close affordances | Header collapse/minimize button **and** outside click (backdrop or pointerdown outside panel+fab) | User requirement | y |
| Mutual exclusivity | Opening Workload closes Mentor and vice versa; opening either does **not** auto-close Componentes (and vice versa) | Avoid stacking two heavy panels; palette is independent tool | y (agent default) |
| Backdrop | Semi-transparent full-viewport backdrop while either panel is open (like phone palette); click closes the open panel | Click-outside clarity on touch + desktop | y |
| FAB placement | Workload FAB: bottom-left stack above/near Componentes FAB offset; Mentor FAB: bottom-right | Thumb zone; no overlap with Componentes | y |
| Visibility | FABs + panels only when sandbox canvas phase shows those panels today (`hidden` outside canvas) | No chrome leak into library/briefing | y |
| i18n | New keys for FAB labels + collapse aria (`workload.fab`, `mentor.fab`, `workload.collapse`, `mentor.collapse`) EN + pt-BR | AD-024 | y |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Collapsible Workload (Carga) ⭐ MVP

**User Story**: As a sandbox player, I want Workload minimized by default and openable on demand so I can draw freely then tweak RPS/NFRs.

**Why P1**: Primary canvas occlusion today (left overlay).

**Acceptance Criteria**:

1. WHEN sandbox canvas mounts THEN Workload panel SHALL be collapsed (panel not interactively covering canvas; FAB visible).
2. WHEN player clicks/taps the Workload FAB THEN system SHALL expand the Workload panel and show a dismissible backdrop.
3. WHEN Workload is open and player clicks the panel collapse control THEN system SHALL collapse Workload and hide its backdrop.
4. WHEN Workload is open and player clicks/taps outside the panel (backdrop) THEN system SHALL collapse Workload.
5. WHEN Workload is open and player edits a field THEN system SHALL still call `onChange` / sync as today (SPD-01 does not break SM workload behavior).

**Independent Test**: Mount workload panel → assert collapsed + FAB → open via FAB → close via collapse and via backdrop; field change still fires.

---

### P1: Collapsible Mentor IA ⭐ MVP

**User Story**: As a sandbox player, I want Mentor IA minimized by default and openable on demand so mentor chrome does not block the canvas until I ask for help.

**Why P1**: Same occlusion on the opposite corner; pairs with Workload.

**Acceptance Criteria**:

1. WHEN sandbox canvas mounts THEN Mentor panel SHALL be collapsed with Mentor FAB visible.
2. WHEN player clicks/taps the Mentor FAB THEN system SHALL expand Mentor and show backdrop.
3. WHEN Mentor is open and player uses collapse control OR clicks outside THEN system SHALL collapse Mentor.
4. WHEN Mentor is open and player triggers an action button THEN mentor API path SHALL behave as today.

**Independent Test**: Mount mentor panel → collapsed default → FAB open → collapse + backdrop close; action still invokes askMentor.

---

### P1: Mutual exclusivity + canvas phase ⭐ MVP

**User Story**: As a player, I want only one of Workload/Mentor open at a time and chrome only on canvas so the UI stays predictable.

**Acceptance Criteria**:

1. WHEN Workload opens while Mentor is open THEN Mentor SHALL collapse (and vice versa).
2. WHEN phase leaves canvas (or panels are set hidden) THEN both panels SHALL collapse and FABs SHALL hide with the existing visibility gate.

**Independent Test**: Open Mentor then open Workload → Mentor closed; `setVisible(false)` / hidden → FABs hidden.

---

### P2: i18n chrome

**User Story**: As a bilingual player, I want FAB and collapse labels localized.

**Acceptance Criteria**:

1. WHEN locale is `en` or `pt-BR` THEN FAB and collapse strings SHALL use catalog keys (jargon: “Workload” / “Carga”, “AI Mentor” / “Mentor IA”).

---

## Edge Cases

- WHEN both FABs are visible and player opens Componentes drawer THEN Workload/Mentor SHALL remain in their current open/collapsed state (no forced close).
- WHEN panel is collapsed THEN pointer events on the panel body SHALL not block the canvas (panel hidden or non-interactive like collapsed phone palette).
- WHEN resize crosses phone/desktop breakpoint WHILE a panel is open THEN that panel SHALL stay open until user closes it (no forced reset mid-gesture).
- WHEN `destroy()` runs THEN FAB, backdrop, listeners, and panel root SHALL be removed.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| SPD-01 | P1: Collapsible Workload | Tasks | Pending |
| SPD-02 | P1: Collapsible Mentor | Tasks | Pending |
| SPD-03 | P1: Mutual exclusivity + visibility | Tasks | Pending |
| SPD-04 | P2: i18n chrome | Tasks | Pending |
| SPD-05 | Edge: destroy cleanup + non-blocking collapsed | Tasks | Pending |

**Coverage:** 5 total, 0 mapped → update in tasks.md

---

## Success Criteria

- [ ] Sandbox canvas starts with free canvas (Workload + Mentor collapsed) on phone and desktop
- [ ] Open/close via FAB, collapse button, and outside click work for both panels
- [ ] Opening one closes the other; Componentes remains independent
- [ ] Gate `nx run-many -t lint test` green; shipped to production
