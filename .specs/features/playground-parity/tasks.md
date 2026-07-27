# Playground Parity — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** One atomic commit per task. Gate must pass before commit. After the last task, Verifier runs automatically (author ≠ verifier).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design:** `.specs/features/playground-parity/design.md`  
**Spec:** `.specs/features/playground-parity/spec.md`  
**Context:** `.specs/features/playground-parity/context.md`  
**Branch:** `feature/playground-parity`  
**Status:** Approved — ready for Execute  
**Gate (feature):** `npx nx run-many -t lint test`

---

## Test Coverage Matrix

> Generated from codebase + `AGENTS.md` testing principles — confirm before Execute. Guidelines: `AGENTS.md` (Vitest, `__GAME_STATE__`, no WebGL, deterministic, no wall-clock sleeps).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Shared schema / domain helpers | unit | 1:1 ACs for status map, clamp 1–5, latencyMs bands; listed edge clamps | `libs/shared/src/**/*.test.ts` | `npx nx test shared` |
| Simulation engine | unit | Pressure unchanged by speed; latencyMs from pressure; fixtures ≤5 traffic | `libs/shared/src/simulation/*.test.ts` | `npx nx test shared` |
| Session store / service | unit | Upsert, list, cap-50 eviction, invalid nickname, corrupt file degrade | `server/src/sessions/*.test.ts` | `npx nx test server` |
| Session HTTP routes | unit (inject) | PUT/GET happy + 400 paths | `server/src/routes/sessions*.test.ts` | `npx nx test server` |
| Blueprint node / edges / canvas | unit via `__GAME_STATE__` | Labels, ms bar, curve path `C`/`Q`, pressures+latencyMs exposed | `client/src/blueprint/*.test.ts` | `npx nx test client` |
| Sim controls / phase / judge UI | unit | Max 5; no hints-panel; sidebar+modal viewport; save calls | `client/src/ui/*.test.ts`, `client/src/session/*.test.ts`, `client/src/sessions/*.test.ts` | `npx nx test client` |
| Entity / CSS-only polish | none | — (covered by component unit) | — | lint via full gate |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick shared | After shared tasks | `npx nx test shared` |
| Quick server | After server tasks | `npx nx test server` |
| Quick client | After client tasks | `npx nx test client` |
| Full | Phase end / feature | `npx nx run-many -t lint test` |

---

## Execution Plan

```
Phase 1 (Shared):     T1 → T2 → T3
Phase 2 (Server):     T4 → T5 → T6 → T7
Phase 3 (Canvas UX):  T8 → T9 → T10 → T11
Phase 4 (Judge+Save): T12 → T13 → T14 → T15
Phase 5 (Dashboard):  T16 → T17
```

**Execute packing (offer sub-agents if user accepts):**  
- Batch 1: Phase 1+2 (T1–T7) ≈7 tasks  
- Batch 2: Phase 3+4 (T8–T15) ≈8 tasks  
- Batch 3: Phase 5 (T16–T17) ≈2 tasks  

---

## Task Breakdown

### T1: Design-session schema + verdict map

**What:** Add `DesignSessionStatus`, `DesignSessionRecord`, upsert input, `verdictToSessionStatus`, `SESSION_CAP_PER_NICKNAME=50`; export from `@sdq/shared`.  
**Where:** `libs/shared/src/schema/design-session.ts`, `libs/shared/src/index.ts`, `*.test.ts`  
**Depends on:** None  
**Reuses:** `Verdict`, nickname helpers, `ArchitectureGraph`  
**Requirement:** PP-06, PP-07

**Done when:**
- [x] PASS→approved, FAIL→rejected, PARTIAL→partial
- [x] Types exported; unit tests cover three mappings
- [x] Gate: `npx nx test shared`
- [x] Commit: `feat(shared): design session schema and verdict status map`

**Tests:** unit  
**Gate:** quick shared

---

### T2: Clamp Speed/Traffic to 1–5 in normalizeGraph

**What:** Change simulation clamp from 1–10 to **1–5**; update shared fixtures/tests that used >5.  
**Where:** `libs/shared/src/schema/normalize-graph.ts`, related tests  
**Depends on:** None (can parallel conceptually; sequence after T1 for clean commits)  
**Reuses:** existing `clamp`  
**Requirement:** PP-02

**Done when:**
- [x] speed/traffic >5 normalize to 5; <1 to 1
- [x] Existing shared tests green
- [x] Gate: `npx nx test shared`
- [x] Commit: `fix(shared): clamp simulation speed and traffic to 1-5`

**Tests:** unit  
**Gate:** quick shared

---

### T3: Educational latencyMs on evaluateSimulation

**What:** Extend `SimulationEvaluation` with `latencyMs` map: ok→35, warn→120, hot→280; speed still ignored for pressure.  
**Where:** `libs/shared/src/simulation/evaluate-simulation.ts`, `*.test.ts`  
**Depends on:** T2 (fixtures use ≤5 traffic)  
**Reuses:** `pressureFromRatio` / pressure levels  
**Requirement:** PP-01

**Done when:**
- [x] Hot node has latencyMs 280; ok 35; warn 120
- [x] Speed change does not alter pressures or latencyMs
- [x] Gate: `npx nx test shared`
- [x] Commit: `feat(shared): educational latencyMs from simulation pressure`

**Tests:** unit  
**Gate:** quick shared

---

### T4: InMemory SessionStore

**What:** `SessionStore` interface + `InMemorySessionStore` (upsert, getById, listByNickname, delete, reset).  
**Where:** `server/src/sessions/store.ts`, `store.test.ts`  
**Depends on:** T1  
**Reuses:** `server/src/leaderboard/store.ts` pattern  
**Requirement:** PP-06, PP-07

**Done when:**
- [x] Upsert by id; list filters nickname (+ optional status)
- [x] Unit tests cover CRUD basics
- [x] Gate: `npx nx test server`
- [x] Commit: `feat(server): in-memory design session store`

**Tests:** unit  
**Gate:** quick server

---

### T5: JsonFile SessionStore

**What:** `JsonFileSessionStore` with load + atomic write; corrupt file → empty; path injectable.  
**Where:** `server/src/sessions/json-file-store.ts`, `*.test.ts` (temp dir)  
**Depends on:** T4  
**Reuses:** T4 interface  
**Requirement:** PP-06 (durability)

**Done when:**
- [ ] Persist survives new store instance on same path
- [ ] Corrupt JSON boots empty without throw
- [ ] Gate: `npx nx test server`
- [ ] Commit: `feat(server): JSON file design session store`

**Tests:** unit  
**Gate:** quick server

---

### T6: SessionService (validate + cap 50)

**What:** `createSessionService(store)` — nickname validate, normalize graph on upsert, enforce cap 50/nickname (evict oldest `updatedAt` ≠ current id).  
**Where:** `server/src/sessions/service.ts`, `service.test.ts`  
**Depends on:** T4 (T5 optional for service tests — use InMemory)  
**Reuses:** `normalizeNickname`, `isValidNickname`, `normalizeGraph`  
**Requirement:** PP-06

**Done when:**
- [ ] Invalid nickname → error outcome
- [ ] 51st distinct id for same nick evicts oldest
- [ ] Re-upsert same id does not inflate count
- [ ] Gate: `npx nx test server`
- [ ] Commit: `feat(server): design session service with cap-50 eviction`

**Tests:** unit  
**Gate:** quick server

---

### T7: Session HTTP routes + buildApp DI

**What:** `PUT /api/sessions/:id`, `GET /api/sessions?nickname=&status=`, `GET /api/sessions/:id`; wire `sessionStore` into `buildApp`.  
**Where:** `server/src/routes/sessions.ts`, `sessions.test.ts`, `server/src/main.ts`  
**Depends on:** T6  
**Reuses:** leaderboard routes DI pattern  
**Requirement:** PP-06, PP-07

**Done when:**
- [ ] PUT upsert returns record; GET list requires nickname (400 if missing)
- [ ] GET by id 404 when missing
- [ ] Default store for prod path documented (JsonFile or InMemory+env) per design
- [ ] Gate: `npx nx test server`
- [ ] Commit: `feat(server): design session HTTP routes`

**Tests:** unit  
**Gate:** quick server

---

### T8: Sim controls max 5×

**What:** Speed/Traffic slider `max=5`; sync display; update client tests.  
**Where:** `client/src/ui/sim-controls.ts`, `blueprint-chrome.test.ts` (or sim tests)  
**Depends on:** T2  
**Reuses:** existing mountSimControls  
**Requirement:** PP-02

**Done when:**
- [ ] Inputs have max="5"; setting 5 works
- [ ] Gate: `npx nx test client`
- [ ] Commit: `fix(client): cap sim speed and traffic sliders at 5x`

**Tests:** unit  
**Gate:** quick client

---

### T9: BOTTLENECK / QUEUEING labels + ms bar

**What:** When sim running, show labels + colored ms bar from pressures/latencyMs; expose on `__GAME_STATE__`; hide when stopped.  
**Where:** `client/src/blueprint/node-card.ts`, `blueprint-canvas.ts`, `*.test.ts`  
**Depends on:** T3  
**Reuses:** pressure CSS classes  
**Requirement:** PP-01

**Done when:**
- [ ] hot→BOTTLENECK red; warn→QUEUEING yellow; ok→no load label
- [ ] ms bar green/yellow/red; `__GAME_STATE__.latencyMs` present when running
- [ ] Gate: `npx nx test client`
- [ ] Commit: `feat(client): bottleneck queueing labels and ms bar`

**Tests:** unit  
**Gate:** quick client

---

### T10: Remove canvas Dicas panel

**What:** Stop mounting `hints-panel` in phase-navigation; assert absence; update tests that expected mount.  
**Where:** `client/src/session/phase-navigation.ts`, related tests  
**Depends on:** None (canvas phase)  
**Reuses:** —  
**Requirement:** PP-03

**Done when:**
- [ ] Canvas phase: no `[data-testid="hints-panel"]`
- [ ] Gate: `npx nx test client`
- [ ] Commit: `fix(client): remove hints panel from session canvas`

**Tests:** unit  
**Gate:** quick client

---

### T11: Lock curved SVG edge paths

**What:** Unit tests that edge `d` contains `C` or `Q` (not straight-only `L`); preview uses curve.  
**Where:** `client/src/blueprint/svg-edges.ts` (tweak if needed), `*.test.ts`  
**Depends on:** None  
**Reuses:** `curvePath`  
**Requirement:** PP-04

**Done when:**
- [ ] Test fails if path is straight-only; passes with Bezier
- [ ] Gate: `npx nx test client`
- [ ] Commit: `test(client): assert blueprint edges use bezier curves`

**Tests:** unit  
**Gate:** quick client

---

### T12: Client sessions-api

**What:** `upsertSession`, `listSessions`, `getSession` fetch wrappers + error type.  
**Where:** `client/src/sessions/sessions-api.ts`, `*.test.ts` (mock fetch)  
**Depends on:** T7 (contract)  
**Reuses:** `leaderboard-api.ts` pattern  
**Requirement:** PP-06, PP-07

**Done when:**
- [ ] PUT/GET paths match server; errors surfaced
- [ ] Gate: `npx nx test client`
- [ ] Commit: `feat(client): design sessions API client`

**Tests:** unit  
**Gate:** quick client

---

### T13: Judge right sidebar

**What:** Present result/judge UI as right sidebar (`data-testid="judge-sidebar"`); canvas remains usable.  
**Where:** `client/src/ui/result-panel.ts` and/or `judge-sidebar.ts`, phase-navigation host, tests  
**Depends on:** None (UI)  
**Reuses:** existing result panel content  
**Requirement:** PP-05

**Done when:**
- [ ] Sidebar mounts on right; testid present
- [ ] Gate: `npx nx test client`
- [ ] Commit: `feat(client): mount AI judge as right sidebar`

**Tests:** unit  
**Gate:** quick client

---

### T14: Approve/reject confirm modal (viewport-safe)

**What:** Modal for Confirmar/Voltar with max-height ≤ viewport, internal scroll, usable at 375 width; status copy for approved/rejected/partial.  
**Where:** `client/src/ui/session-confirm-modal.ts`, `*.test.ts`  
**Depends on:** T1 (status labels)  
**Reuses:** leaderboard modal visibility patterns if any  
**Requirement:** PP-05, PP-06

**Done when:**
- [ ] Modal does not overflow fixture viewport; actions visible
- [ ] Gate: `npx nx test client`
- [ ] Commit: `feat(client): viewport-safe session confirm modal`

**Tests:** unit  
**Gate:** quick client

---

### T15: Wire Confirmar / Voltar → PUT sessions

**What:** On confirm after judge → upsert status from verdict; Voltar → `in_progress`; nickname via `getOrCreateNickname`; show error on failure.  
**Where:** `client/src/session/phase-navigation.ts` (+ helpers), tests  
**Depends on:** T12, T13, T14  
**Reuses:** T12 API, session id from session-store  
**Requirement:** PP-06

**Done when:**
- [ ] Confirm PASS → PUT approved; PARTIAL → partial; Voltar → in_progress
- [ ] Failed PUT shows message (no silent success)
- [ ] Gate: `npx nx test client`
- [ ] Commit: `feat(client): persist design session on confirm and back`

**Tests:** unit  
**Gate:** quick client

---

### T16: Sessions history dashboard

**What:** Dashboard UI with filters Approved / Rejected / Partial / In Progress; empty states; loads via listSessions(nickname).  
**Where:** `client/src/ui/sessions-dashboard.ts`, nav/bootstrap entry, tests  
**Depends on:** T12  
**Reuses:** nickname storage, problem titles if available  
**Requirement:** PP-07

**Done when:**
- [ ] Four buckets; empty state; list renders seeded fixtures via mock API
- [ ] Gate: `npx nx test client`
- [ ] Commit: `feat(client): sessions history dashboard`

**Tests:** unit  
**Gate:** quick client

---

### T17: Reopen session + hydrate graph (PP-08)

**What:** Selecting a session loads graph (and requirements if present) into active session / canvas; in_progress can re-submit later.  
**Where:** dashboard open handler + session-store helpers, tests  
**Depends on:** T16, T15  
**Reuses:** `setGraph`, `createSession` / hydrate path  
**Requirement:** PP-08

**Done when:**
- [ ] Open in_progress → `__GAME_STATE__.graph` matches saved
- [ ] Gate: `npx nx run-many -t lint test` (full feature gate)
- [ ] Commit: `feat(client): reopen persisted design sessions`

**Tests:** unit  
**Gate:** full

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1 ──→ T2 ──→ T3
Phase 2:  T4 ──→ T5 ──→ T6 ──→ T7
Phase 3:  T8 ──→ T9 ──→ T10 ──→ T11
Phase 4:  T12 ──→ T13 ──→ T14 ──→ T15
Phase 5:  T16 ──→ T17
```

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 schema | 1 module | ✅ |
| T2 clamp | 1 function area | ✅ |
| T3 latencyMs | 1 engine extension | ✅ |
| T4 in-memory store | 1 store impl | ✅ |
| T5 JSON file store | 1 store impl | ✅ |
| T6 service | 1 service | ✅ |
| T7 routes | 1 route module | ✅ |
| T8 sim controls | 1 UI tweak | ✅ |
| T9 labels/ms | card + canvas wire | ⚠️ cohesive OK |
| T10 remove hints | 1 wiring change | ✅ |
| T11 curve tests | 1 assert area | ✅ |
| T12 sessions-api | 1 client module | ✅ |
| T13 sidebar | 1 UI shell | ✅ |
| T14 modal | 1 component | ✅ |
| T15 wire save | 1 integration | ✅ |
| T16 dashboard | 1 UI | ✅ |
| T17 reopen | 1 hydrate flow | ✅ |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
| ---- | ----------------- | ------------- | ------ |
| T1 | None | — | ✅ |
| T2 | None | — (seq after T1) | ✅ |
| T3 | T2 | T2→T3 | ✅ |
| T4 | T1 | T1→…→T4 | ✅ |
| T5 | T4 | T4→T5 | ✅ |
| T6 | T4 | T4→T6 | ✅ |
| T7 | T6 | T6→T7 | ✅ |
| T8 | T2 | T2→…→T8 | ✅ |
| T9 | T3 | T3→…→T9 | ✅ |
| T10 | None | — | ✅ |
| T11 | None | — | ✅ |
| T12 | T7 | T7→…→T12 | ✅ |
| T13 | None | — | ✅ |
| T14 | T1 | T1→…→T14 | ✅ |
| T15 | T12,T13,T14 | those → T15 | ✅ |
| T16 | T12 | T12→…→T16 | ✅ |
| T17 | T16,T15 | T15/T16→T17 | ✅ |

Note: Phase 3 tasks T10/T11 have no hard dep on T8/T9 but run after them for ordered UX delivery. Phase order enforces soft sequencing.

---

## Test Co-location Validation

| Task | Layer | Matrix Requires | Task Says | Status |
| ---- | ----- | --------------- | --------- | ------ |
| T1 | Shared schema | unit | unit | ✅ |
| T2 | Shared schema | unit | unit | ✅ |
| T3 | Simulation | unit | unit | ✅ |
| T4 | Session store | unit | unit | ✅ |
| T5 | Session store | unit | unit | ✅ |
| T6 | Session service | unit | unit | ✅ |
| T7 | Session routes | unit | unit | ✅ |
| T8 | Sim controls | unit | unit | ✅ |
| T9 | Blueprint | unit | unit | ✅ |
| T10 | Phase nav | unit | unit | ✅ |
| T11 | Blueprint edges | unit | unit | ✅ |
| T12 | sessions-api | unit | unit | ✅ |
| T13 | Judge UI | unit | unit | ✅ |
| T14 | Modal UI | unit | unit | ✅ |
| T15 | Phase + API wire | unit | unit | ✅ |
| T16 | Dashboard UI | unit | unit | ✅ |
| T17 | Reopen hydrate | unit + full gate | unit / full | ✅ |

---

## Tools question (before Execute)

For each task, default tools unless you override:

- **MCP:** filesystem (workspace) · GitHub only if PR later  
- **Skills:** `tlc-spec-driven` Execute · `context-checkpoint` each turn · `verification-before-completion` before done claims  
- **Not used:** browser e2e unless you ask  

Reply how you want Execute to run:
1. **`execute inline`** in a **new chat** (recommended — this thread is AMBER), or  
2. **`execute with sub-agents`** (Batch 1→2→3), or  
3. Adjust tools per task.
