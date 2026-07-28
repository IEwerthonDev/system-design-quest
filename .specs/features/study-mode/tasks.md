# Study Mode + Simulation Realism — Tasks

**Spec:** `.specs/features/study-mode/spec.md`  
**Design:** `.specs/features/study-mode/design.md`  
**Branch:** `feature/study-mode`

---

## Execution Plan

Phases packed for inline execute (user directed: do not stop / no ask).

### Phase A — Shared engine

#### T1: Workload schema + normalize (SM-01)

- Extend `SimulationSettings`; `normalizeSimulation` clamps + derives readRatio
- Export defaults; unit tests for clamp/derive
- **Gate:** `npx nx run shared:test --testPathPattern=normalize`
- **Commit:** `feat(study-mode): add absolute workload fields to SimulationSettings`

#### T2: Path-aware evaluateSimulation (SM-02)

- Ingress RPS, path BFS, intent weights, RPS capacity; preserve traffic-only fixture levels
- **Gate:** `npx nx run shared:test --testPathPattern=evaluate-simulation`
- **Commit:** `feat(study-mode): path-aware simulation with absolute RPS`

#### T3: analyzeTopology (SM-03)

- New module + finding types; tests for SPOF/MISSING_CACHE/MISSING_MQ/BOTTLENECK
- **Gate:** `npx nx run shared:test --testPathPattern=analyze-topology`
- **Commit:** `feat(study-mode): deterministic topology findings analyzer`

### Phase B — Client surfaces

#### T4: Findings UI + canvas wire (SM-04)

- Findings panel; blueprint runs analyzeTopology with sim eval
- **Gate:** `npx nx run client:test --testPathPattern=findings`
- **Commit:** `feat(study-mode): show architecture findings on canvas`

#### T5: Sandbox mode + library CTA (SM-05)

- GameMode sandbox; session create; skip briefing; Practice rename
- **Gate:** `npx nx run client:test --testPathPattern='problem-library|session'`
- **Commit:** `feat(study-mode): sandbox Study Mode session entry`

#### T6: Workload panel (SM-06)

- UI for absolute metrics; syncs graph.simulation
- **Gate:** `npx nx run client:test --testPathPattern=workload`
- **Commit:** `feat(study-mode): sandbox workload configuration panel`

### Phase C — Mentor + ship

#### T7: Mentor API (SM-07)

- Shared mentor types; mock; Fastify + Vercel handler; esbuild; rate limit
- **Gate:** `npx nx run server:test --testPathPattern=mentor`
- **Commit:** `feat(study-mode): add POST /api/mentor with mock fallback`

#### T8: Mentor chrome (SM-08)

- Five buttons + result panel; client API
- **Gate:** `npx nx run client:test --testPathPattern=mentor`
- **Commit:** `feat(study-mode): sandbox mentor action buttons`

#### T9: i18n + STATE + full gate (SM-09)

- Locale strings; STATE ADs 031–033; `npx nx run-many -t lint test`
- **Commit:** `docs(study-mode): AD-031–033 and i18n for Study Mode`

---

## Test Coverage Matrix

| Requirement | Test location |
| ----------- | ------------- |
| SM-01 | `normalize-graph` / simulation normalize tests |
| SM-02 | `evaluate-simulation.test.ts` |
| SM-03 | `analyze-topology.test.ts` |
| SM-04 | `findings-panel.test.ts` |
| SM-05 | `problem-library.test.ts` + session tests |
| SM-06 | `workload-panel.test.ts` |
| SM-07 | `mentor` server tests |
| SM-08 | `mentor-panel.test.ts` |
| SM-09 | lint + full test suite |

## Gate Check Commands

```bash
npx nx run-many -t lint test
```
