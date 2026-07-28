# Judge Realism Validation

**Date**: 2026-07-28  
**Spec**: `.specs/features/judge-realism/spec.md`  
**Diff range**: `main...HEAD` (`d85eb13..32ba089`); docs from `8818ac1^..HEAD`  
**Verifier**: independent sub-agent (author ≠ verifier)  
**Branch**: `feature/judge-realism`

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | Schema + `scaleNarrative` + Core ids |
| T2 | ✅ Done | Baseline `evaluateStructuralRubric` |
| T3 | ✅ Done | Baseline 27/27 catalog |
| T4 | ✅ Done | shortener→zoom discrimination |
| T5 | ✅ Done | Structural-only HTTP/mock path |
| T6 | ✅ Done | Golden mock scoped to url-shortener |
| T7 | ✅ Done | Coverage decoupled from golden tiers |
| T8 | ✅ Done | Structural hard-gate over LLM |
| T9 | ✅ Done | Scale narrative PASS gate |
| T10 | ✅ Done | Structural + scale + Hard prompts |
| T11 | ✅ Done | Scale-critical config kinds + clamp |
| T12 | ✅ Done | Sim pressure for new configs |
| T13 | ✅ Done | Config popover fields |
| T14 | ✅ Done | Core Easy Deep rubrics |
| T15 | ✅ Done | Engine Deep antiPatterns/configRules |
| T16 | ✅ Done | Core Medium/Hard Deep + Hard ≥2 scale |
| T17 | ✅ Done | ≥3 discrimination pairs + Deep 13/13 |
| T18 | ✅ Done | Result panel `scaleNarrative` |
| T19 | ✅ Done | Judge bundle rebuild + full gate |

All T1–T19 marked done in `tasks.md`.

---

## Spec-Anchored Acceptance Criteria

### P1: Problem-Specific Structural Rubrics

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| JR-01: any library `problemId` → deterministic structural rubric | Per-problem must-haves / anti-patterns evaluated | `libs/shared/src/judge/evaluate-structural-rubric.test.ts:33` — `expect(report.codes).toContain('missing_component')`; catalog loop `catalog.test.ts:157-166` | ✅ PASS |
| JR-02: no LLM key / mock → no shortener golden for other problems | Non-shortener not mapped to golden tiers | `server/src/judge/handle-judge-request.test.ts:60-66` — `verdict === 'FAIL'`, `consensus` not matching shortener; `mock-llm-client.test.ts:125-133` — rejects non-shortener golden | ✅ PASS |
| JR-03: critical gap → blocker + AD-016 | Blocker severity; no PASS/PARTIAL | `evaluate-structural-rubric.test.ts:34-35` — blockers severity; `apply-verdict.test.ts:62-63` — `applyVerdictRules(80, [blocker]) === 'FAIL'` | ✅ PASS |
| JR-04: Baseline all 27 — ≥1 must-have + ≥1 scale line | 27 problems; scaleChecklistLines ≥1 | `catalog.test.ts:149-167` — `problems.toHaveLength(27)` + scale lines | ✅ PASS |
| JR-05: en / pt-BR structural messages + scale lines | Locale-specific strings | Scale: `catalog.test.ts:192-197`, `257-258`. pt-BR issues: `locale.test.ts:78` — `/^(Falta \|Sem )/`. **EN structural title `"Missing …"` not explicitly asserted** | ⚠️ Spec-precision gap |
| JR-30: Core Deep rubric schema | Deep fields on Core set | `catalog.test.ts:181-198`, `247-258` — Deep + antiPattern/configRule ≥1 | ✅ PASS |

### P1: Cross-Problem Discrimination Gate

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| JR-06: curated pairs → FAIL (not PASS/PARTIAL) | `verdict === 'FAIL'` | `discrimination.test.ts:31-33` — `assertFailsOnProblem` | ✅ PASS |
| JR-07: shortener-good as zoom → FAIL | FAIL + media/signaling gap | `discrimination.test.ts:56-68` — FAIL + `missing_component` + media/signaling/turn | ✅ PASS |
| JR-08: deterministic structural path | No live LLM | `discrimination.test.ts:38-39` + uses `evaluateStructuralRubric` only | ✅ PASS |
| JR-09: ≥3 pairs (Easy→Hard, Medium→Hard, shortener→zoom) | ≥3 pairs | `discrimination.test.ts:71-101` — zoom, youtube, stripe pairs | ✅ PASS |

### P1: Hybrid LLM Narrative with Hard Gates

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| JR-10: structural before / constrains LLM | Structural eval then merge | `dual-judge.test.ts:282-296` — stub PASS + blockers → FAIL (implies structural-first merge) | ✅ PASS |
| JR-11: blockers → not PASS/PARTIAL even if LLM says PASS | Final FAIL with blockers | `dual-judge.test.ts:294-296` | ✅ PASS |
| JR-12: no blockers + LLM OK → narrative fields | strengths / debate preserved | `dual-judge.test.ts:302-309`; prompts `dual-judge.test.ts:96-98` | ✅ PASS |
| JR-13: no LLM → bilingual configure note + structural result | Note + scale; no fake shortener debate | `dual-judge.test.ts:208-209`; `handle-judge-request.test.ts:64-66` | ✅ PASS |

### P1: Scale Narrative Bar

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| JR-14: LLM PASS requires non-empty scaleNarrative | Scale present on PASS path | `dual-judge.test.ts:309`, `339-346` | ✅ PASS |
| JR-15: empty scale after consensus → cannot PASS | `verdict !== 'PASS'`, score &lt; 80 | `dual-judge.test.ts:331-336` | ✅ PASS |
| JR-16: structural-only → fixed scale checklist | Non-empty scaleNarrative/checklist | `dual-judge.test.ts:208`; `evaluate-structural-rubric.test.ts:50-51`; Independent Test youtube upload/CDN **content** not asserted (length only) | ⚠️ Spec-precision gap (Independent Test wording) |
| JR-17: Hard Core ≥2 scale dimensions | ≥2 checklist lines | `evaluate-structural-rubric.test.ts:247-261`; `catalog.test.ts:226-234` | ✅ PASS |

### P2: Scale-Critical Configs

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| JR-18: paper-icon UI exposes expanded fields | CDN TTL, MQ, WS, LB controls | `blueprint-canvas.test.ts:587-613`, `617-680` | ✅ PASS |
| JR-19: config changes → sim pressure | Deterministic pressure delta | `evaluate-simulation.test.ts:60-62`, `163-200`, `203-260` | ✅ PASS |
| JR-20: configs in judge → blockers/penalties | hitRate-too-low changes outcome | `evaluate-structural-rubric.test.ts:175-180` | ✅ PASS |
| JR-21: non-critical MAY stay shallow | `defaultConfigForType` undefined for non-set | Soft MAY; `normalize-graph.ts:65` returns `undefined`; no dedicated negative UI test | ⚠️ Spec-precision gap (MAY) |
| JR-22: out-of-range clamped | Clamped bounds | `normalize-graph.test.ts:118-157` | ✅ PASS |

### P2: Rubric Packs

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| JR-23: Baseline 27/27 no golden reuse | 27 Baseline | `catalog.test.ts:148-168` | ✅ PASS |
| JR-24: Core Easy 7/7 Deep | 7 Easy Core Deep | `catalog.test.ts:171-199` | ✅ PASS |
| JR-25: Core Medium/Hard 6/6 Deep | 6 ids Deep; Hard ≥2 scale | `catalog.test.ts:202-235` | ✅ PASS |
| JR-26: pack discrimination + structural CI | Suite green | `discrimination.test.ts` + catalog Deep asserts | ✅ PASS |
| JR-27: epic = Baseline 27 + Deep 13 + suite | 27 + 13 | `catalog.test.ts:238-260` | ✅ PASS |

### P3: Hard-Problem Depth

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| JR-28: Hard structural anti-patterns | stripe idempotency / zoom SFU | `evaluate-structural-rubric.test.ts:232-245`, `213-229` | ✅ PASS |
| JR-29: Hard LLM trade-off prompt | consistency/durability/coordination | `dual-judge.test.ts:101-109` | ✅ PASS |

**Status**: ⚠️ Spec-precision gaps flagged (JR-05 EN title; JR-16 Independent Test content; JR-21 MAY) — no uncovered blocking ACs

---

## Discrimination Sensor

Scratch: `git worktree` at `/tmp/jr-verify-scratch-*` (discarded after). `node_modules` symlinked from primary tree.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 | `libs/shared/src/judge/evaluate-structural-rubric.ts` (~342–346) | Skip `missing_component` blockers (treat missing as strengths) | ✅ Killed — 6 failures in `evaluate-structural-rubric.test.ts` (+ related) |
| 2 | `server/src/judge/dual-judge.ts` `assertScaleNarrative` | Early-return disables empty-scale PASS demotion | ✅ Killed — `dual-judge.test.ts:334` `expect(verdict).not.toBe('PASS')` |
| 3 | `evaluate-structural-rubric.ts` | Fake full must-have coverage + disable Deep antiPatterns (shortener→zoom would PASS) | ✅ Killed — all 4 discrimination cases expected PASS≠PASS |

**Sensor depth**: lightweight (≥3)  
**Result**: 3/3 killed — PASS ✅

---

## Interactive UAT Results

Not performed (Verifier automated path; orchestrator may schedule UAT for result-panel/config popover if desired).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ |
| No scope creep | ✅ (27 Baseline + Core 13 Deep matches amended scope) |
| Matches patterns | ✅ |
| Spec-anchored outcome check | ⚠️ minor precision gaps above |
| Per-layer Coverage Expectation met | ✅ shared / server / client matrix layers present |
| Every test maps to a spec requirement — no unclaimed tests | ✅ JR-tagged / story-aligned |
| Documented guidelines followed: `AGENTS.md`, AD-010 (no live LLM in CI) | ✅ |

---

## Edge Cases

- [x] Empty graph → client local FAIL unchanged; structural still evaluates empty → blockers (`evaluate-structural-rubric.test.ts` empty graph)
- [x] Nodes without edges → structural still runs (discrimination fixtures use `edges: []`)
- [x] Absurd configs → sim pressure + judge `hitRate-too-low` covered
- [x] `JUDGE_USE_MOCK=true` → `shouldUseMock` tests; structural-only path
- [x] LLM malformed → `handle-judge-request.test.ts` 502 path retained
- [x] Locale mid-session → request locale drives structural/LLM strings (`locale.test.ts`)
- [x] Speedrun → same `judgeSubmission` path (no separate bypass found in diff)

---

## Gate Check

- **Gate command**: `npx nx run-many -t lint test` (fresh `--skip-nx-cache`)
- **Result**: Successfully ran lint + test for 3 projects; **0 failed**
  - shared: **115** passed
  - client: **408** passed
  - server: **137** passed
  - **Total: 660** passed
- **Lint**: 0 errors (warnings only; non-blocking)
- **Test count before feature (`main`)**: shared 85 · client 404 · server ~125 attempted (1 unrelated failure on main at verify time)
- **Test count after feature**: 115 + 408 + 137 = **660**
- **Delta**: ~**+46** net tests (shared +30, client +4, server +12)
- **Skipped tests**: none observed
- **Failures**: none on feature branch

---

## Fix Plans

None required for merge-blocking gaps. Optional polish (non-blocking):

### Optional 1: Assert EN structural titles (JR-05)

- **Root cause**: pt-BR `Falta` asserted; EN `Missing` only implemented, not tested
- **Fix task**: Add unit asserting `locale: 'en'` blocker title `/^Missing /` and pt-BR scale line language
- **Priority**: Minor

### Optional 2: youtube scale checklist content (Independent Test)

- **Root cause**: length asserted; upload/CDN phrasing not
- **Fix task**: `expect(scaleChecklistLines.join(' ')).toMatch(/upload|CDN/i)` for youtube structural-only
- **Priority**: Minor / Cosmetic

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| JR-01–04, JR-06–15, JR-17–20, JR-22–30 | Pending / Implementing | ✅ Verified |
| JR-05 | Pending | ⚠️ Verified with precision gap (EN title) |
| JR-16 | Pending | ⚠️ Verified (Independent Test content soft) |
| JR-21 | Pending | ⚠️ Verified (MAY; no negative UI assert) |

---

## Summary

**Overall**: ✅ Ready (minor spec-precision notes only)

**Spec-anchored check**: 27/30 ACs fully matched; 3 spec-precision gaps (non-blocking)  
**Sensor**: 3/3 mutations killed  
**Gate**: 660 passed, 0 failed  

**What works**: Canonical shortener→zoom FAIL; Baseline 27 + Deep Core 13; LLM cannot override blockers; empty scaleNarrative blocks PASS; scale-critical configs affect sim + judge; discrimination suite ≥3 pairs.

**Issues found**: None blocking. Optional EN title / youtube content asserts.

**Next steps**: Merge after optional polish if desired; update Handoff to Verified PASS; redeploy for live OpenRouter narrative (ops, out of verify scope).
