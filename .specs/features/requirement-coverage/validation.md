# Requirement Coverage Validation

**Date:** 2026-07-29  
**Spec:** `.specs/features/requirement-coverage/spec.md`  
**Diff range:** `109b02971330ed52b1ea250a64d4ab4bf2cbb8b5..54597eba13c03c5962c621786d13123d10a4f3da`  
**Re-verification fix diff:** `d9e403a..54597eb`  
**Verifier:** independent sub-agent (author != verifier)  
**Verdict:** **PASS**

All 22 numbered acceptance criteria and listed edge cases now have direct, spec-conforming test evidence. The uncached gate and all required graph-discrimination probes pass.

## Acceptance-Criterion Evidence

| ID | Acceptance criterion | Direct test evidence | Result |
| --- | --- | --- | --- |
| Diagram AC1 | Client -> app -> store write path is `covered` | `libs/shared/src/judge/requirement-coverage.test.ts:135` — exact write status `covered` at line 140 | PASS |
| Diagram AC2 | Read/redirect is `covered` with cache/CDN before store and `partial` without cache | `libs/shared/src/judge/requirement-coverage.test.ts:135` and `:145` — exact `covered`/`partial` assertions at lines 141 and 148 | PASS |
| Diagram AC3 | No client-reachable persistent store makes write/read `missing` | `libs/shared/src/judge/requirement-coverage.test.ts:152` — both exact `missing` assertions at lines 157-158 | PASS |
| Diagram AC4 | Unclassifiable requirement is `partial` with not-verifiable explanation | `libs/shared/src/judge/requirement-coverage.test.ts:173` — exact status and explanation assertions at lines 179-180 | PASS |
| Diagram AC5 | Explanations honor `en` and `pt-BR` | `libs/shared/src/judge/requirement-coverage.test.ts:183` — locale-specific phrases at lines 187-188 | PASS |
| NFR AC1 | Latency: on-path hit rate >=80 `covered`; off-path or low hit rate `partial`; absent `missing` | `libs/shared/src/judge/requirement-coverage.test.ts:193`, `:200`, and `:223` — exact high/low, off-path, and absent outcomes at lines 196-197, 219, and 226 | PASS |
| NFR AC2 | Throughput: balancing + app replicas + cache `covered`; partial signals `partial`; none `missing` | `libs/shared/src/judge/requirement-coverage.test.ts:229` proves covered/partial; empty-graph test at `:312` proves no-signal missing | PASS |
| NFR AC3 | Availability: all three redundant `covered`; at least one `partial`; none `missing` | `libs/shared/src/judge/requirement-coverage.test.ts:236` proves covered/partial; empty-graph test at `:312` proves no-signal missing | PASS |
| NFR AC4 | Uniqueness: partition key/note `covered`; bare/default-only store `partial`; no store `missing` | `libs/shared/src/judge/requirement-coverage.test.ts:245` — partition key, bare store, explicit default-only `partitioningStrategy`, and note assertions at lines 248-249, 265, 292, and 307; empty graph covers no store | PASS |
| LLM AC1 | Worse LLM status downgrades graph status and supplies explanation | `server/src/judge/dual-judge.test.ts:137` — exact status and explanation at lines 159-165 | PASS |
| LLM AC2 | Better LLM status cannot upgrade graph status | `server/src/judge/dual-judge.test.ts:169` — graph remains `missing` and LLM explanation is rejected at lines 194-195 | PASS |
| LLM AC3 | Case/accent/punctuation/whitespace variants match | `server/src/judge/dual-judge.test.ts:198` — exact normalized-match downgrade at lines 220-225 | PASS |
| LLM AC4 | Missing coverage arrays still yield one graph-derived entry per declaration | `server/src/judge/dual-judge.test.ts:278` — omitted arrays yield the declared `covered` entry at lines 298-303 | PASS |
| Feedback AC1 | Strings become complete `FeedbackItem`s with no severity | `server/src/judge/dual-judge.test.ts:308` — exact object and undefined severity at lines 311-320 | PASS |
| Feedback AC2 | Object defaults, title fallback, severity allowlist, and string-only related components | **Amended spec at `spec.md:109` explicitly authorizes missing-title -> explanation fallback.** `server/src/judge/dual-judge.test.ts:322` proves empty defaults, title fallback, valid severity, invalid severity rejection, and string-only related components at lines 329-340 | PASS |
| Feedback AC3 | Null/number/non-object items are dropped | `server/src/judge/dual-judge.test.ts:343` — exact empty result for mixed invalid input | PASS |
| Feedback AC4 | Coerced string critical issue cannot become an AD-016 blocker | `server/src/judge/dual-judge.test.ts:348` — live-shaped string issue remains present while verdict stays PASS at lines 364-368 | PASS |
| Edge 1 | Empty graph makes all six suggested requirements `missing` without crashing | `libs/shared/src/judge/requirement-coverage.test.ts:312` — exact six-element `missing` array at lines 315-316 | PASS |
| Edge 2 | No declarations returns `[]` | `libs/shared/src/judge/requirement-coverage.test.ts:319` — exact empty-array assertion | PASS |
| Edge 3 | Duplicate text returns one entry per declaration | `libs/shared/src/judge/requirement-coverage.test.ts:323` — length and declaration types at lines 329-330 | PASS |
| Edge 4 | Present but client-unreachable store covers neither write nor read | `libs/shared/src/judge/requirement-coverage.test.ts:161` — disconnected-store graph with exact write and redirect `missing` assertions at lines 169-170 | PASS |
| Edge 5 | No-client graph falls back to component presence | `libs/shared/src/judge/requirement-coverage.test.ts:333` — write and latency exactly `covered` at lines 350-351 | PASS |

**Count:** 22 PASS, 0 FAIL.

## Fix-Diff Integrity Review

`git diff d9e403a..HEAD` shows targeted additions rather than weakened assertions:

- Off-path and absent-cache tests construct materially distinct graphs and assert exact statuses; they are not tautologies.
- The default-only partitioning case omits `partitionKey`, uses a neutral store label, and asserts exact `partial`.
- The disconnected-store test retains the previous write assertion and adds the missing read assertion.
- Feedback AC2 was amended explicitly; test and implementation now match the spec as written.
- The reporting-only regression test compares score and verdict with versus without requirements on both structural-only and LLM paths.
- `collectGraphFacts` and `normalizeRequirementText` are module-private and no longer part of `@sdq/shared`.
- The bidirectional-edge test now asserts the public coverage outcome, not an internal fact.

No reviewed test was weakened or made tautological.

## Gate Output

Command:

`npx nx run-many -t lint test --skip-nx-cache`

Exit code: `0`

Real per-project summary lines:

```text
shared:
 Test Files  18 passed (18)
      Tests  157 passed (157)

client:
 Test Files  68 passed (68)
      Tests  440 passed (440)

server:
 Test Files  25 passed (25)
      Tests  153 passed (153)

NX   Successfully ran targets lint, test for 3 projects
```

- Total: 111 test files, 750 tests passed, 0 failed.
- Lint: `shared` 0 errors / 59 warnings; `server` 0 errors / 34 warnings; `client` 0 errors / 224 warnings.
- The four additional shared warnings versus the previous run are non-null-assertion warnings in the new tests. They are non-blocking under the repository's current lint configuration, but are newly introduced rather than pre-existing.
- Client tests printed the existing jsdom canvas diagnostic; all 440 tests still passed.

## Discrimination Sensors

A temporary `server/src/judge/__scratch.verify.test.ts` was created, run, and deleted.

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

- Empty graph: all six `missing` — PASS.
- Full graph: none `missing`, with six `covered` — PASS.
- Cache removed: redirect `partial`, latency `missing` — PASS.
- LLM attempted upgrade: graph `missing` remained `missing` — PASS.

The engine remains graph-sensitive and downgrade-only.

## Remaining Findings and Risks

1. No acceptance-evidence gaps remain.
2. The amended Feedback AC2 is now precise and matches both implementation and tests; the report records that this was a post-verification spec amendment.
3. Score/verdict reporting-only behavior now has direct comparison evidence on both judge paths.
4. The two implementation helpers identified previously are private; no unnecessary shared exports remain.
5. Classification unit tests remain implementation-facing supplementary tests, but the acceptance suite and independent sensors exercise externally observable statuses and reject an always-covered engine.
6. No dead legacy all-covered/all-missing coverage implementation was found. `structuralCoverage` is a used wrapper.

## Final Verdict

**PASS — 22/22 criteria have direct, spec-conforming evidence; 0 FAIL.** The uncached gate passes 750 tests, and all four discrimination scenarios pass with graph-sensitive observed values.
