# Sandbox Panel Drawers — Tasks

**Branch:** `feature/sandbox-panel-drawers`  
**Spec:** `.specs/features/sandbox-panel-drawers/spec.md`  
**Complexity:** Medium — Design skipped (extends palette FAB/drawer)  
**AD:** AD-035

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `AGENTS.md` (Vitest; WebGL N/A; assert DOM/`__GAME_STATE__`; tests from ACs).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Workload / Mentor panel chrome | unit | SPD-01–05 ACs: default collapsed, FAB open, collapse+backdrop close, mutual exclusivity, destroy cleanup | `client/src/ui/*.test.ts` | `nx run client:test` |
| i18n keys | unit (via panel tests) | FAB/collapse strings present for en + pt-BR when chrome refreshes | same + catalogs | `nx run client:test` |
| phase-navigation wiring | unit (extend if needed) | Sandbox still mounts panels; visibility on canvas phase | `client/src/session/phase-navigation.test.ts` | `nx run client:test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After each task | `nx run client:test --testPathPattern=workload-panel\|mentor-panel` (or file path) |
| Full | Before PR / after last task | `nx run-many -t lint test` |

---

## Execution Plan

Single batch (≤7 tasks) — execute inline.

### T1: Spec + AD-035 + STATE handoff

**Reqs:** SPD-* (traceability bootstrap)  
**Files:** `.specs/features/sandbox-panel-drawers/spec.md`, `.specs/STATE.md`  
**Done when:** Spec committed; AD-035 recorded; Handoff points at this feature branch  
**Gate:** docs only (no test)  
**Commit:** `docs(sandbox-panel-drawers): spec + AD-035 canvas-first drawers`

### T2: Workload FAB/drawer chrome (SPD-01, SPD-05 partial)

**Reqs:** SPD-01, SPD-05  
**Files:** `client/src/ui/workload-panel.ts`, `client/src/ui/workload-panel.test.ts`, i18n catalogs as needed for workload fab/collapse  
**Done when:**
- Mount → collapsed; FAB `[data-testid="workload-fab"]` visible
- FAB click → open; collapse `[data-testid="workload-collapse"]` → closed
- Backdrop `[data-testid="workload-backdrop"]` click → closed
- Collapsed panel does not receive pointer blocking (hidden or `pointer-events: none` / collapsed class)
- `destroy()` removes fab, backdrop, panel
- Field `onChange` still works when open
- Quick gate green  
**Commit:** `feat(workload): FAB drawer collapsed by default`

### T3: Mentor FAB/drawer chrome (SPD-02, SPD-05)

**Reqs:** SPD-02, SPD-05  
**Files:** `client/src/ui/mentor-panel.ts`, `client/src/ui/mentor-panel.test.ts`, i18n  
**Done when:** Same open/close/backdrop/destroy pattern with `mentor-fab` / `mentor-collapse` / `mentor-backdrop`; action buttons still call askMentor when open  
**Commit:** `feat(mentor): FAB drawer collapsed by default`

### T4: Mutual exclusivity + open/close API (SPD-03)

**Reqs:** SPD-03  
**Files:** `workload-panel.ts`, `mentor-panel.ts`, tests; optionally thin shared helper if duplication hurts  
**Done when:**
- Panels expose `open`/`close`/`isOpen` (and optionally `onOpen` callback)
- Opening Workload closes Mentor when wired; opening Mentor closes Workload
- Tests cover exclusivity via callbacks or a small coordinator in phase-navigation  
**Commit:** `feat(sandbox): exclusive workload/mentor drawers`

### T5: Wire phase-navigation + hide with canvas (SPD-03)

**Reqs:** SPD-03  
**Files:** `client/src/session/phase-navigation.ts`, `phase-navigation.test.ts` if needed  
**Done when:** Sandbox mount wires exclusivity; leaving canvas / `hidden` collapses both and hides FABs with panels  
**Commit:** `feat(session): wire sandbox panel drawer exclusivity`

### T6: i18n FAB/collapse strings (SPD-04)

**Reqs:** SPD-04  
**Files:** `client/src/i18n/catalog-en.ts`, `catalog-pt-BR.ts`, panel refresh on locale  
**Done when:** Keys `workload.fab`, `workload.collapse`, `mentor.fab`, `mentor.collapse` exist; panels refresh labels on locale change  
**Commit:** `feat(i18n): workload and mentor drawer chrome strings`

> Note: If T2/T3 already add keys, T6 may only finish locale-change refresh + assert both locales — do not duplicate keys.

### T7: Full gate + STATE ready for PR

**Reqs:** all  
**Files:** `.specs/STATE.md`, tasks.md status  
**Done when:** `nx run-many -t lint test` green; Handoff lists commits + next = Verify/PR  
**Commit:** `docs(STATE): sandbox-panel-drawers ready for verify`

---

## Requirement → Task Map

| ID | Tasks |
| -- | ----- |
| SPD-01 | T2 |
| SPD-02 | T3 |
| SPD-03 | T4, T5 |
| SPD-04 | T6 (keys may land in T2/T3) |
| SPD-05 | T2, T3 |

**Coverage:** 5 total, 5 mapped, 0 unmapped
