# Quick Chaos in Drawer — Specification

**Branch:** `feature/quick-chaos-in-drawer`  
**Depends on:** chaos-lab (AD-037), design-mode-chrome (AD-038)  
**Complexity:** Small  
**ADs:** AD-039

---

## Problem Statement

Quick Chaos rendered as a permanent two-row strip in the session header, over the canvas, while the CAOS FAB already is the chaos entry point next to Carga/Mentor/Metrics. The strip duplicated that entry point and cost vertical canvas space, but could not simply be deleted: the 7 `group: 'quick'` events are absent from the Chaos Lab catalog (which lists only `infra` + `network`).

## Goals

- [ ] Quick Chaos chips render as the first section inside the Chaos Lab drawer
- [ ] No chaos chrome occupies the canvas or session header when the drawer is closed
- [ ] All 17 events (7 quick + 9 infra + 2 network) stay reachable, with quick keeping toggle semantics

## Out of Scope

| Item | Reason |
| ---- | ------ |
| Converting quick events into catalog cards | Toggle (sole active chaos) ≠ probe-run semantics |
| Changing chaos modifiers or probe math | Behavior unchanged |

## Acceptance Criteria

1. WHEN the Chaos Lab drawer is mounted THEN it SHALL expose a quick slot rendered before the Infrastructure/Network catalog sections
2. WHEN a design-mode session mounts chaos chrome THEN the Quick Chaos toolbar SHALL be inside the Chaos Lab drawer and NOT inside the session header
3. WHEN a quick chip is tapped THEN it SHALL keep sole-active toggle behavior and Clear semantics (AD-037 unchanged)

**Independent Test**: `chaos-lab-ui.test.ts` slot ordering + `phase-navigation.test.ts` containment assertions.

## Requirement Traceability

| Requirement ID | Phase | Status |
| -------------- | ----- | ------ |
| QCD-01 | Implement | Verified |
| QCD-02 | Implement | Verified |
| QCD-03 | Implement | Verified |

## Success Criteria

- [ ] Canvas gains back the strip height in Practice/Sandbox
- [ ] `nx run-many -t lint test` green
