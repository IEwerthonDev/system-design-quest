# Canvas Graph DnD — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design:** `.specs/features/canvas-graph-dnd/design.md`  
**Spec:** `.specs/features/canvas-graph-dnd/spec.md`  
**Context:** `.specs/features/canvas-graph-dnd/context.md`  
**Branch:** `feature/canvas-graph-dnd`  
**Status:** Approved — 2026-07-27  
**Approach:** A — Interaction orchestrator

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `AGENTS.md` (WebGL not testable in Vitest; assert via `__GAME_STATE__` + `ArchitectureGraph`; tests from ACs; deterministic; one commit per task).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Edge domain (`edge-manager`) | unit | 1:1 ACs for connect/cancel/invert/reconnect rules + listed edge cases | `client/src/scene/edge-manager.test.ts` | `npx nx test client` |
| Flow edge / preview (shader wrappers) | unit (mocked THREE / frag) | Curve type, uniforms (`uTime`, `uBidirectional`), preview show/hide/update — no pixel asserts | `client/src/scene/edges/*.test.ts` | `npx nx test client` |
| Handles | unit | Visibility hover/forced; pick in/out; world positions | `client/src/scene/handles/*.test.ts` | `npx nx test client` |
| Properties panel (edge mode) | unit | Sync edge mode; invert/delete/bidirectional callbacks | `client/src/ui/properties-panel.test.ts` | `npx nx test client` |
| Canvas interaction FSM | unit | Modes + graph sync via `__GAME_STATE__` / exposed state; ACs CGD-01…09 | `client/src/scene/canvas-interaction.test.ts` | `npx nx test client` |
| Boot wiring (`main.ts`) | unit / smoke | Interaction mounted when canvas present (existing bootstrap patterns) | `client/src/**/*.test.ts` | `npx nx test client` |
| E2E (optional smoke) | none required for MVP | Manual UAT; existing `e2e/` may stay unchanged | — | — |

## Gate Check Commands

> Generated from codebase — confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After each task with unit tests | `npx nx test client --testPathPattern=<touched>` or `npx nx test client` |
| Full | After Phase 3 / Phase 4 | `npx nx run-many -t lint test` |
| Build | Feature done / before Verify | `npx nx run-many -t lint test` |

---

## Execution Plan

Phases run sequentially; tasks within a phase run in order.

### Phase 1: Domain + visuals foundation

```
T1 → T2 → T3
```

### Phase 2: Preview + panel

```
T4 → T5
```

### Phase 3: Orchestrator P1 (link + edit)

```
T6 → T7 → T8
```

### Phase 4: Reconnect, bidirectional, wiring

```
T9 → T10 → T11
```

---

## Task Breakdown

### T1: EdgeManager — canConnect, invert, reconnectEndpoint

**What:** Extend edge domain APIs for validity, invert, and endpoint reconnect.  
**Where:** `client/src/scene/edge-manager.ts` (+ `edge-manager.test.ts`)  
**Depends on:** None  
**Reuses:** `createEdgeManager`, `connect`, `setDirection`  
**Requirement:** CGD-01, CGD-02, CGD-06, CGD-07

**Tools:**
- MCP: NONE
- Skill: `tlc-spec-driven` (Execute)

**Done when:**
- [x] `canConnect(from, to)` rejects self-loop and duplicate ordered pair
- [x] `invert(edgeId)` swaps from/to or returns null if would duplicate
- [x] `reconnectEndpoint(edgeId, end, newNodeId)` updates endpoint or returns null (invalid → no mutate)
- [x] Gate: `npx nx test client --testPathPattern=edge-manager`
- [x] Test count: existing + new cases ≥ previous (no silent deletions)

**Tests:** unit  
**Gate:** quick  
**Commit:** `feat(client): edge-manager connect invert reconnect APIs`

---

### T2: Flow edge — Bezier curve + rebuild/setDirection

**What:** Upgrade permanent tubes to smooth Bezier; support rebuild/direction for invert/reconnect visuals.  
**Where:** `client/src/scene/edges/flow-edge.ts` (+ `flow-edge.test.ts`)  
**Depends on:** T1  
**Reuses:** TubeGeometry + AD-008 shader, `uBidirectional`  
**Requirement:** CGD-03, CGD-06, CGD-08

**Tools:**
- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when:**
- [x] Curve is `QuadraticBezierCurve3` (or equivalent smooth curve), not `LineCurve3`
- [x] `setDirection` / rebuild updates uniforms + geometry endpoints
- [x] Bidirectional still sets `uBidirectional=1`; forward = `0`
- [x] Gate: `npx nx test client --testPathPattern=flow-edge`
- [x] Test count: no silent deletions

**Tests:** unit  
**Gate:** quick  
**Commit:** `feat(client): bezier flow-edge with rebuild helpers`

---

### T3: Component handles (in/out)

**What:** Create handle visuals + pick helpers for Obsidian-style ports.  
**Where:** Create `client/src/scene/handles/component-handles.ts` (+ `component-handles.test.ts`)  
**Depends on:** T2  
**Reuses:** Component instance positions / `userData` pick pattern  
**Requirement:** CGD-01, CGD-04

**Tools:**
- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when:**
- [x] Each component can have distinct `in` and `out` handles with `userData`
- [x] Visibility API: hover vs forced (for linking targets)
- [x] `pickHandle` distinguishes in vs out
- [x] Gate: `npx nx test client --testPathPattern=component-handles`
- [x] Test count: new file tests pass

**Tests:** unit  
**Gate:** quick  
**Commit:** `feat(client): component in/out connection handles`

---

### T4: Link preview (curved + flow light)

**What:** Ephemeral preview tube with flow animation from origin to pointer.  
**Where:** Create `client/src/scene/edges/link-preview.ts` (+ `link-preview.test.ts`)  
**Depends on:** T2  
**Reuses:** flow-edge curve/shader helpers  
**Requirement:** CGD-03

**Tools:**
- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when:**
- [x] `showPreview` / `updatePreview` / `hidePreview` work
- [x] `update(dt)` advances flow uniform (light on preview)
- [x] `setValidTarget` toggles invalid vs valid feedback state (testable flag)
- [x] Gate: `npx nx test client --testPathPattern=link-preview`
- [x] Test count: new tests pass

**Tests:** unit  
**Gate:** quick  
**Commit:** `feat(client): animated curved link preview`

---

### T5: Properties panel — edge mode

**What:** Panel sync for selected edge: delete, invert, bidirectional toggle.  
**Where:** `client/src/ui/properties-panel.ts` (+ `properties-panel.test.ts`)  
**Depends on:** None (parallel-safe with Phase 1; ordered after T4 in plan for simplicity)  
**Reuses:** Existing panel chrome  
**Requirement:** CGD-05, CGD-06, CGD-08

**Tools:**
- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when:**
- [x] State supports `mode: 'component' | 'edge' | 'hidden'`
- [x] Edge mode exposes delete / invert / bidirectional controls + callbacks
- [x] Component mode behavior unchanged
- [x] Gate: `npx nx test client --testPathPattern=properties-panel`
- [x] Test count: no silent deletions

**Tests:** unit  
**Gate:** quick  
**Commit:** `feat(client): properties panel edge mode controls`

---

### T6: Orchestrator — hover handles + create/cancel link

**What:** Mount interaction FSM: hover shows handles; drag out→in creates edge; cancel empty/outside; invalid forbidden.  
**Where:** Create `client/src/scene/canvas-interaction.ts` (+ `canvas-interaction.test.ts`)  
**Depends on:** T1, T3, T5  
**Reuses:** ComponentManager (`attachPointerHandlers: false`), EdgeManager, handles, selection patterns  
**Requirement:** CGD-01, CGD-02, CGD-09 (partial sync)

**Tools:**
- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when:**
- [ ] Hover shows in/out handles; body drag still moves component when not on handle
- [ ] Drag from out-handle enters `linking`; drop on valid in/body creates A→B + graph sync
- [ ] Cancel on empty/outside; self/duplicate shows invalid + no edge
- [ ] Orbit controls disabled while linking
- [ ] Gate: `npx nx test client --testPathPattern=canvas-interaction`
- [ ] Test count: ACs covered for create/cancel/invalid

**Tests:** unit  
**Gate:** quick  
**Commit:** `feat(client): canvas link gesture via handles`

---

### T7: Orchestrator — preview + target highlight while linking

**What:** Wire link-preview + forced destination handles + node/in highlight during linking.  
**Where:** `client/src/scene/canvas-interaction.ts` (+ tests)  
**Depends on:** T4, T6  
**Reuses:** link-preview, handles forced visible  
**Requirement:** CGD-03, CGD-04

**Tools:**
- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when:**
- [ ] Preview curve + flow light active while `linking` / exposed `previewActive`
- [ ] Valid target: highlight node + in-handle; destination handles appear without prior hover
- [ ] Invalid: `setValidTarget(false)` / forbidden cursor state; no snap
- [ ] On success, preview hidden; permanent flow edge present
- [ ] Gate: `npx nx test client --testPathPattern=canvas-interaction`
- [ ] Test count: no silent deletions

**Tests:** unit  
**Gate:** quick  
**Commit:** `feat(client): link preview and target highlight`

---

### T8: Orchestrator — select/delete/invert edge

**What:** Click edge to select; Delete/panel delete; panel invert with immediate visual flip.  
**Where:** `client/src/scene/canvas-interaction.ts`, selection routing (+ tests)  
**Depends on:** T6, T5, T2  
**Reuses:** EdgeManager.invert/removeEdge, properties edge mode, flow rebuild  
**Requirement:** CGD-05, CGD-06

**Tools:**
- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when:**
- [ ] Click flow-edge mesh selects edge; panel shows edge mode
- [ ] Delete/Backspace removes selected edge; panel delete too
- [ ] Invert swaps endpoints + light direction immediately
- [ ] Delete with component selected still deletes component + incident edges
- [ ] Gate: `npx nx test client --testPathPattern=canvas-interaction`
- [ ] Test count: no silent deletions

**Tests:** unit  
**Gate:** quick  
**Commit:** `feat(client): select delete invert canvas edges`

---

### T9: Orchestrator — reconnect endpoint by dragging tip

**What:** Drag selected edge endpoint to another valid node; invalid reverts.  
**Where:** `client/src/scene/canvas-interaction.ts` (+ tests)  
**Depends on:** T8, T1, T4  
**Reuses:** `reconnectEndpoint`, link-preview  
**Requirement:** CGD-07

**Tools:**
- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when:**
- [ ] Dragging tip enters `reconnecting`; preview follows pointer
- [ ] Valid drop updates endpoint + graph; invalid restores previous
- [ ] Controls disabled during reconnect
- [ ] Gate: `npx nx test client --testPathPattern=canvas-interaction`
- [ ] Test count: no silent deletions

**Tests:** unit  
**Gate:** quick  
**Commit:** `feat(client): reconnect edge endpoints by drag`

---

### T10: Bidirectional dual-pulse via panel

**What:** Panel toggle sets `direction=bidirectional` and dual-pulse animation; toggle off → single forward.  
**Where:** `canvas-interaction.ts` + `flow-edge` frag/uniforms if needed (+ tests)  
**Depends on:** T8, T2, T5  
**Reuses:** `setDirection`, `uBidirectional`  
**Requirement:** CGD-08

**Tools:**
- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when:**
- [ ] Panel action toggles bidirectional on selected edge
- [ ] `uBidirectional` / dual-pulse behavior asserted in unit tests
- [ ] Forward restore shows single pulse from→to
- [ ] Gate: `npx nx test client --testPathPattern='(canvas-interaction|flow-edge)'`
- [ ] Test count: no silent deletions

**Tests:** unit  
**Gate:** quick  
**Commit:** `feat(client): bidirectional edge dual-pulse toggle`

---

### T11: Boot wiring + `__GAME_STATE__` + palette drop

**What:** Mount orchestrator from `main.ts`; expose interaction state; palette drop places components; full graph sync.  
**Where:** `client/src/main.ts`, `canvas-interaction.ts`, test-hook/session as needed (+ tests)  
**Depends on:** T6–T10  
**Reuses:** palette `PALETTE_DROP_EVENT`, serializeGraph, session store  
**Requirement:** CGD-09

**Tools:**
- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when:**
- [ ] Canvas boot mounts interaction when WebGL canvas exists
- [ ] `__GAME_STATE__` exposes serializable `canvasInteraction` fields (mode, linking, selectedEdgeId, previewActive)
- [ ] Palette drop creates component at drop XZ + syncs graph
- [ ] Gate: `npx nx run-many -t lint test`
- [ ] Test count: no silent deletions across client

**Tests:** unit  
**Gate:** full  
**Commit:** `feat(client): wire canvas graph interaction into boot`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 ──→ T2 ──→ T3
Phase 2:  T4 ──→ T5
Phase 3:  T6 ──→ T7 ──→ T8
Phase 4:  T9 ──→ T10 ──→ T11
```

**Batch packing (Execute):** 11 tasks → ~2 workers  
- Batch 1: Phase 1 + Phase 2 (T1–T5) ≈ 5 tasks  
- Batch 2: Phase 3 + Phase 4 (T6–T11) ≈ 6 tasks  

Offer sub-agents at Execute if user accepts.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 EdgeManager APIs | 1 module + tests | ✅ |
| T2 flow-edge Bezier | 1 module + tests | ✅ |
| T3 handles | 1 module + tests | ✅ |
| T4 link-preview | 1 module + tests | ✅ |
| T5 properties edge mode | 1 UI module + tests | ✅ |
| T6 link create/cancel FSM | 1 orchestrator slice | ✅ |
| T7 preview/highlight | same file, cohesive slice | ✅ |
| T8 select/delete/invert | same file, cohesive slice | ✅ |
| T9 reconnect | same file, cohesive slice | ✅ |
| T10 bidirectional | panel+visual toggle | ✅ |
| T11 boot wiring | mount + hooks | ✅ |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
| ---- | ----------------- | ------------- | ------ |
| T1 | None | Phase1 start | ✅ |
| T2 | T1 | T1→T2 | ✅ |
| T3 | T2 | T2→T3 | ✅ |
| T4 | T2 | (Phase2 after P1; depends T2 ✓) | ✅ |
| T5 | None | T4→T5 order only | ✅ |
| T6 | T1, T3, T5 | After P1+P2; needs T1/T3/T5 | ✅ |
| T7 | T4, T6 | T6→T7; T4 available | ✅ |
| T8 | T6, T5, T2 | T7→T8; deps available | ✅ |
| T9 | T8, T1, T4 | T8→T9 | ✅ |
| T10 | T8, T2, T5 | T9→T10 | ✅ |
| T11 | T6–T10 | T10→T11 | ✅ |

Note: T4 depends on T2 (not T3); Phase 2 starts after Phase 1 completes so T2 exists. T5 has no hard dep on T4 but runs after T4 for panel-before-orchestrator clarity.

---

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| ---- | ---------- | --------------- | --------- | ------ |
| T1 | edge-manager | unit | unit | ✅ |
| T2 | flow-edge | unit | unit | ✅ |
| T3 | handles | unit | unit | ✅ |
| T4 | link-preview | unit | unit | ✅ |
| T5 | properties-panel | unit | unit | ✅ |
| T6 | canvas-interaction | unit | unit | ✅ |
| T7 | canvas-interaction | unit | unit | ✅ |
| T8 | canvas-interaction | unit | unit | ✅ |
| T9 | canvas-interaction | unit | unit | ✅ |
| T10 | interaction + flow-edge | unit | unit | ✅ |
| T11 | boot + interaction | unit | unit | ✅ |

---

## Requirement Traceability (tasks)

| ID | Tasks |
| -- | ----- |
| CGD-01 | T1, T3, T6 |
| CGD-02 | T1, T6 |
| CGD-03 | T2, T4, T7 |
| CGD-04 | T3, T7 |
| CGD-05 | T5, T8 |
| CGD-06 | T1, T2, T5, T8 |
| CGD-07 | T1, T9 |
| CGD-08 | T2, T5, T10 |
| CGD-09 | T6, T11 |

---

## Tools question (before Execute)

For each task, default tools planned above are **MCP: NONE** + skill **`tlc-spec-driven`** (and **`tdd`** / **`verification-before-completion`** as needed).

Available in this environment if you want extras: `user-playwright` (manual UAT), `user-filesystem`, GitHub MCP.

**Aprova o `tasks.md`?**  
- **Sim** → Status Approved; próximo = Execute (T1…)  
- Ajustes → diga o que mudar  
- Em Execute: prefere **sub-agents por batch** (T1–T5 / T6–T11) ou **inline** nesta sessão?
