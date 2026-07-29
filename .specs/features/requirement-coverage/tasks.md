# Requirement Coverage from Graph — Tasks

**Branch:** `feature/requirement-coverage`  
**Spec:** `.specs/features/requirement-coverage/spec.md`  
**Complexity:** Medium — Design inline (extends existing structural/judge modules)  
**AD:** AD-036

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `AGENTS.md` (tests derive from spec ACs; Vitest; deterministic; fast).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Shared coverage engine (`libs/shared/src/judge/requirement-coverage.ts`) | unit | All branches; 1:1 to RC-01/RC-02/RC-05 ACs; every listed edge case | `libs/shared/src/judge/*.test.ts` | `nx run shared:test` |
| Judge orchestration (`server/src/judge/dual-judge.ts`) | unit | RC-03 merge rules (downgrade, upgrade blocked, normalized match, empty) + structural path | `server/src/judge/*.test.ts` | `nx run server:test` |
| LLM partial normalization | unit | RC-04: string / partial object / invalid item / blocker safety | `server/src/judge/dual-judge.test.ts` | `nx run server:test` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After each task | `nx run shared:test` or `nx run server:test` |
| Full | Before PR / after last task | `nx run-many -t lint test` |

---

## Execution Plan

Single batch (5 tasks) — execute inline.

### T1: Spec + AD-036 + STATE

**Reqs:** RC-* bootstrap  
**Files:** `.specs/features/requirement-coverage/{spec,tasks}.md`, `.specs/STATE.md`  
**Done when:** spec + tasks committed, AD-036 recorded, Handoff points at this branch  
**Commit:** `docs(requirement-coverage): spec + AD-036 graph-derived coverage`

### T2: Coverage engine in shared (RC-01, RC-02, RC-05)

**Reqs:** RC-01, RC-02, RC-05  
**Files:** `libs/shared/src/judge/requirement-coverage.ts` (+ export in `libs/shared/src/index.ts`), `libs/shared/src/judge/requirement-coverage.test.ts`  
**Done when:**
- `classifyRequirement(text)` maps PT-BR/EN keywords → capability codes (accent/case-insensitive)
- `analyzeRequirementCoverage({ requirements, graph, locale })` returns one `ReqCoverageItem` per declared requirement
- write/read path, uniqueness, latency, throughput, availability checkers implemented per spec ACs
- unmatched requirement → `partial` with "not verifiable from graph" explanation
- edge cases: empty graph → all `missing`; no requirements → `[]`; duplicate text → one entry each; no client → presence fallback
- `nx run shared:test` green  
**Commit:** `feat(judge): derive requirement coverage from architecture graph`

### T3: Wire coverage into the judge (RC-03)

**Reqs:** RC-03  
**Files:** `server/src/judge/dual-judge.ts`, `server/src/judge/dual-judge.test.ts`  
**Done when:**
- `buildRequirementCoverage` uses the engine as base and merges LLM items matched by **normalized** text
- LLM may only downgrade status; upgrades ignored; explanation follows the winning status
- structural-only path (`structuralCoverage`) replaced by the same engine
- missing/empty LLM coverage still yields one entry per requirement
- `nx run server:test` green  
**Commit:** `feat(judge): graph-based coverage with downgrade-only LLM merge`

### T4: Coerce live-LLM feedback strings (RC-04)

**Reqs:** RC-04  
**Files:** `server/src/judge/dual-judge.ts`, `server/src/judge/dual-judge.test.ts`  
**Done when:**
- `normalizeJudgePartialResult` coerces string list items to `FeedbackItem` (`title` + `explanation`), fills partial objects, drops invalid entries
- coerced strings carry no `severity` → cannot flip AD-016 verdict to FAIL
- `nx run server:test` green  
**Commit:** `fix(judge): coerce live-LLM string feedback into FeedbackItem`

### T5: Full gate + STATE handoff

**Reqs:** all  
**Files:** `.specs/STATE.md`  
**Done when:** `nx run-many -t lint test` green; Handoff lists commits + next = Verify/PR  
**Commit:** `docs(STATE): requirement-coverage ready for verify`

---

## Requirement → Task Map

| ID | Tasks |
| -- | ----- |
| RC-01 | T2 |
| RC-02 | T2 |
| RC-03 | T3 |
| RC-04 | T4 |
| RC-05 | T2, T3 |

**Coverage:** 5 total, 5 mapped, 0 unmapped
