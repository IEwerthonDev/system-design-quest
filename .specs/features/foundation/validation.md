# Foundation Validation

**Date**: 2026-07-27  
**Spec**: `.specs/features/foundation/spec.md`  
**Diff range**: `main...60ecc537eab334493da605978c0d439407cf28ad` (merge base `e6ba41530db31604a2b052528e09fc8e2a39d5b9`; re-verification fix `60ecc53`)
**Verifier**: independent sub-agent (author ≠ verifier)  
**Verdict**: **FAIL**

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1 | ✅ Done | Nx workspace and root scripts are present. |
| T2 | ✅ Done | Shared graph types, public exports, and validation are covered. |
| T3 | ✅ Done | Fastify health route has exact response assertions. |
| T4 | ✅ Done | Grid, isometric camera, and OrbitControls now have behavioral assertions. |
| T5 | ✅ Done | `__GAME_STATE__` exposure and serialization are asserted. |
| T6 | ❌ Gap | Configuration assertions do not prove `npm run dev` starts both services; the orchestration mutant survived. |
| T7 | ✅ Done | Fresh uncached lint/test gate passes. |
| T8 | ⚠️ Partial | Workflow and docs exist, but GitHub has no `feature/foundation` branch or CI run for HEAD. |

`tasks.md:181-182` still leaves GitHub CI and independent verification unchecked.

---

## Spec-Anchored Acceptance Criteria

Evidence-or-zero is applied. Assertions must discriminate the spec-defined behavior, not merely match implementation text.

| Spec criterion | FND mapping | Spec-defined outcome | `file:line` + assertion expression | Result |
| --- | --- | --- | --- | --- |
| Dev clone/start | FND-01 | `npm install && npm run dev` starts client on 4200 and server on 3000 | `client/src/dev-config.test.ts:8-21` asserts script/config source substrings. A scratch mutant changed `npm run dev` to `echo nx run-many...` while preserving those strings; all 7 client tests still passed. A runtime attempt also left the server start unproven because port 3000 was occupied by a different service. | ❌ GAP |
| Canvas load | FND-02 | Browser canvas contains an isometric grid and OrbitControls | `client/src/scene/canvas-renderer.test.ts:55-61` — exact camera position/look-at, scene grid addition, polar bounds, and returned controls; removing the grid killed the test. | ✅ PASS |
| All tests pass | FND-05 | `npm test`/workspace tests complete with no failures | Operational assertion: required uncached gate exited 0; 14 passed, 0 failed, 0 skipped. | ✅ PASS |
| Shared imports | FND-03 | Importing `libs/shared` exposes `ArchitectureGraph`, `ComponentType`, and `Problem` | `libs/shared/src/index.test.ts:2-3,7-29` imports all three from `@sdq/shared`, constructs typed values, and asserts runtime-observable fields. | ✅ PASS |
| Invalid graph validation | FND-03 | `validateGraph()` returns descriptive errors for invalid graphs | `libs/shared/src/validation/validate-graph.test.ts:39-45,66-71,93-98,120-125` asserts exact code/message/field for empty, duplicate, missing-source, and missing-target graphs. | ✅ PASS |
| jsdom test hook | FND-06 | `window.__GAME_STATE__` exposes serializable canvas state | `client/src/test-hook.test.ts:11-16,32-34,40-41` asserts window identity, exact initial shape, JSON round-trip data, phase, and mode. | ✅ PASS |

**Acceptance status**: **5/6 PASS; FND-01 remains a discrimination gap**.

---

## FND Requirement Traceability

FND-04/07/08 appear only in the traceability table, so task-defined outcomes are used where available. FND-08 remains underspecified.

| Requirement | Evidence | Result |
| --- | --- | --- |
| FND-01 Monorepo scaffold | `client/src/dev-config.test.ts:8-21`; orchestration mutant survived | ❌ Needs fix |
| FND-02 Empty 3D canvas | `client/src/scene/canvas-renderer.test.ts:55-61`; grid mutant killed | ✅ Verified |
| FND-03 Shared types | `libs/shared/src/index.test.ts:2-29`; `libs/shared/src/validation/validate-graph.test.ts:39-125` | ✅ Verified |
| FND-04 Server health check | `server/src/routes/health.test.ts:12-16` asserts status 200 and exact `{ status: 'ok', version: '0.0.0' }` | ✅ Verified |
| FND-05 Vitest setup | Fresh uncached gate: 14/14 tests pass; all three lint targets pass | ✅ Verified |
| FND-06 Test hook | `client/src/test-hook.test.ts:11-41` | ✅ Verified |
| FND-07 GitHub Actions CI | `.github/workflows/ci.yml:20-27` defines install/lint/test. GitHub branch listing contains only `main`; local `feature/foundation` has no upstream, so no CI result exists for `60ecc53`. | ❌ Needs fix |
| FND-08 AGENTS.md + README | Both files exist, but the spec defines no precise required content beyond the requirement label. | ⚠️ Spec-precision gap |

---

## Discrimination Sensor

Mutations ran in detached `/tmp` worktree state and were discarded. The real implementation and tests were not mutated.

| Mutation | File:line | Behavior-level fault | Relevant test result | Killed? |
| --- | --- | --- | --- | --- |
| M1 | `package.json:10` | Replaced actual dev orchestration with `echo` while retaining every string asserted by `dev-config.test.ts` | `npx nx test client --skip-nx-cache`: 7 passed | ❌ Survived |
| M2 | `client/src/scene/canvas-renderer.ts:46` | Removed the grid from `scene.add(...)` | `npx nx test client --skip-nx-cache`: canvas assertion failed; 6 passed, 1 failed | ✅ Killed |

**Sensor depth**: lightweight, two targeted mutations  
**Result**: **1/2 killed — FAIL**

---

## Gate Check

- **Command**: `npx nx run-many -t lint test --skip-nx-cache`
- **Exit code**: `0`
- **Tests**: 14 passed, 0 failed, 0 skipped
  - shared: 6
  - client: 7
  - server: 1
- **Test files**: 6 passed
- **Lint**: shared, client, server all pass
- **Baseline on `main`**: 0 tests; delta: +14
- **Non-blocking warnings**: Nx 23 deprecates the configured ESLint/Vitest executors and `nxViteTsPaths`.

---

## Edge Cases and Coverage Integrity

- ✅ Empty graph exact error asserted.
- ✅ Duplicate node exact descriptive error asserted.
- ✅ Missing source and missing target exact errors asserted.
- ✅ Grid, isometric camera, and OrbitControls are behaviorally asserted.
- ✅ Shared package-boundary types are compile-time used and observable values are asserted.
- ✅ No skipped/disabled tests or test-count regression found.
- ❌ Dev orchestration test is source-text inspection and does not detect a command that never starts either service.
- ❌ No CI run exists for feature HEAD.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum/surgical implementation | ✅ |
| No obvious unrelated scope creep | ✅ |
| Matches active architecture decisions | ✅ |
| Spec-anchored outcomes match assertions | ⚠️ FND-01 does not assert runtime outcome |
| Per-layer coverage expectation met | ❌ Dev orchestration remains shallow |
| Every test maps to a requirement/task outcome | ✅ |
| Documented testing guidance followed | ❌ Surviving orchestration mutant violates spec-outcome testing guidance |

---

## Ranked Gaps

1. **Dev orchestration test is non-discriminating** — FND-01 — `client/src/dev-config.test.ts:8-21`; an `echo`-only `npm run dev` mutant survives all client tests.
2. **CI is not verifiable for feature HEAD** — FND-07 — GitHub exposes only `main`; no remote branch/run exists for `60ecc53`.
3. **Docs requirement is underspecified** — FND-08 — no precise acceptance criterion defines required README/AGENTS content.

---

## Summary

**Overall**: ❌ Not Ready

**Spec-anchored check**: 5/6 explicit ACs matched; 1 behavioral gap; 1 traceability-only spec-precision gap

**Gate**: 14 passed, 0 failed, 0 skipped; lint passed

**Sensor**: 1/2 mutants killed
**Next step**: Add a behavioral startup probe that fails when either service does not listen/respond, publish the feature branch so CI can run, and clarify FND-08's required outcome before re-verifying.
