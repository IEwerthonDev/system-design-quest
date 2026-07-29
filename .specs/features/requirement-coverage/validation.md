# Requirement Coverage Validation

**Date:** 2026-07-29  
**Spec:** `.specs/features/requirement-coverage/spec.md`  
**Diff range:** `109b02971330ed52b1ea250a64d4ab4bf2cbb8b5..d9e403ab43499c541c78808e3d176a58ec025a36`  
**Verifier:** independent sub-agent (author != verifier)  
**Verdict:** **FAIL**

The implementation discriminates correctly in the required behavior probes and the full uncached gate is green, but 4 of 22 acceptance/edge criteria lack conforming direct test evidence. Evidence-or-zero therefore requires a FAIL.

## Acceptance-Criterion Evidence

| ID | Acceptance criterion | Direct test evidence | Result |
| --- | --- | --- | --- |
| Diagram AC1 | Client -> app -> store write path is `covered` | `libs/shared/src/judge/requirement-coverage.test.ts:139` — `covers write and read requirements on a full shortener graph`; line 144 asserts the write requirement is exactly `covered` | PASS |
| Diagram AC2 | Read/redirect is `covered` with cache/CDN before store and `partial` without cache | `libs/shared/src/judge/requirement-coverage.test.ts:139` and `:149` — exact `covered` and `partial` assertions at lines 145 and 152 | PASS |
| Diagram AC3 | No client-reachable persistent store makes write/read `missing` | `libs/shared/src/judge/requirement-coverage.test.ts:156` — exact `missing` assertions at lines 161-162 | PASS |
| Diagram AC4 | Unclassifiable requirement is `partial` with not-verifiable explanation | `libs/shared/src/judge/requirement-coverage.test.ts:176` — exact status and explanation assertions at lines 182-183 | PASS |
| Diagram AC5 | Explanations honor `en` and `pt-BR` | `libs/shared/src/judge/requirement-coverage.test.ts:186` — locale-specific phrases asserted at lines 190-191 | PASS |
| NFR AC1 | Latency: on-path hit rate >=80 `covered`; off-path or low hit rate `partial`; absent `missing` | `libs/shared/src/judge/requirement-coverage.test.ts:196` proves high/low hit-rate outcomes; `:259` covers absent cache only through the empty-graph aggregate. **No test constructs an off-read-path cache/CDN and asserts `partial`.** | **FAIL** |
| NFR AC2 | Throughput: balancing + app replicas + cache `covered`; partial signals `partial`; none `missing` | `libs/shared/src/judge/requirement-coverage.test.ts:203` proves covered/partial; `:259` proves the no-signal shortener requirement is missing | PASS |
| NFR AC3 | Availability: all three redundant `covered`; at least one `partial`; none `missing` | `libs/shared/src/judge/requirement-coverage.test.ts:210` proves covered/partial; `:259` proves no-signal missing | PASS |
| NFR AC4 | Uniqueness: explicit partition key or code strategy `covered`; bare store `partial`; no store `missing`; default `partitioningStrategy` alone is not a signal | `libs/shared/src/judge/requirement-coverage.test.ts:219` proves partition-key, note, and bare-store outcomes; `:259` proves no-store missing. **No test supplies only the default `partitioningStrategy` and proves it does not cover uniqueness.** | **FAIL** |
| LLM AC1 | Worse LLM status downgrades graph status and supplies explanation | `server/src/judge/dual-judge.test.ts:137` — exact `missing` status and LLM explanation asserted at lines 159-165 | PASS |
| LLM AC2 | Better LLM status cannot upgrade graph status | `server/src/judge/dual-judge.test.ts:169` — graph remains exactly `missing` and LLM explanation is rejected at lines 194-195 | PASS |
| LLM AC3 | Case/accent/punctuation/whitespace variants match | `server/src/judge/dual-judge.test.ts:198` — drifted text causes the exact downgrade and explanation at lines 220-225 | PASS |
| LLM AC4 | Missing coverage arrays still yield one graph-derived entry per declaration | `server/src/judge/dual-judge.test.ts:278` — omitted arrays produce the declared requirement with exact graph-derived `covered` status at lines 298-303 | PASS |
| Feedback AC1 | Strings become complete `FeedbackItem`s with no severity | `server/src/judge/dual-judge.test.ts:308` — exact object equality and `severity === undefined` at lines 311-320 | PASS |
| Feedback AC2 | Partial objects default missing string fields to `''`; valid severity/components survive | `server/src/judge/dual-judge.test.ts:322` preserves valid fields and checks several defaults, but lines 337-339 explicitly expect a missing `title` to be copied from `explanation`, not defaulted to `''` as specified. The implementation follows that contradictory assertion. | **FAIL** |
| Feedback AC3 | Null/number/non-object items are dropped | `server/src/judge/dual-judge.test.ts:343` — mixed invalid list is asserted exactly empty | PASS |
| Feedback AC4 | Coerced string critical issue cannot become an AD-016 blocker | `server/src/judge/dual-judge.test.ts:348` — live-shaped strings retain PASS at line 364 while the issue remains present | PASS |
| Edge 1 | Empty graph makes all six suggested requirements `missing` without crashing | `libs/shared/src/judge/requirement-coverage.test.ts:259` — exact six-element `missing` array at lines 262-263 | PASS |
| Edge 2 | No declarations returns `[]` | `libs/shared/src/judge/requirement-coverage.test.ts:266` — exact empty-array assertion | PASS |
| Edge 3 | Duplicate text returns one entry per declaration | `libs/shared/src/judge/requirement-coverage.test.ts:270` — length 2 and both declaration types asserted at lines 276-277 | PASS |
| Edge 4 | Present but client-unreachable store does not cover write or read | `libs/shared/src/judge/requirement-coverage.test.ts:165` constructs a disconnected store but asserts only the write requirement at line 173. **There is no read/redirect assertion for this graph.** | **FAIL** |
| Edge 5 | No-client graph falls back to component presence | `libs/shared/src/judge/requirement-coverage.test.ts:280` — write and latency are exactly `covered` at lines 297-298 | PASS |

**Count:** 18 PASS, 4 FAIL (22 total).

## Gate Output

Command run exactly:

`npx nx run-many -t lint test --skip-nx-cache`

Exit code: `0`

Real summary lines:

```text
Test Files  18 passed (18)
     Tests  155 passed (155)

Test Files  68 passed (68)
     Tests  440 passed (440)

Test Files  25 passed (25)
     Tests  152 passed (152)

NX   Successfully ran targets lint, test for 3 projects
```

Project mapping:

- `shared`: 18 files, 155 tests passed
- `client`: 68 files, 440 tests passed
- `server`: 25 files, 152 tests passed
- Total: 111 files, 747 tests passed, 0 failed
- Lint: `shared` 0 errors / 55 warnings; `server` 0 errors / 34 warnings; `client` 0 errors / 224 warnings. Warnings are accepted by the verification instructions; there were no lint errors.

The client test stream also printed expected jsdom `HTMLCanvasElement.prototype.getContext` not-implemented diagnostics, but all 440 client tests passed and Nx exited successfully.

## Discrimination Sensors

A temporary `server/src/judge/__scratch.verify.test.ts` exercised the required production-shaped graphs, printed the observed values, passed, and was deleted immediately afterward.

```text
empty:
["missing","missing","missing","missing","missing","missing"]

full:
["covered","covered","covered","covered","covered","covered"]

full without cache:
["covered","partial","covered","missing","partial","partial"]

no-cache redirect: "partial"
no-cache latency: "missing"
LLM covered upgrade over empty-graph latency: "missing"
```

Results:

- Empty graph: all six `missing` — PASS.
- Full graph: none `missing`; all six observed `covered` — PASS.
- Cache removed: redirect degraded to `partial`, latency degraded to `missing` — PASS.
- LLM attempted `covered` over graph `missing`: final status stayed `missing` — PASS.

The engine is sensitive to graph changes; no required sensor returned a constant status.

## Findings and Risks

1. **AC evidence gaps:** off-path cache behavior, default-only `partitioningStrategy`, and disconnected-store read behavior have no direct assertions.
2. **Spec deviation in partial-object coercion:** Feedback AC2 says every missing string field defaults to `''`; the implementation/test synthesize a missing `title` from `explanation`. Either the code/test must change or the spec must explicitly authorize this title fallback.
3. **Reporting-only regression proof is incomplete:** existing `judgeStructuralOnly` and `judgeSubmission` tests assert representative new coverage values and legacy verdict behavior, but no direct comparison proves that adding declared requirements leaves score/verdict unchanged on both paths.
4. **No dead legacy coverage algorithm remains:** the old all-covered/all-missing implementation was removed. `structuralCoverage` remains a used thin wrapper, not dead code.
5. **API-surface risk:** `collectGraphFacts` and `normalizeRequirementText` are exported from `@sdq/shared` but have no production consumer in this repository; `collectGraphFacts` is used only by an implementation-facing test. These exports are not required by the spec.
6. **AD-016 blocker safety:** string coercion emits no `severity`, and the end-to-end judge test proves a string critical issue cannot flip a valid PASS. Valid object-provided `severity: 'blocker'` is intentionally preserved.
7. **Test-integrity flags:** `classifyRequirement` mapping tests (shared lines 116-135) and the `collectGraphFacts` bidirectional traversal test (lines 301-311) assert internal decomposition rather than user-visible acceptance outcomes. The latter is not claimed by this spec. Positive-only full/no-client tests would individually pass under an always-covered stub, but the empty/no-cache tests and the independent sensors kill that stub at suite level.

## Final Verdict

**FAIL — 18/22 criteria have conforming direct evidence; 4/22 do not.** The gate and all four required discrimination sensors pass, but evidence-or-zero forbids PASS until the four listed criterion gaps are resolved.
