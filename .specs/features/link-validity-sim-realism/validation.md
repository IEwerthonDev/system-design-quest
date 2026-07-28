# Link Validity + Sim Realism — Validation

| Field | Value |
| ----- | ----- |
| Verifier | Independent (author ≠ verifier) |
| Branch | `feature/link-validity-sim-realism` |
| Date | 2026-07-28 |
| Gate | `npx nx run-many -t test --projects=shared,client,server` — **PASS** (77/77 feature-scoped tests; full suite cached green) |
| **Result** | **FAIL** |

## Summary

Implementation and unit tests cover most P1 acceptance criteria (pair assessor, preview colors, tap-to-connect, sim findings, judge hydrate). **FAIL** due to missing automated evidence for always-on findings / graph-refresh wiring (AC 20–21), a shallow mentor bottlenecks test (AC 19), and no test for `clearDbIntentRole` on delete (AC 22).

## Per-AC Evidence

| AC | Status | Evidence |
| -- | ------ | -------- |
| 1–6 Preview | **PASS** | `client/src/blueprint/svg-edges.test.ts` — preview Bezier, warn/invalid stroke colors, survives `sync()`; `blueprint-canvas.ts` wires pointermove + `setPreview` |
| 7–11 Pair rules | **PASS** | `libs/shared/src/validation/connection-pair.test.ts` (8 cases: ok/warn/invalid, client→DB, DB→client, MQ→client, monitoring warn) |
| 12 Tap-to-connect | **PASS** | `client/src/blueprint/blueprint-canvas.test.ts` — `tap-to-connect completes a link on second node select while linking` |
| 13 Pan-safe linking | **PARTIAL** | Code: pan handlers do not clear `linkingFrom` in `blueprint-canvas.ts`; no dedicated pan-during-link test |
| 14 Mobile delete | **PASS** | `client/src/blueprint/connection-intent-popover.test.ts` — Delete button calls `onDelete` |
| 15 Async MQ relief | **PARTIAL** | `evaluate-simulation.test.ts` — `reduces sync DB pressure when app also publishes to MQ`; code uses `relief = writeFrac * 0.5` (`evaluate-simulation.ts:544`) but test only asserts pressure ordering, not ~50% |
| 16 Primary/replica split | **PASS** | `evaluate-simulation.test.ts` — `concentrates write load on primary vs replica topologyRole` |
| 17 HOT_PARTITION | **PASS** | `analyze-topology.test.ts` — `emits HOT_PARTITION when skewed SQL is hot`; code threshold `keySkew >= 40` (`analyze-topology.ts:186`) |
| 18 QUEUE_BACKLOG | **PASS** | `analyze-topology.test.ts` — `emits QUEUE_BACKLOG for warn pressure nodes` |
| 19 Mentor bottlenecks | **PARTIAL** | `server/src/mentor/mentor.test.ts` injects pre-built `QUEUE_BACKLOG` finding; does not assert both `BOTTLENECK` + `QUEUE_BACKLOG` from `analyzeTopology` path (`mentor-service.ts:83–87`) |
| 20 Findings without Start | **FAIL** | Code: `phase-navigation.ts:393–397` calls `analyzeTopology(g)` (which auto-`evaluateSimulation`s); **no test** |
| 21 Refresh on graph change | **FAIL** | Code: `subscribeGraphChanges` → `refreshFindings()` (`phase-navigation.ts:474–475`); **no test** in `phase-navigation.test.ts` |
| 22 clearDbIntentRole | **PARTIAL** | Code: `blueprint-canvas.ts:220,829`; **no test** |
| 23 Judge hydrate | **PASS** | `client/src/session/session-store.test.ts` — `hydrateFromDesignSession restores prior judgeResult when present` |

## Code Spot-Check

| Item | Present |
| ---- | ------- |
| `assessConnectionPair` | ✅ `libs/shared/src/validation/connection-pair.ts:42` |
| `setPreview(..., status)` | ✅ `client/src/blueprint/svg-edges.ts:154–166` |
| `refreshFindings` always-on | ✅ `client/src/session/phase-navigation.ts:393–397` |
| `FindingCode` includes `QUEUE_BACKLOG` | ✅ `libs/shared/src/schema/architecture-graph.ts:232–233` |

## Gaps (blocking)

1. **AC 20–21** — No Vitest coverage for findings panel refresh when sim is stopped or on graph mutation; tasks T5 claims `phase-navigation` verify but `phase-navigation.test.ts` has zero findings assertions.
2. **AC 19** — Mentor test passes injected findings; does not prove mock bottlenecks path surfaces both `BOTTLENECK` and `QUEUE_BACKLOG` from real topology analysis.
3. **AC 22** — `clearDbIntentRole(edgeId)` on edge delete is implemented but untested.
4. **AC 15** — Async decoupling test is indirect (pressure order); does not assert ~50% write load reduction per spec wording.

## Recommendation

Add `phase-navigation.test.ts` cases for (a) findings populated with `simulation.running: false`, (b) graph change triggers panel sync; extend mentor test with a graph that yields both bottleneck codes via `analyzeTopology`; add blueprint test asserting `clearDbIntentRole` on delete. Re-run gate before merge.
