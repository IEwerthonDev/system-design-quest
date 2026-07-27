# Foundation Validation

**Date**: 2026-07-27  
**Spec**: `.specs/features/foundation/spec.md`  
**Diff range**: `main...68c035e56c40595d2291c70dc1eee480f36ab4ad` (merge base `e6ba41530db31604a2b052528e09fc8e2a39d5b9`; feature commits `c4d070f` through `68c035e`)  
**Verifier**: independent sub-agent (author ≠ verifier)  
**Verdict**: **FAIL**

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1 | ✅ Done | Nx workspace and root scripts are present. |
| T2 | ✅ Done | Shared graph types and validation are present. |
| T3 | ✅ Done | Fastify health route and integration test are present. |
| T4 | ⚠️ Partial verification | Renderer implementation is present, but there is no behavioral test for the grid, camera, or controls. |
| T5 | ✅ Done | `__GAME_STATE__` hook and jsdom tests are present. |
| T6 | ⚠️ Partial verification | Port/proxy configuration is present, but no automated startup assertion exists; runtime smoke check was inconclusive because port 3000 was already occupied. |
| T7 | ✅ Done | Fresh uncached lint/test gate passes. |
| T8 | ⚠️ Partial | Workflow and docs are present, but the feature HEAD is not on GitHub, so CI cannot be green for this commit. |

`tasks.md:181-182` also leaves GitHub CI and independent verification unchecked.

---

## Spec-Anchored Acceptance Criteria

Evidence-or-zero is applied below. Source implementation without an assertion is useful context, but does not count as behavioral coverage.

| Spec criterion | FND mapping | Spec-defined outcome | `file:line` + assertion expression | Result |
| --- | --- | --- | --- | --- |
| Dev clone/start | FND-01 | `npm install && npm run dev` starts client on 4200 and server on 3000 | `package.json:10` configures the command; `client/vite.config.ts:12-18` and `server/src/main.ts:4-15` configure ports. **No test assertion.** Runtime smoke check was inconclusive due to pre-existing `EADDRINUSE` on 3000. | ❌ GAP |
| Canvas load | FND-02 | Browser displays a 3D canvas with isometric grid and OrbitControls | `client/src/scene/canvas-renderer.ts:17-55` implements these behaviors. **No test assertion exists.** | ❌ GAP |
| All tests pass | FND-05 | `npm test` completes with every test passing | `package.json:12` — operational assertion `gateExitCode === 0`; fresh uncached run: 8 passed, 0 failed, 0 skipped | ✅ PASS |
| Shared imports | FND-03 | Importing `libs/shared` exposes `ArchitectureGraph`, `ComponentType`, and `Problem` | `libs/shared/src/index.ts:1-7` exports all three. **No package-boundary/type assertion imports and uses all three.** | ❌ GAP |
| Invalid graph validation | FND-03 | `validateGraph()` returns descriptive errors for invalid graphs | `libs/shared/src/validation/validate-graph.test.ts:39-45` — `expect(result.valid).toBe(false)` and exact empty-graph error; `:66-67` and `:89-90` assert invalidity/error codes only, not the duplicate/orphan descriptive messages | ❌ GAP |
| jsdom test hook | FND-06 | `window.__GAME_STATE__` exposes serializable canvas state | `client/src/test-hook.test.ts:11-16` — `expect(window.__GAME_STATE__).toBe(state)` and exact shape; `:32-34` — JSON round-trip plus node assertions | ✅ PASS |

**Acceptance status**: **2/6 PASS; 4/6 GAP**.

---

## FND Requirement Traceability

The spec gives behavioral ACs for FND-01/02/03/05/06. FND-04/07/08 appear only in the traceability table, so their expected outcomes are taken from `tasks.md`; FND-08 remains underspecified.

| Requirement | Evidence | Result |
| --- | --- | --- |
| FND-01 Monorepo scaffold | Root/project Nx configuration exists; no startup assertion | ❌ Needs fix |
| FND-02 Empty 3D canvas | Renderer source exists; no grid/camera/controls assertion | ❌ Needs fix |
| FND-03 Shared types | Exports exist; validation tests cover branches but not every descriptive message | ❌ Needs fix |
| FND-04 Server health check | `server/src/routes/health.test.ts:12-16` — `expect(response.statusCode).toBe(200)` and exact `{ status: 'ok', version: '0.0.0' }` | ✅ Verified |
| FND-05 Vitest setup | Mandatory gate and fresh uncached gate both exit 0 with 8/8 tests passing | ✅ Verified |
| FND-06 Test hook | `client/src/test-hook.test.ts:11-16,32-34` asserts exposure, shape, and serialization | ✅ Verified |
| FND-07 GitHub Actions CI | `.github/workflows/ci.yml:20-27` defines install/lint/test, but GitHub has no commit `68c035e`; no CI result exists for HEAD | ❌ Needs fix |
| FND-08 AGENTS.md + README | Both files exist, but the spec defines no precise behavioral/content outcome | ⚠️ Spec-precision gap |

---

## Discrimination Sensor

Mutations ran in a detached temporary worktree and were discarded. The real implementation was not modified.

| Mutation | File:line | Behavior-level fault | Relevant test result | Killed? |
| --- | --- | --- | --- | --- |
| M1 | `libs/shared/src/validation/validate-graph.ts:53` | Forced `valid: true` for every graph | `npx nx test shared --skip-nx-cache`: 3 failed, 1 passed | ✅ Killed |
| M2 | `server/src/routes/health.ts:8` | Changed health status from `ok` to `degraded` | `npx nx test server --skip-nx-cache`: 1 failed | ✅ Killed |

**Sensor depth**: lightweight, two targeted mutations  
**Result**: **2/2 killed — PASS**

---

## Gate Check

- **Required command**: `npx nx run-many -t lint test`
- **Required command exit code**: `0` (all six Nx targets restored from cache)
- **Fresh confirmation**: `npx nx run-many -t lint test --skip-nx-cache`
- **Fresh confirmation exit code**: `0`
- **Tests**: 8 passed, 0 failed, 0 skipped
  - shared: 4
  - client: 3
  - server: 1
- **Test files**: 3 passed
- **Baseline on `main`**: 0 test files/tests
- **Delta**: +3 test files, +8 tests
- **Lint**: shared, client, server all pass
- **Warnings**: Nx 23 deprecates the configured ESLint/Vitest executors and `nxViteTsPaths`; these are non-blocking for this feature.

---

## Edge Cases and Coverage Integrity

- ✅ Empty graph is rejected with an exact error object.
- ⚠️ Duplicate node ID is rejected, but the descriptive message/field is not asserted.
- ⚠️ Missing source node is rejected, but the descriptive message/field is not asserted.
- ❌ Missing target node has no dedicated test assertion.
- ❌ Canvas grid, isometric camera, OrbitControls, and lifecycle behavior have no tests despite the coverage matrix requiring canvas-renderer unit coverage.
- ❌ Dev orchestration and configured ports have no automated assertion.
- ❌ Shared public exports have no compile-time package-boundary test.
- ✅ No skipped/disabled tests were found.
- ✅ No test count regression was found.

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum/surgical implementation | ✅ |
| No obvious unrelated scope creep | ✅ |
| Matches repository patterns and active architecture decisions | ✅ |
| Tests map to requirements or task outcomes | ✅ |
| Spec-anchored asserted values match defined outcomes | ⚠️ Partial; descriptive validation output is under-asserted |
| Per-layer coverage expectation met | ❌ Canvas and orchestration coverage are absent; shared public exports are untested |
| Documented testing guidance followed | ❌ `AGENTS.md` requires spec-derived outcome assertions; four ACs have no complete evidence |

---

## Ranked Gaps

1. **Canvas behavior has zero behavioral test evidence** — FND-02 — no assertion for grid, isometric camera, OrbitControls, or lifecycle.
2. **Dev orchestration/ports have zero automated evidence** — FND-01 — configuration exists, but no test proves both services start on 4200/3000.
3. **Shared public API is not tested at its package boundary** — FND-03 — no assertion imports/uses `ArchitectureGraph`, `ComponentType`, and `Problem` together.
4. **Validation error descriptions are incompletely asserted** — FND-03 — duplicate/orphan tests check codes only; missing-target behavior is untested.
5. **CI is not verifiable for feature HEAD** — FND-07 — commit `68c035e` is absent from GitHub, so no run can be green for this diff.
6. **FND-08 has no precise acceptance criterion** — FND-08 — file presence is observable, required content is not specified.

---

## Summary

**Overall**: ❌ Not Ready  
**Spec-anchored check**: 2/6 ACs matched with complete evidence; 4 gaps; 1 additional traceability-only spec-precision gap  
**Gate**: 8 passed, 0 failed, 0 skipped; lint passed  
**Sensor**: 2/2 mutants killed  
**Next step**: Route the ranked gaps into fix tasks, then run independent verification again.
