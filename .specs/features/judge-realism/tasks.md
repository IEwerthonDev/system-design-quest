# Judge Realism — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** One atomic commit per task; gate must pass before done; Verifier after last task (author ≠ verifier).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Spec:** `.specs/features/judge-realism/spec.md`  
**Design:** `.specs/features/judge-realism/design.md` (Approved — Approach A)  
**Context:** `.specs/features/judge-realism/context.md`  
**Branch:** `feature/judge-realism` (create at Execute start)  
**Status:** Approved — 2026-07-28 · Execute via sub-agent batches (user confirmed)

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `AGENTS.md` (WebGL not in Vitest; `__GAME_STATE__` / graph JSON; deterministic; gate = test runner; `npx nx run-many -t lint test`), AD-010, `.specs/features/ai-judge/tasks.md`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Structural rubric schema + Core ids | unit | JR-04, JR-30; catalog Baseline 27 / Deep 13 | `libs/shared/src/problems/**/*.test.ts`, `libs/shared/src/judge/**/*.test.ts` | `npx nx test shared` |
| `evaluateStructuralRubric` | unit | JR-01–03, JR-16–17; all listed discrimination pairs | `libs/shared/src/judge/evaluate-structural-rubric.test.ts` | `npx nx test shared` |
| Config normalize + simulation | unit | JR-18–22 config clamps + pressure changes | `libs/shared/src/schema/*.test.ts`, `libs/shared/src/simulation/*.test.ts` | `npx nx test shared` |
| Dual-judge / handleJudgeRequest | unit | JR-02, JR-10–15; structural-only; LLM cannot override; scale gate | `server/src/judge/**/*.test.ts` | `npx nx test server` |
| Discrimination suite | unit | JR-06–09 hard gate | `server/src/judge/discrimination.test.ts` and/or shared | `npx nx test shared` / `server` |
| Config popover + result panel | unit | JR-18 UI fields; scaleNarrative render | `client/src/blueprint/**/*.test.ts`, `client/src/ui/result-panel*.test.ts` | `npx nx test client` |
| Live OpenRouter | none | Manual after redeploy | — | manual |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick (shared) | After shared-only tasks | `npx nx test shared` |
| Quick (server) | After judge pipeline tasks | `npx nx test shared server` |
| Quick (client) | After UI tasks | `npx nx test client` |
| Full | End of phase / before merge | `npx nx run-many -t lint test` |
| Build | After `api/judge` rebuild | full gate + confirm bundle rebuild script used by repo |

---

## Execution Plan

```
Phase 1 (Foundation)     T1 → T2 → T3 → T4
Phase 2 (Structural HTTP) T5 → T6 → T7
Phase 3 (LLM hard gates)  T8 → T9 → T10
Phase 4 (Configs)         T11 → T12 → T13
Phase 5 (Core Deep)       T14 → T15 → T16 → T17
Phase 6 (UI + ship)       T18 → T19
```

**Batches at Execute (~7 tasks):** B1=P1+P2 · B2=P3+P4 · B3=P5+P6 — offer sub-agents if user wants.

**Marco testável:** shortener-good graph on `zoom-conference` → FAIL (no LLM); with stub LLM PASS + structural blocker → FAIL; missing `scaleNarrative` → not PASS.

---

## Task Breakdown

### T1: Schema — structural rubric + `scaleNarrative` + Core ids

**What:** Extend shared types and export `CORE_REALISM_IDS` / `isCoreRealismProblem`.  
**Where:** `libs/shared/src/schema/problem.ts`, `libs/shared/src/schema/judge.ts`, `libs/shared/src/problems/structural-depth.ts`, `libs/shared/src/index.ts`  
**Depends on:** None  
**Reuses:** Existing `JudgeRubric`, `JudgeResult`  
**Requirement:** JR-04, JR-14, JR-30  

**Done when:**

- [ ] `JudgeRubric` supports depth / antiPatterns / configRules / scaleChecklist
- [ ] `JudgeResult.scaleNarrative: string` required in type
- [ ] `CORE_REALISM_IDS` lists the 13 Core problems
- [ ] Exports updated; shared tests compile
- [ ] Commit: `feat(shared): structural rubric schema and scaleNarrative`

**Tests:** unit (type/catalog smoke)  
**Gate:** quick shared  

---

### T2: Baseline `evaluateStructuralRubric` engine

**What:** Implement deterministic Baseline evaluation (must-haves + scale lines + codes).  
**Where:** `libs/shared/src/judge/evaluate-structural-rubric.ts` (+ `.test.ts`)  
**Depends on:** T1  
**Reuses:** `normalizeGraph`, `getProblem` / problem objects, `FeedbackItem`  
**Requirement:** JR-01, JR-03, JR-16  

**Done when:**

- [ ] Missing must-have → blocker `missing_component`
- [ ] Emits `scaleChecklistLines` (≥1)
- [ ] Returns `StructuralReport` with `scoreHint` + `codes`
- [ ] Unit tests cover empty graph, missing component, happy must-haves
- [ ] Commit: `feat(shared): baseline structural rubric engine`

**Tests:** unit  
**Gate:** quick shared  

---

### T3: Baseline coverage for all 27 problems

**What:** Ensure every catalog problem yields Baseline structural eval (derive scale from metrics if checklist empty).  
**Where:** `libs/shared/src/problems/catalog.test.ts` (extend), engine helpers as needed  
**Depends on:** T2  
**Reuses:** problem catalog  
**Requirement:** JR-04, JR-23  

**Done when:**

- [ ] Catalog test: 27 ids each produce ≥1 must-have check and ≥1 scale line
- [ ] No problem throws in `evaluateStructuralRubric`
- [ ] Commit: `test(shared): baseline structural coverage for 27 problems`

**Tests:** unit  
**Gate:** quick shared  

---

### T4: Discrimination — url-shortener good → zoom FAIL

**What:** Hard-gate test for canonical mismatch using structural-only path.  
**Where:** `libs/shared/src/judge/discrimination.test.ts` (or server equivalent)  
**Depends on:** T2  
**Reuses:** `getGoldenGraph('good')` or url-shortener good fixture  
**Requirement:** JR-06, JR-07, JR-08  

**Done when:**

- [ ] Shortener-good graph judged as `zoom-conference` ⇒ not PASS and not PARTIAL
- [ ] Uses structural path only (no live LLM)
- [ ] Commit: `test(shared): discriminate url-shortener graph on zoom-conference`

**Tests:** unit  
**Gate:** quick shared  

---

### T5: Structural-only judge path (no key / mock)

**What:** `judgeSubmission` / `handleJudgeRequest` return structural-built `JudgeResult` when mock/no key — skip URL-shortener golden debate.  
**Where:** `server/src/judge/dual-judge.ts`, `handle-judge-request.ts` (+ tests)  
**Depends on:** T2, T1  
**Reuses:** `buildStructuralOnlyResult` (new), AD-016 `applyVerdictRules`  
**Requirement:** JR-02, JR-13  

**Done when:**

- [ ] `shouldUseMock` path does not apply shortener fixtures to other `problemId`s
- [ ] Result includes bilingual note about LLM for rich narrative
- [ ] `scaleNarrative` filled from checklist
- [ ] Tests: zoom + shortener graph → FAIL with structural codes
- [ ] Commit: `feat(server): structural-only judge when mock or no LLM key`

**Tests:** unit  
**Gate:** quick server  

---

### T6: Isolate golden mock to url-shortener tests

**What:** Stop production mock client from mapping arbitrary graphs to shortener tiers; keep fixtures for explicit unit tests.  
**Where:** `server/src/judge/mock-llm-client.ts` (+ `.test.ts`), callers  
**Depends on:** T5  
**Reuses:** `url-shortener-responses.ts` for shortener-only tests  
**Requirement:** JR-02  

**Done when:**

- [ ] `createMockLlmClient` either unused on HTTP mock path or refuses non-shortener golden mapping
- [ ] Existing shortener golden unit tests still pass via explicit fixtures
- [ ] Commit: `fix(server): isolate URL-shortener golden mock from other problems`

**Tests:** unit  
**Gate:** quick server  

---

### T7: Requirement coverage without cross-problem golden tiers

**What:** Remove / replace `resolveGraphTier` defaults in `buildRequirementCoverage` for non-fixture paths.  
**Where:** `server/src/judge/dual-judge.ts` (+ tests)  
**Depends on:** T5  
**Reuses:** structural codes / LLM coverage  
**Requirement:** JR-02  

**Done when:**

- [ ] Coverage defaults no longer depend on shortener golden tier for arbitrary problems
- [ ] Tests updated; no regressions on declared-req merging
- [ ] Commit: `fix(server): decouple requirement coverage from shortener golden tiers`

**Tests:** unit  
**Gate:** quick server  

---

### T8: Structural hard-gate merge over LLM consensus

**What:** When live LLM runs, inject structural blockers; LLM cannot produce PASS/PARTIAL if blockers exist.  
**Where:** `server/src/judge/dual-judge.ts` (+ tests with stub LLM)  
**Depends on:** T5  
**Reuses:** `mergeConsensus`, `applyVerdictRules`  
**Requirement:** JR-10, JR-11, JR-12  

**Done when:**

- [ ] Stub LLM returns PASS-shaped partials + structural blockers ⇒ final FAIL
- [ ] No blockers ⇒ LLM narrative fields preserved
- [ ] Commit: `feat(server): structural hard-gate over dual-LLM consensus`

**Tests:** unit  
**Gate:** quick server  

---

### T9: Scale narrative PASS gate

**What:** Post-check: empty `scaleNarrative` on LLM path ⇒ cannot PASS.  
**Where:** `server/src/judge/dual-judge.ts` or `assert-scale-narrative.ts` (+ tests)  
**Depends on:** T8, T1  
**Reuses:** AD-016  
**Requirement:** JR-14, JR-15  

**Done when:**

- [ ] LLM consensus with score≥80, no blockers, empty scale ⇒ not PASS
- [ ] Non-empty scale allows PASS when AD-016 otherwise met
- [ ] Commit: `feat(server): block PASS without scale narrative`

**Tests:** unit  
**Gate:** quick server  

---

### T10: Prompts — structural context + scale mandate (+ Hard trade-offs)

**What:** Inject `StructuralReport` summary and scale instructions into rigorous/pragmatic prompts; Core Hard trade-off cue.  
**Where:** `server/src/judge/prompts.ts` (+ tests if prompt builders unit-tested)  
**Depends on:** T8  
**Reuses:** existing prompt builders  
**Requirement:** JR-12, JR-29  

**Done when:**

- [ ] Prompts include must-have gaps / blockers from structural report
- [ ] Instruct model to populate scale analysis (QPS/storage/fan-out as relevant)
- [ ] Core Hard prompt mentions consistency/durability/coordination
- [ ] Commit: `feat(server): problem-structural and scale-aware judge prompts`

**Tests:** unit (string contains assertions)  
**Gate:** quick server  

---

### T11: Extend `ComponentConfig` + normalize clamps

**What:** Add CDN `ttlSeconds`, `mq`, `ws`, `lb` config kinds with defaults/clamps.  
**Where:** `libs/shared/src/schema/architecture-graph.ts`, `normalize-graph.ts` (+ tests)  
**Depends on:** None (can parallel after T1 conceptually; sequence after T10 for phase order)  
**Reuses:** existing cache/cdn/sql patterns  
**Requirement:** JR-21, JR-22, AD-028  

**Done when:**

- [ ] `defaultConfigForType` covers scale-critical types
- [ ] Out-of-range values clamped
- [ ] Commit: `feat(shared): scale-critical component config kinds`

**Tests:** unit  
**Gate:** quick shared  

---

### T12: Simulation consumes new configs

**What:** Wire TTL / MQ durability / WS fan-out / LB algorithm into pressure evaluation.  
**Where:** `libs/shared/src/simulation/evaluate-simulation.ts` (+ tests)  
**Depends on:** T11  
**Reuses:** existing hitRate/shard modifiers  
**Requirement:** JR-19  

**Done when:**

- [ ] Deterministic tests: low TTL / memory MQ / low fan-out increase pressure vs defaults
- [ ] Commit: `feat(shared): simulation pressure for scale-critical configs`

**Tests:** unit  
**Gate:** quick shared  

---

### T13: Config popover UI for new fields

**What:** Paper-icon popover exposes new knobs for mq/ws/lb/cdn TTL.  
**Where:** `client/src/blueprint/config-popover.ts` (+ tests)  
**Depends on:** T11  
**Reuses:** existing hitRate/shard UI patterns  
**Requirement:** JR-18  

**Done when:**

- [ ] Fields render per config kind; changes call `onConfigChange`
- [ ] Unit/DOM tests cover new controls
- [ ] Commit: `feat(client): config popover scale-critical fields`

**Tests:** unit  
**Gate:** quick client  

---

### T14: Core Easy Deep rubric data

**What:** Enrich all 7 Easy Core problems with antiPatterns / configRules / richer scaleChecklist.  
**Where:** `libs/shared/src/problems/easy.ts`, `url-shortener.ts`  
**Depends on:** T1, T2  
**Reuses:** existing `expectedComponents`  
**Requirement:** JR-24, JR-30  

**Done when:**

- [ ] Each Easy Core id has `structuralDepth: 'deep'` (or implied by Core set) + ≥1 antiPattern or configRule
- [ ] Catalog/Deep asserts pass for Easy
- [ ] Commit: `feat(shared): deep structural rubrics for Core Easy problems`

**Tests:** unit  
**Gate:** quick shared  

---

### T15: Engine applies Deep antiPatterns + configRules

**What:** Evaluate Deep fields in `evaluateStructuralRubric` (not only Baseline).  
**Where:** `libs/shared/src/judge/evaluate-structural-rubric.ts` (+ tests)  
**Depends on:** T14, T11  
**Reuses:** Baseline engine  
**Requirement:** JR-01, JR-20, JR-03  

**Done when:**

- [ ] Anti-pattern and configRule fixtures fire blockers/majors as designed
- [ ] hitRate-too-low on url-shortener changes structural outcome
- [ ] Commit: `feat(shared): deep anti-pattern and config rule evaluation`

**Tests:** unit  
**Gate:** quick shared  

---

### T16: Core Medium/Hard Deep rubrics

**What:** Deep data for chat, news-feed, youtube, zoom, ticketmaster, stripe; Hard ≥2 scale dims.  
**Where:** `libs/shared/src/problems/medium.ts`, `hard.ts`  
**Depends on:** T15  
**Reuses:** Deep schema  
**Requirement:** JR-25, JR-17, JR-28  

**Done when:**

- [ ] 6 Core Medium/Hard ids enriched; Hard scale ≥2 lines
- [ ] Stripe/zoom anti-patterns covered in tests
- [ ] Commit: `feat(shared): deep structural rubrics for Core Medium and Hard`

**Tests:** unit  
**Gate:** quick shared  

---

### T17: Remaining discrimination pairs + Deep catalog asserts

**What:** Add pairs shortener→youtube, chat-shaped→stripe; assert Deep 13/13.  
**Where:** discrimination tests + catalog tests  
**Depends on:** T16, T4  
**Reuses:** structural engine  
**Requirement:** JR-09, JR-26, JR-27  

**Done when:**

- [ ] ≥3 discrimination pairs green
- [ ] Catalog: Baseline 27 + Deep Core 13
- [ ] Commit: `test(shared): expand discrimination suite and Core Deep coverage`

**Tests:** unit  
**Gate:** quick shared  

---

### T18: Result panel shows `scaleNarrative`

**What:** UI section for scale narrative / checklist (EN/pt-BR).  
**Where:** `client/src/ui/result-panel.ts` (+ tests), locale strings if needed  
**Depends on:** T1, T5  
**Reuses:** layered result UI  
**Requirement:** JR-05, JR-16  

**Done when:**

- [ ] Scale block visible when `scaleNarrative` non-empty
- [ ] Tests assert content via DOM / `__GAME_STATE__` as per existing patterns
- [ ] Commit: `feat(client): show scale narrative on judge result panel`

**Tests:** unit  
**Gate:** quick client  

---

### T19: Rebuild serverless judge bundle + full gate

**What:** Rebuild `api/judge.js` from server sources; fix any broken golden-submission tests; full lint/test green.  
**Where:** `api/judge.js` (generated), package/Nx build scripts used by repo  
**Depends on:** T6–T10, T18  
**Reuses:** existing esbuild Hobby pipeline  
**Requirement:** JR-02, JR-27 (ship path)  

**Done when:**

- [ ] Bundle contains structural-first path
- [ ] `npx nx run-many -t lint test` passes
- [ ] Commit: `build(api): rebuild judge bundle for structural-first pipeline`

**Tests:** full suite  
**Gate:** full  

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

P1: T1 → T2 → T3 → T4
P2: T5 → T6 → T7
P3: T8 → T9 → T10
P4: T11 → T12 → T13
P5: T14 → T15 → T16 → T17
P6: T18 → T19
```

---

## Validation (pre-approval)

### Check 1: Granularity

| Task | Atomic? | Notes |
| ---- | ------- | ----- |
| T1–T19 | ✅ | One deliverable each (schema / engine / path / UI / pack) |

### Check 2: Diagram ↔ Depends on

| Task | Depends on | Matches diagram? |
| ---- | ---------- | ---------------- |
| T1 | None | ✅ |
| T2 | T1 | ✅ |
| T3 | T2 | ✅ |
| T4 | T2 | ✅ |
| T5 | T2, T1 | ✅ |
| T6 | T5 | ✅ |
| T7 | T5 | ✅ |
| T8 | T5 | ✅ |
| T9 | T8, T1 | ✅ |
| T10 | T8 | ✅ |
| T11 | None* | ✅ (*phase-ordered after P3) |
| T12 | T11 | ✅ |
| T13 | T11 | ✅ |
| T14 | T1, T2 | ✅ |
| T15 | T14, T11 | ✅ |
| T16 | T15 | ✅ |
| T17 | T16, T4 | ✅ |
| T18 | T1, T5 | ✅ |
| T19 | T6–T10, T18 | ✅ |

### Check 3: Test co-location

| Task | Tests field | Matrix layer | OK? |
| ---- | ----------- | ------------ | --- |
| T1–T4, T11–T12, T14–T17 | unit shared | shared structural/sim | ✅ |
| T5–T10 | unit server | dual-judge/handle | ✅ |
| T13, T18 | unit client | popover/result | ✅ |
| T19 | full | lint+test | ✅ |

---

## Requirement traceability (tasks)

| IDs | Tasks |
| --- | ----- |
| JR-01–05, JR-16, JR-30 | T1–T3, T14–T16, T18 |
| JR-02, JR-13 | T5–T7, T19 |
| JR-06–09 | T4, T17 |
| JR-10–12, JR-29 | T8, T10 |
| JR-14–15 | T9 |
| JR-17–22 | T11–T13, T15–T16 |
| JR-23–28 | T3, T14–T17 |

**Coverage:** 30 JR ids mapped; 0 orphaned ⚠️ none

---

## Tools for Execute (confirm)

For each task, default tools:

| Tool | Use |
| ---- | --- |
| Skill `tlc-spec-driven` | Mandatory Execute protocol |
| Skills `ddia-systems` / `interview-system-designer` | Deep rubric wording (T14–T16) as needed |
| MCP filesystem / repo tools | Edits + tests |
| Shell | `npx nx test …`, full gate |
| Vercel / redeploy | **Out of task commits** unless you ask — env already set |

Reply **approve tasks** (optionally: sub-agents yes/no) to start Execute on `feature/judge-realism`.
