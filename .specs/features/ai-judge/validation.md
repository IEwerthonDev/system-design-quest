# AI Judge Validation

**Date**: 2026-07-27
**Spec**: `.specs/features/ai-judge/spec.md`
**Diff range**: `37751bd..HEAD` (branch `feature/ai-judge`, T10 commit + uncommitted T11–T13 fixes)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `9ea026b` — judge types + AD-016 rules |
| T2   | ✅ Done | `b3ad330` — golden graph fixtures |
| T3   | ✅ Done | `be959bf` — mock LLM client |
| T4   | ✅ Done | `2a78a71` — dual-judge orchestration |
| T5   | ✅ Done | `faae3d9` — POST /api/judge + rate limit |
| T6   | ✅ Done | `78d9a17` — session judge result state |
| T7   | ✅ Done | `d755f9c` — judge API client + progress |
| T8   | ✅ Done | `3b4bfab` — layered result panel UI |
| T9   | ✅ Done | `2182957` — wire submit → judge → result |
| T10  | ✅ Done | `37751bd` — golden submission integration tests |
| T11  | ✅ Done | uncommitted — `parse-llm-json.ts` + route 502 on `LlmParseError` |
| T12  | ✅ Done | uncommitted — `dual-judge.test.ts` partial/missing status assertions |
| T13  | ✅ Done | uncommitted — `judge-api.test.ts` HTTP 500 `server_error` assertion |

---

## Spec-Anchored Acceptance Criteria

### P1: Endpoint de Julgamento

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| WHEN valid submit (≥1 node) THEN client POST `/api/judge` with `{ problemId, requirements, graph, mode }` | POST body matches `JudgeInput` JSON | `client/src/judge/judge-api.test.ts:81-85` — `expect(fetchFn).toHaveBeenCalledWith('/api/judge', expect.objectContaining({ method: 'POST', body: JSON.stringify(sampleInput) }))` | ✅ PASS |
| WHEN server receives request THEN orchestrate rigorous + pragmatic judges → consensus (AD-006) | `judgeDebate.rigorous` and `judgeDebate.pragmatic` populated from both judges | `server/src/judge/dual-judge.test.ts:97-98` — `expect(merged.judgeDebate.rigorous).toBe(rigorous.rationale); expect(merged.judgeDebate.pragmatic).toBe(pragmatic.rationale)` | ✅ PASS |
| WHEN judgment completes THEN return `JudgeResult` with all required fields | `verdict`, `score` 0–100, `strengths`, `criticalIssues`, `improvements`, `requirementCoverage`, `judgeDebate` | Domain: `server/src/judge/dual-judge.test.ts:108-111` — score/verdict/summary/nextStep; HTTP: `server/src/routes/judge.test.ts:65-68` — `body.verdict`, `body.score`, `body.summary`, `body.judgeDebate.consensus` only (strengths/criticalIssues/improvements/requirementCoverage not asserted at HTTP layer) | ⚠️ Spec-precision gap |
| WHEN score ≥ 80 and zero blocker criticalIssues THEN `verdict` = `PASS` (AD-016) | `applyVerdictRules(80, [])` → `'PASS'` | `libs/shared/src/judge/apply-verdict.test.ts:43` — `expect(applyVerdictRules(80, [])).toBe('PASS')` | ✅ PASS |
| WHEN score ≥ 70, zero blockers, below PASS threshold THEN `verdict` = `PARTIAL` | `applyVerdictRules(70, [])` → `'PARTIAL'`; `applyVerdictRules(79, [])` → `'PARTIAL'` | `libs/shared/src/judge/apply-verdict.test.ts:51,55` — `expect(applyVerdictRules(79, [])).toBe('PARTIAL'); expect(applyVerdictRules(70, [])).toBe('PARTIAL')` | ✅ PASS |
| WHEN score < 70 OR blocker criticalIssue THEN `verdict` = `FAIL` | `applyVerdictRules(69, [])` → `'FAIL'`; blocker at score 80 → `'FAIL'` | `libs/shared/src/judge/apply-verdict.test.ts:59,63` — `expect(applyVerdictRules(69, [])).toBe('FAIL'); expect(applyVerdictRules(80, [blockerIssue])).toBe('FAIL')` | ✅ PASS |
| WHEN graph has zero nodes THEN client local FAIL without API call | `validateLocalSubmit` fails; submit stays on canvas | `client/src/ui/submit-panel.test.ts:63-66` — `expect(validateLocalSubmit({ nodes: [], edges: [] })).toEqual({ success: false, error: EMPTY_GRAPH_MESSAGE })`; `:94-99` — `expect(result.success).toBe(false); expect(getSession()?.phase).toBe('canvas')` | ✅ PASS |

### P1: Cobertura de Requisitos Declarados

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| WHEN requirements declared THEN each item in `requirementCoverage` with status `covered` \| `partial` \| `missing` | One entry per declared FR/NFR with valid status enum | `server/src/judge/dual-judge.test.ts:60-67` — `expect(coverage).toHaveLength(3)`; `expect(coverage.every((item) => ['covered', 'partial', 'missing'].includes(item.status))).toBe(true)` | ✅ PASS |
| WHEN status `partial` or `missing` THEN item includes `explanation` referencing gaps | `explanation` non-empty for partial/missing items | `server/src/judge/dual-judge.test.ts:69-73` — `expect(coverage.some((item) => item.status === 'partial' && item.explanation.length > 0)).toBe(true)`; `expect(coverage.some((item) => item.status === 'missing' && item.explanation.length > 0)).toBe(true)` | ✅ PASS |
| WHEN zero requirements THEN `requirementCoverage` = `[]`, judgment proceeds | Empty array, no error | `server/src/judge/dual-judge.test.ts:84` — `expect(coverage).toEqual([])` | ✅ PASS |

### P1: UI de Resultado

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| WHEN judgment completes THEN display `PASS`/`PARTIAL`/`FAIL` verdict badge + numeric score | Badge label + score text | `client/src/ui/result-panel.test.ts:73-76` — `expect(...result-verdict-badge...).toBe(VERDICT_LABELS.PARTIAL); expect(...result-score...).toContain('75')` | ✅ PASS |
| WHEN result shown THEN list strengths, critical issues, improvements (title + explanation each) | Section content includes titles; explanations rendered | `client/src/ui/result-panel.test.ts:98-103` — titles asserted (`'Caminho em camadas'`, `'Sem cache'`) — **explanation body text not asserted for strengths/criticalIssues** | ⚠️ Spec-precision gap |
| WHEN improvements shown THEN each item has `howToImprove` and `whyItMatters` | "Como melhorar" and "Por quê" labels in DOM | `client/src/ui/result-panel.test.ts:107-112` — `toContain('Como melhorar: ...'); toContain('Por quê: ...')` | ✅ PASS |
| WHEN `requirementCoverage` non-empty THEN display coverage list | Requirement text in coverage section | `client/src/ui/result-panel.test.ts:114-115` — `toContain('Redirect HTTP 302')` | ✅ PASS |
| WHEN phase `result` THEN allow back to canvas to iterate | `goBackPhase` → canvas; graph + judgeResult preserved | `client/src/session/phase-navigation.test.ts:260-264` — `expect(getSession()?.phase).toBe('canvas'); expect(getGraph().nodes).toHaveLength(1); expect(getJudgeResult()?.score).toBe(75)` | ✅ PASS |

### P1: Estados de Loading e Erro

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| WHEN request in flight THEN loading with dual-judge step progress | Steps `analyzing` → `rigorous` → `pragmatic` → `consensus` | `client/src/judge/judge-api.test.ts:87-88` — `expect(progressSteps[0]).toBe('analyzing'); expect(progressSteps).toContain('consensus')`; `client/src/judge/judging-progress.test.ts:24-26` — all four `data-testid` steps with PT-BR labels | ✅ PASS |
| WHEN API returns 5xx or timeout (>60s) THEN PT-BR friendly message + "Tentar novamente" | Timeout: PT-BR message; 5xx: `server_error` + PT-BR message; retry button visible | `client/src/judge/judge-api.test.ts:108-111` — timeout `code: 'timeout'` + PT-BR message; `:132-136` — `code: 'server_error'`, message `'O servidor não conseguiu julgar sua arquitetura agora...'`; `client/src/judge/judging-progress.test.ts:64-70` — retry button invokes callback | ✅ PASS |
| WHEN player clicks retry THEN resubmit same payload without remounting graph | Second fetch body equals first cached payload | `client/src/judge/judge-api.test.ts:210-213` — `expect(JSON.parse(bodies[1]!)).toEqual(firstInput)`; `client/src/ui/submit-panel.test.ts:169-172` — retry calls `retryLastJudging` → `onJudgeSuccess` | ✅ PASS |
| WHEN API returns 429 THEN rate-limit message with estimated retry time | PT-BR message with retry duration | `client/src/judge/judge-api.test.ts:162-164` — `rejects.toEqual(new JudgeApiError(formatRateLimitMessage(1800), 'rate_limit', 1800))` | ✅ PASS |

### P2: Feedback em Camadas

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| WHEN result shown THEN summary (2–3 sentences) + suggested next step first | `summary` + `nextStep` visible in collapsed view | `client/src/ui/result-panel.test.ts:77-81` — summary and nextStep text asserted — **sentence count not validated** | ⚠️ Spec-precision gap |
| WHEN expand "Detalhes técnicos" THEN full sections including `judgeDebate` | strengths, issues, improvements, coverage, debate | `client/src/ui/result-panel.test.ts:96-124` — all sections including `result-debate-rigorous/pragmatic/consensus` | ✅ PASS |
| WHEN "Modo iniciante" active THEN simple summary; technical details on expand | Beginner: `result.summary`; advanced: `judgeDebate.consensus` | `client/src/ui/result-panel.test.ts:133-141` — `expect(...result-summary...).toBe(sampleResult.summary)` then after `setBeginnerMode(false)` → consensus | ✅ PASS |
| WHEN onboarding `experienceLevel === 'beginner'` THEN beginner toggle ON by default | Toggle checked on result mount | `client/src/session/phase-navigation.test.ts:284` — `expect(toggle?.checked).toBe(true)` | ✅ PASS |

### P2: Golden Test Submissions

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| WHEN CI runs THEN mock LLM fixtures, no external API | `shouldUseMock` true without key; pipeline uses `createMockLlmClient` | `server/src/judge/mock-llm-client.test.ts:32-34` — `expect(shouldUseMock({})).toBe(true)`; `server/src/judge/golden-submissions.test.ts:41` — `judgeSubmission(..., mockClient)` | ✅ PASS |
| WHEN "good" graph judged THEN `PASS` or `PARTIAL` with score ≥ 70 | verdict ∈ {PASS, PARTIAL}, score ≥ 70 | `server/src/judge/golden-submissions.test.ts:52-53` — `expect(result.score).toBeGreaterThanOrEqual(70); expect(['PASS','PARTIAL']).toContain(result.verdict)` | ✅ PASS |
| WHEN "bad" graph judged THEN `FAIL` | `verdict === 'FAIL'` | `server/src/judge/golden-submissions.test.ts:59` — `expect(result.verdict).toBe('FAIL')` | ✅ PASS |
| WHEN "medium" graph judged THEN `PARTIAL` or `FAIL` with cache/scale in `criticalIssues` | verdict band + cache/scale mention | `server/src/judge/golden-submissions.test.ts:66-74` — `expect(['PARTIAL','FAIL']).toContain(result.verdict); expect(mentionsCacheOrScale).toBe(true)` | ✅ PASS |

**Status**: ✅ All ACs covered — 0 ❌ GAP; 3 ⚠️ spec-precision gaps (optional polish)

---

## Discrimination Sensor

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 | `server/src/judge/parse-llm-json.ts:22-32` | Removed JSON repair path — throw `LlmParseError` immediately on first parse failure | ✅ Killed — `parse-llm-json.test.ts:9-14` failed (`repairs JSON wrapped in extra text`) |
| 2 | `server/src/routes/judge.ts:167` | Changed `reply.code(502)` → `reply.code(500)` for `LlmParseError` | ✅ Killed — `judge.test.ts:116` failed (`expected 500 to be 502`) |

**Sensor depth**: lightweight (2 behavior-level mutations on highest-risk new code)
**Result**: 2/2 killed — ✅ PASS

Mutations applied in scratch (copy → mutate → test → restore). Working tree unchanged by sensor.

---

## Interactive UAT Results

Not performed — automated verification sufficient per spec scope (unit + integration tests with mocked LLM).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ Focused judge module; T11 adds minimal `parseLlmJsonContent` helper |
| Surgical changes | ✅ New files under `libs/shared/src/judge`, `server/src/judge`, `client/src/judge` |
| No scope creep | ✅ URL Shortener only; defers problem library / leaderboard |
| Matches patterns | ✅ `__GAME_STATE__` hook, vitest, Fastify inject, manifest types |
| Spec-anchored outcome check | ✅ 24/27 matched; 3 optional precision gaps (see table) |
| Per-layer coverage expectation | ✅ Domain 1:1 for AD-016; routes cover happy + edge + error paths including 502; client covers 5xx |
| Every test maps to spec requirement | ✅ Scoped tests trace to JUDGE-01..10 / AC rows in matrix |
| Documented guidelines followed | ✅ `AGENTS.md` (deterministic tests, no wall-clock sleeps, `__GAME_STATE__` assertions) |

---

## Edge Cases

- [x] Empty canvas on submit → local FAIL without LLM — `submit-panel.test.ts:76-99`
- [x] API timeout >60s with retry — `judge-api.test.ts:92-116`, `submit-panel.test.ts:134-173`
- [x] Missing `LLM_API_KEY` → 503 — `server/src/routes/judge.test.ts:125-139`
- [x] **Malformed LLM JSON → repair 1x then 502** — `parse-llm-json.test.ts:9-22` (repair + `LlmParseError`); `llm-client.ts:53` uses `parseLlmJsonContent`; `judge.ts:166-170` returns 502 PT-BR; `judge.test.ts:100-122` asserts 502 + retry message
- [x] Offensive requirement text — no moderation (spec: process normally); no test required
- [x] Graph cycle — spec allows mention-only; no blocking behavior required

---

## Gate Check

- **Gate command**: `npx nx run-many -t lint test` (from `tasks.md`)
- **Result**: 241 passed, 0 failed, 0 skipped
- **Lint**: 0 errors, 5 warnings (`@typescript-eslint/no-non-null-assertion` in judge files)
- **Test count before feature** (`2005d1c`): shared 24 + server 1 + client 130 = **155**
- **Test count after T10** (`37751bd`): shared 41 + server 43 + client 151 = **235**
- **Test count after T11–T13** (working tree): shared 41 + server 48 + client 152 = **241**
- **Delta**: **+86** new tests from baseline (no decreases)
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans

No blocking fix tasks remain. Optional polish (Fix 4 from prior validation):

### Fix 4 (optional): Strengthen UI assertions for strength/critical issue explanations

- **Root cause**: `result-panel.test.ts` asserts titles only for strengths/criticalIssues sections.
- **Fix task**: Assert explanation body text appears in `result-strengths` and `result-critical-issues` DOM.
- **Priority**: Minor (P1 UI AC2 precision)

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| JUDGE-01 | ⚠️ Verified with gaps | ⚠️ Verified (HTTP field coverage precision gap only) |
| JUDGE-02 | ✅ Verified | ✅ Verified |
| JUDGE-03 | ✅ Verified | ✅ Verified |
| JUDGE-04 | ❌ Needs Fix | ✅ Verified |
| JUDGE-05 | ⚠️ Verified with gaps | ⚠️ Verified (explanation assertion precision gap) |
| JUDGE-06 | ⚠️ Verified with gaps | ✅ Verified |
| JUDGE-07 | ✅ Verified | ✅ Verified |
| JUDGE-08 | ✅ Verified | ✅ Verified |
| JUDGE-09 | ✅ Verified | ✅ Verified |
| JUDGE-10 | ✅ Verified | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 24/27 ACs matched spec outcome; 0 ❌ GAP; 3 ⚠️ spec-precision gaps (optional)
**Sensor**: 2/2 mutations killed
**Gate**: 241 passed, 0 failed

**What works**: AD-016 verdict rules; dual-judge pipeline with mock LLM and golden submissions; POST `/api/judge` with rate limit, 503, and **502 on malformed LLM JSON**; requirement coverage with **partial/missing status assertions**; client submit → progress → result flow with retry, 429, timeout, and **5xx server_error** handling; layered result panel with beginner mode default.

**Previous gaps closed (evidence)**:
1. **requirementCoverage partial/missing** — `dual-judge.test.ts:66-73` asserts valid enum + partial/missing with non-empty explanations
2. **client 5xx server_error** — `judge-api.test.ts:119-140` asserts HTTP 500 → `code: 'server_error'` + PT-BR message
3. **malformed LLM JSON 502** — `parse-llm-json.ts` repair + `LlmParseError`; route `judge.ts:166-170`; `judge.test.ts:100-122`

**Optional next steps**: Commit T11–T13 atomically; Fix 4 UI explanation assertions (minor); merge to `main` after commits.
