# Problem Library — Tasks

**Spec:** `.specs/features/problem-library/spec.md`  
**Design:** `.specs/features/problem-library/design.md`  
**Branch:** `feature/problem-library`

---

## Test Coverage Matrix

| Code Layer | Required Test Type | Location Pattern | Run Command |
| ---------- | ------------------ | ---------------- | ----------- |
| Shared schema + registry | unit | `libs/shared/src/problems/**/*.test.ts` | `npx nx test shared` |
| Shared catalog (27 count) | unit | `libs/shared/src/problems/catalog.test.ts` | `npx nx test shared` |
| Server judge prompts | unit | `server/src/judge/dual-judge.test.ts` | `npx nx test server` |
| Client library UI | unit | `client/src/ui/problem-library.test.ts` | `npx nx test client` |
| Client progress | unit | `client/src/storage/progress.test.ts` | `npx nx test client` |
| Bootstrap routing | unit | `client/src/bootstrap.test.ts` | `npx nx test client` |

## Gate Check Commands

| Gate Level | When | Command |
| ---------- | ---- | ------- |
| Quick | After T1–T4 | `npx nx test shared` |
| Quick | After T5–T7 | `npx nx test shared server client` |
| Full | After T8 | `npx nx run-many -t lint test` |

---

## Task Order

```
T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8
```

---

### T1: Extend Problem schema + JudgeRubric

**Files:**
- Modify: `libs/shared/src/schema/problem.ts`
- Modify: `libs/shared/src/problems/url-shortener.ts`
- Modify: `libs/shared/src/index.ts`

**Req:** PLIB-01

- [ ] Add `JudgeRubric`, `estimatedMinutes`, `isRecommended` to Problem
- [ ] Update URL Shortener with rubric + estimatedMinutes
- [ ] Export new types
- [ ] Commit: `feat(shared): extend Problem schema with rubric and estimates`

---

### T2: Easy tier problems (6 new)

**Files:**
- Create: `libs/shared/src/problems/easy.ts`
- Modify: `libs/shared/src/problems/index.ts`

**Req:** PLIB-01

- [ ] rate-limiter, pastebin, unique-id-gen, distributed-cache, notification-system, key-value-store
- [ ] Each with full briefing, metrics, constraints, suggestions, rubric
- [ ] Commit: `feat(shared): add easy tier problem definitions`

---

### T3: Medium + Hard tier problems

**Files:**
- Create: `libs/shared/src/problems/medium.ts`
- Create: `libs/shared/src/problems/hard.ts`
- Modify: `libs/shared/src/problems/index.ts`

**Req:** PLIB-01

- [ ] 10 medium + 10 hard per PROBLEM-LIBRARY.md
- [ ] Commit: `feat(shared): add medium and hard tier problem definitions`

---

### T4: Registry helpers + catalog tests

**Files:**
- Create: `libs/shared/src/problems/registry.ts`
- Create: `libs/shared/src/problems/catalog.test.ts`
- Modify: `libs/shared/src/problems/index.ts`, `libs/shared/src/index.ts`

**Req:** PLIB-01

- [ ] `listProblemsByDifficulty`, `filterProblems`, `getRecommendedProblems`, `countByDifficulty`
- [ ] Tests: 27 total, 7/10/10 split, unique ids, all have rubric
- [ ] Commit: `feat(shared): problem registry helpers and catalog tests`

---

### T5: Progress storage

**Files:**
- Create: `client/src/storage/progress.ts`
- Create: `client/src/storage/progress.test.ts`
- Modify: `client/src/ui/result-panel.ts` (record on PARTIAL+)

**Req:** PLIB-04

- [ ] `recordCompletion`, `isProblemCompleted`, `countCompletedByDifficulty`
- [ ] Record when result shown with PARTIAL+ score ≥ 70
- [ ] Commit: `feat(client): local progress tracking for problem library`

---

### T6: Library UI

**Files:**
- Create: `client/src/ui/problem-library.ts`
- Create: `client/src/ui/problem-library.test.ts`

**Req:** PLIB-03, PLIB-05

- [ ] Filters, cards, recommended badge, progress counters, mode selection
- [ ] Hard/speedrun warnings (non-blocking)
- [ ] Commit: `feat(client): problem library selection screen`

---

### T7: Bootstrap + guided completion message

**Files:**
- Modify: `client/src/bootstrap.ts`
- Create: `client/src/bootstrap.test.ts`
- Modify: `client/src/guided/guided-mode.ts`
- Modify: `client/src/test-hook.ts` (library phase if needed)

**Req:** PLIB-03, edge cases

- [ ] Route experienced/unlocked users to library
- [ ] Beginners guided → URL Shortener
- [ ] Update tutorial completion copy
- [ ] Commit: `feat(client): wire library into bootstrap flow`

---

### T8: Judge rubric in prompts + full gate

**Files:**
- Modify: `server/src/judge/prompts.ts`
- Modify: `server/src/judge/dual-judge.test.ts`

**Req:** PLIB-02

- [ ] Include hidden rubric section in prompts
- [ ] Test prompt contains rubric fields for rate-limiter
- [ ] Gate: `npx nx run-many -t lint test`
- [ ] Commit: `feat(server): include hidden rubric in judge prompts`

---

## Execution Protocol

1 commit atômico por task. Verifier após T8.
