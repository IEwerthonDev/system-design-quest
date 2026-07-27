# AI Judge — Tasks

**Spec:** `.specs/features/ai-judge/spec.md`  
**Design:** `.specs/features/ai-judge/design.md`  
**Branch:** `feature/ai-judge`  
**Depends on:** `mvp-canvas` merged em `main`

---

## Execution Protocol (MANDATORY)

Implementar com skill `tlc-spec-driven`: 1 commit atômico por task, gate antes de marcar done, Verifier após T10.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `AGENTS.md` (AD-010), `mvp-canvas/tasks.md`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Shared judge types + verdict rules | unit | 1:1 to JUDGE-03, AD-016 edge cases | `libs/shared/src/judge/**/*.test.ts` | `npx nx test shared` |
| Shared golden graphs | unit | 3 fixtures valid ArchitectureGraph | `libs/shared/src/judge/golden-graphs.test.ts` | `npx nx test shared` |
| Server dual-judge + route | unit (mock LLM) | JUDGE-01..04, golden submissions | `server/src/judge/**/*.test.ts`, `server/src/routes/judge.test.ts` | `npx nx test server` |
| Client judge-api + result UI | unit | JUDGE-05..07 via `__GAME_STATE__` | `client/src/judge/**/*.test.ts`, `client/src/ui/result-panel.test.ts` | `npx nx test client` |
| LLM real API | none | Manual only with `LLM_API_KEY` | — | manual |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After T1–T3 | `npx nx test shared server` |
| Quick | After T4–T7 | `npx nx test shared server client` |
| Full | After T10 + phase done | `npx nx run-many -t lint test` |

---

## Task Order

```
T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10
```

**Marco testável (T10):** Submeter URL Shortener com design ruim → FAIL com explicação; design bom → PASS/PARTIAL; CI verde sem API key.

---

### T1: Judge types in shared

**Files:**
- Create: `libs/shared/src/schema/judge.ts`
- Create: `libs/shared/src/judge/apply-verdict.ts`
- Create: `libs/shared/src/judge/apply-verdict.test.ts`
- Modify: `libs/shared/src/index.ts`

**Req:** JUDGE-10, JUDGE-03

- [x] Export `JudgeInput`, `JudgeResult`, `FeedbackItem`, `ReqCoverageItem`, `Verdict`
- [x] `applyVerdictRules`: PASS ≥80 zero blockers; PARTIAL ≥70 zero blockers; else FAIL
- [x] `isBlocker`: severity `blocker` on criticalIssues
- [x] Tests: all AD-016 boundary cases (79/80, 69/70, blocker overrides)
- [x] Commit: `feat(shared): judge types and AD-016 verdict rules`

---

### T2: Golden graph fixtures

**Files:**
- Create: `libs/shared/src/judge/golden-graphs.ts`
- Create: `libs/shared/src/judge/golden-graphs.test.ts`
- Modify: `libs/shared/src/index.ts`

**Req:** JUDGE-08

- [x] `good`: Client → LB → App → Cache → DB (URL Shortener pattern)
- [x] `medium`: Client → App → DB (no cache/LB)
- [x] `bad`: Client → DB only
- [x] All graphs pass `validateGraph`
- [x] Commit: `feat(shared): golden judge graph fixtures`

---

### T3: Mock LLM client + judge fixtures

**Files:**
- Create: `server/src/judge/mock-llm-client.ts`
- Create: `server/src/judge/fixtures/url-shortener-responses.ts`
- Create: `server/src/judge/mock-llm-client.test.ts`

**Req:** JUDGE-08

- [x] Mock returns deterministic `JudgePartialResult` per judge role + graph tier
- [x] Tier detection: match golden graph node sets or hash
- [x] `JUDGE_USE_MOCK=true` or missing `LLM_API_KEY` selects mock
- [x] Commit: `feat(server): mock LLM client with judge fixtures`

---

### T4: Dual-judge orchestration

**Files:**
- Create: `server/src/judge/dual-judge.ts`
- Create: `server/src/judge/dual-judge.test.ts`
- Create: `server/src/judge/prompts.ts` (rigorous + pragmatic templates)

**Req:** JUDGE-01, JUDGE-02, JUDGE-04

- [x] `judgeSubmission(input, client)` runs parallel judges → merge → `applyVerdictRules`
- [x] Loads problem via `getProblem(problemId)`
- [x] `requirementCoverage` populated from declared requirements
- [x] Tests with mock: good→PASS/PARTIAL≥70, bad→FAIL, medium→PARTIAL/FAIL
- [x] Commit: `feat(server): dual-judge orchestration`

---

### T5: POST /api/judge route + rate limit

**Files:**
- Create: `server/src/judge/rate-limit.ts`
- Create: `server/src/routes/judge.ts`
- Create: `server/src/routes/judge.test.ts`
- Create: `server/src/judge/llm-client.ts` (real client stub — used when API key present)
- Modify: `server/src/main.ts`

**Req:** JUDGE-01, JUDGE-09

- [x] `POST /api/judge` validates body, calls `judgeSubmission`
- [x] Rate limit 20/IP/hour when `NODE_ENV=production` only
- [x] 400 invalid input, 429 rate limit, 503 no key in prod
- [x] Register route in `buildApp`
- [x] Commit: `feat(server): judge API route with rate limiting`

---

### T6: Session store + test hook for judge result

**Files:**
- Modify: `client/src/session/session-store.ts`
- Modify: `client/src/test-hook.ts`
- Create: `client/src/session/judge-session.test.ts`

**Req:** JUDGE-05

- [x] `setJudgeResult(result)`, `getJudgeResult()`, `clearJudgeResult()`
- [x] `__GAME_STATE__.judgeResult`, `__GAME_STATE__.judgingStep`
- [x] Tests: set/get roundtrip, sync to game state
- [x] Commit: `feat(client): session judge result state`

---

### T7: Judge API client + progress overlay

**Files:**
- Create: `client/src/judge/judge-api.ts`
- Create: `client/src/judge/judging-progress.ts`
- Create: `client/src/judge/judge-api.test.ts`
- Create: `client/src/judge/judging-progress.test.ts`

**Req:** JUDGE-06

- [ ] `submitForJudging` with 60s timeout, progress steps, cached payload for retry
- [ ] Progress overlay: 4 steps (analisando → rigoroso → pragmático → consenso)
- [ ] Tests: mock fetch success, timeout error, 429 message, retry reuses payload
- [ ] Commit: `feat(client): judge API client and progress UI`

---

### T8: Result panel UI (layered feedback)

**Files:**
- Create: `client/src/ui/result-panel.ts`
- Create: `client/src/ui/result-panel.test.ts`

**Req:** JUDGE-05, JUDGE-07

- [ ] Verdict badge + score + summary + nextStep (always visible)
- [ ] Expandable "Detalhes técnicos": strengths, criticalIssues, improvements, debate, req coverage
- [ ] Toggle "Modo iniciante" (simple summary vs full jargon in collapsed view)
- [ ] `data-testid` hooks for all sections
- [ ] Commit: `feat(client): layered result panel UI`

---

### T9: Wire submit → judge → result phase

**Files:**
- Modify: `client/src/ui/submit-panel.ts`
- Modify: `client/src/session/phase-navigation.ts`
- Modify: `client/src/ui/submit-panel.test.ts`
- Modify: `client/src/session/phase-navigation.test.ts`

**Req:** JUDGE-01, JUDGE-05, JUDGE-06

- [ ] Remove placeholder overlay; on valid submit → show progress → call judge API
- [ ] On success: `setJudgeResult`, `advancePhase` to result, mount result panel
- [ ] On error: show retry button, stay on canvas
- [ ] Beginner toggle default from `session.experienceLevel === 'beginner'`
- [ ] Result phase: back to canvas preserves judgeResult
- [ ] Commit: `feat(client): wire submit to AI judge flow`

---

### T10: Golden submission integration tests

**Files:**
- Create: `server/src/judge/golden-submissions.test.ts`
- Modify: `client/src/session/phase-navigation.test.ts` (e2e-style with mocked fetch)

**Req:** JUDGE-08, all P1 stories

- [ ] Server: 3 golden graphs through full `judgeSubmission` → expected verdict bands
- [ ] Client: mocked `/api/judge` → result panel renders FAIL for bad graph
- [ ] Full gate: `npx nx run-many -t lint test`
- [ ] Commit: `test(ai-judge): golden submission integration tests`

---

## Requirement → Task Mapping

| Req ID | Tasks |
| ------ | ----- |
| JUDGE-01 | T4, T5, T9 |
| JUDGE-02 | T4 |
| JUDGE-03 | T1, T4 |
| JUDGE-04 | T4 |
| JUDGE-05 | T6, T8, T9 |
| JUDGE-06 | T7, T9 |
| JUDGE-07 | T8 |
| JUDGE-08 | T2, T3, T10 |
| JUDGE-09 | T5 |
| JUDGE-10 | T1 |

**Coverage:** 10/10 requirements mapped, 10 tasks

---

## Verifier Checklist (post-T10)

- [ ] Each AC in spec.md has test evidence
- [ ] Discrimination sensor: weaken verdict logic → tests fail
- [ ] `validation.md` written with PASS/FAIL
- [ ] No `LLM_API_KEY` required in CI
