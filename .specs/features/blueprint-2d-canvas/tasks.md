# Blueprint 2D Canvas — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement with `tlc-spec-driven` Execute flow. One atomic commit per task. Gate must pass before commit.

**Design:** `.specs/features/blueprint-2d-canvas/design.md`  
**Spec:** `.specs/features/blueprint-2d-canvas/spec.md`  
**Context:** `.specs/features/blueprint-2d-canvas/context.md`  
**Branch:** `feature/blueprint-2d-canvas`  
**Status:** Done — Execute complete 2026-07-27

---

## Test Coverage Matrix

| Code Layer | Required Test Type | Location Pattern | Run Command |
| ---------- | ------------------ | ---------------- | ----------- |
| Schema + normalize | unit | `libs/shared/src/**/*.test.ts` | `npx nx test shared` |
| Simulation engine | unit | `libs/shared/src/simulation/*.test.ts` | `npx nx test shared` |
| Blueprint canvas / cards / edges | unit via `__GAME_STATE__` | `client/src/blueprint/*.test.ts` | `npx nx test client` |
| Sim controls / problem drawer | unit | `client/src/ui/*.test.ts` | `npx nx test client` |
| Judge prompts | unit | `server/src/judge/*.test.ts` | `npx nx test server` |

## Gate Check Commands

| Gate Level | Command |
| ---------- | ------- |
| Quick shared | `npx nx test shared` |
| Quick client | `npx nx test client` |
| Quick server | `npx nx test server` |
| Full | `npx nx run-many -t lint test` |

---

## Execution Plan

```
Phase 1: T1 → T2
Phase 2: T3 → T4 → T5
Phase 3: T6 → T7 → T8
Phase 4: T9 → T10 → T11
```

---

## Task Breakdown

### T1: Extend ArchitectureGraph schema + normalize

**What:** Add replicas, implementationNotes, config unions, simulation; normalize helpers; keep legacy `note`/`z` readable.  
**Where:** `libs/shared/src/schema/architecture-graph.ts`, `normalize-graph.ts`, exports, tests, golden graphs defaults  
**Depends on:** None  
**Requirement:** BP-02, BP-03, BP-07 (defaults)

**Done when:**
- [x] Types export `ComponentConfig`, `SimulationSettings`, `replicas` on nodes
- [x] `normalizeGraph` fills replicas=1, default simulation, maps `note` → notes
- [x] Existing shared tests pass (update fixtures)
- [x] Gate: `npx nx test shared`
- [x] Commit: `feat(shared): extend ArchitectureGraph for blueprint configs`

**Tests:** unit  
**Gate:** quick shared

---

### T2: Simulation pressure engine

**What:** `evaluateSimulation(graph)` per design formulas.  
**Where:** `libs/shared/src/simulation/`  
**Depends on:** T1  
**Requirement:** BP-05

**Done when:**
- [x] Fixture: low hitRate + high traffic → sql `hot`; high hitRate → improved
- [x] Speed not in pressure inputs
- [x] Exported from `@sdq/shared`
- [x] Gate: `npx nx test shared`
- [x] Commit: `feat(shared): educational simulation pressure engine`

**Tests:** unit  
**Gate:** quick shared

---

### T3: Blueprint canvas shell (grid, pan/zoom, drop)

**What:** Mount 2D blueprint world; palette drop creates node at world coords; sync session graph.  
**Where:** `client/src/blueprint/blueprint-canvas.ts`, wire from phase-navigation / main (can dual-boot temporarily)  
**Depends on:** T1  
**Requirement:** BP-01

**Done when:**
- [x] Canvas phase shows blueprint grid (no WebGL required for place)
- [x] Drop from palette → node in `__GAME_STATE__.graph`
- [x] Pan/zoom transform world
- [x] Gate: `npx nx test client --testPathPattern=blueprint`
- [x] Commit: `feat(client): mount 2D blueprint canvas shell`

**Tests:** unit  
**Gate:** quick client

---

### T4: Node cards + replicas UI

**What:** Card DOM with category border, label, −/reps/+.  
**Where:** `client/src/blueprint/node-card.ts`  
**Depends on:** T3  
**Requirement:** BP-02

**Done when:**
- [x] +/− updates replicas in graph; floor at 1
- [x] Drag card updates position
- [x] Gate: client blueprint tests
- [x] Commit: `feat(client): blueprint node cards with replicas`

**Tests:** unit  
**Gate:** quick client

---

### T5: SVG edges + linking

**What:** Handles, connect out→in, SVG paths, edge labels, delete/select.  
**Where:** `client/src/blueprint/svg-edges.ts`, `interaction.ts`  
**Depends on:** T4  
**Requirement:** BP-01

**Done when:**
- [x] Connect two nodes → edge in graph; self-loop/dup rejected
- [x] Edge label visible when set
- [x] Gate: client blueprint tests
- [x] Commit: `feat(client): blueprint SVG edges and linking`

**Tests:** unit  
**Gate:** quick client

---

### T6: Config popover

**What:** Selection opens popover; typed controls for cache/cdn/sql; notes all.  
**Where:** `client/src/blueprint/config-popover.ts`  
**Depends on:** T4  
**Requirement:** BP-03

**Done when:**
- [x] hitRate / shards / skew / notes persist to graph
- [x] Judge footer copy visible
- [x] Gate: client tests
- [x] Commit: `feat(client): blueprint config popover with typed settings`

**Tests:** unit  
**Gate:** quick client

---

### T7: Sim controls header

**What:** Capsule Start/Speed/Traffic/R/W → `graph.simulation`.  
**Where:** `client/src/ui/sim-controls.ts`, `session-header.ts`  
**Depends on:** T1, T3  
**Requirement:** BP-04

**Done when:**
- [x] Sliders + Start toggle update simulation in `__GAME_STATE__`
- [x] readRatio ≥70 shows read-heavy hint
- [x] Gate: client tests
- [x] Commit: `feat(client): simulation controls capsule in session header`

**Tests:** unit  
**Gate:** quick client

---

### T8: Wire sim engine to canvas (pressure + packets)

**What:** When running, badges on cards + packet animation; speed scales anim only.  
**Where:** `client/src/blueprint/sim-bridge.ts`  
**Depends on:** T2, T5, T7  
**Requirement:** BP-05

**Done when:**
- [x] `__GAME_STATE__` exposes node pressures when running
- [x] Stop clears running animation state
- [x] Gate: client tests
- [x] Commit: `feat(client): wire simulation pressure badges on blueprint`

**Tests:** unit  
**Gate:** quick client

---

### T9: PROBLEM drawer + session title

**What:** PROBLEM slide-out + header title.  
**Where:** `client/src/ui/problem-drawer.ts`, session-header  
**Depends on:** T3  
**Requirement:** BP-06

**Done when:**
- [x] Open/close drawer with problem briefing content
- [x] Header shows problem title
- [x] Gate: client tests
- [x] Commit: `feat(client): PROBLEM drawer and session header title`

**Tests:** unit  
**Gate:** quick client

---

### T10: Judge prompt enrichment + normalize on submit

**What:** formatGraph includes new fields; submit path normalizes graph.  
**Where:** `server/src/judge/prompts.ts`, client submit / session  
**Depends on:** T1  
**Requirement:** BP-07

**Done when:**
- [x] Prompt string contains replicas/config/notes/simulation
- [x] Legacy graph without fields still judges
- [x] Gate: `npx nx test server` (+ shared if needed)
- [x] Commit: `feat(server): include blueprint fields in judge prompts`

**Tests:** unit  
**Gate:** quick server

---

### T11: Unwire Three.js session path + full gate

**What:** phase-navigation/main use blueprint only; remove createCanvasRenderer from game path; full lint+test.  
**Where:** `client/src/main.ts`, `phase-navigation.ts`, `bootstrap.ts`  
**Depends on:** T3–T9  
**Requirement:** BP-01

**Done when:**
- [x] Design session boots blueprint; no WebGL canvas required
- [x] `npx nx run-many -t lint test` passes
- [x] Commit: `refactor(client): replace 3D session canvas with blueprint 2D`
- [x] Update STATE.md Handoff

**Tests:** full suite  
**Gate:** full

---

## Adequacy Review

Tasks cover BP-01…BP-07. Chaos/Mermaid deferred. Verifier after T11.
