# Problem Library Validation

**Date**: 2026-07-27  
**Spec**: `.specs/features/problem-library/spec.md`  
**Diff range**: `f6d972a..a017456` (branch `feature/problem-library`, 9 commits)  
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `1411185` — Problem schema + JudgeRubric |
| T2   | ✅ Done | `dfda702` — easy tier (6 new) |
| T3   | ✅ Done | `755b742` — medium + hard tiers |
| T4   | ✅ Done | `f3186ba` — registry helpers + catalog tests |
| T5   | ✅ Done | `677ddbe` — progress storage |
| T6   | ✅ Done | `e51a211` — library UI |
| T7   | ✅ Done | `e15bcaf` — bootstrap routing |
| T8   | ✅ Done | `4a125bf` — judge rubric in prompts |
| Docs | ✅ Done | `a017456` — spec, design, tasks |

---

## Spec-Anchored Acceptance Criteria

### PLIB-01 — P1: Catálogo de 27 Problemas

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| WHEN `listProblems()` THEN exactly 27 problems | length === 27 | `libs/shared/src/problems/catalog.test.ts:67-68` — `expect(listProblems()).toHaveLength(27)` | ✅ PASS |
| WHEN counted by difficulty THEN 7 easy, 10 medium, 10 hard | `{ easy: 7, medium: 10, hard: 10 }` | `catalog.test.ts:71-72` — `expect(countByDifficulty()).toEqual({ easy: 7, medium: 10, hard: 10 })`; `:145-151` — `listProblemsByDifficulty` per tier | ✅ PASS |
| WHEN each problem inspected THEN full shape (id, title, difficulty, description, metrics, constraints, tags, suggestedRequirements ≥3 FR + ≥2 NFR, estimatedMinutes, rubric, orderInTrack) | All fields present and valid | `catalog.test.ts:100-104` — `assertProblemShape(problem)` loop; `:47-64` — description, constraints, tags, suggestions, estimatedMinutes, rubric; `:88-92` — `orderInTrack` sort order; `:75-80` — all launch ids present | ⚠️ `metrics`, `id`, `title`, `difficulty` not individually asserted in shape helper |
| WHEN `getProblem(id)` valid/invalid THEN definition or `undefined` | known id → Problem; unknown → undefined | `catalog.test.ts:106-108` — `expect(getProblem('does-not-exist')).toBeUndefined()` | ✅ PASS |
| WHEN only `url-shortener` THEN `isTutorial` true; others false/omitted | single tutorial | `catalog.test.ts:94-98` — `expect(tutorials).toHaveLength(1); expect(tutorials[0]?.id).toBe('url-shortener')` | ✅ PASS |
| Independent: easy filter includes `rate-limiter` and `pastebin` | both ids in easy tier | `catalog.test.ts:117-121` — `easy.some((p) => p.id === 'rate-limiter')`; `:11-18` + `:75-80` — `pastebin` in EXPECTED_EASY_IDS set check | ✅ PASS |

**PLIB-01 status**: ✅ Verified (1 optional shape-precision gap on `metrics` field)

---

### PLIB-02 — P1: Rubrica Oculta para Juiz

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| WHEN judge builds prompt THEN `Hidden rubric` section with expectedComponents, criticalPatterns, commonMistakes | rubric fields in prompt text | `server/src/judge/dual-judge.test.ts:47-59` — `toContain('Hidden rubric')`, `'cache_redis'`, `'Common mistakes'`, `'Token bucket'`, `'api_gateway'` | ✅ PASS |
| WHEN rubric absent (legacy) THEN prompt proceeds without rubric section | no rubric block | `server/src/judge/prompts.ts:32-43` — optional `problem.rubric ? [...] : []` | ❌ GAP — no test with rubric-less Problem |
| WHEN player sees briefing/canvas THEN rubric NOT exposed in UI | no rubric text in DOM | Implementation: `briefing-panel.ts` renders description/metrics/tags only; `problem-library.ts` renders title/tags/time — no rubric fields | ❌ GAP — no negative assertion in `briefing-panel.test.ts` or `problem-library.test.ts` |

**PLIB-02 status**: ⚠️ Verified with gaps (AC1 tested; AC2/AC3 implementation-only)

---

### PLIB-03 — P1: Tela de Biblioteca

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| WHEN experienced or library unlocked THEN library screen before game | `mountProblemLibrary` called, not phase nav | `client/src/bootstrap.test.ts:88-94` — experienced → library; `:110-124` — beginner + `libraryUnlocked` → library | ✅ PASS |
| WHEN library shown THEN title, level badge, tags, estimated Study time | card content | `client/src/ui/problem-library.test.ts:65-88` — 27 cards; easy filter shows Tutorial badge on url-shortener; hard filter 10 cards with netflix/ticketmaster | ⚠️ tags/time not text-asserted (rendered in `problem-library.ts:411-416`) |
| WHEN filter easy\|medium\|hard\|all THEN list updates client-side | filtered card count | `problem-library.test.ts:71-88` — hard → 10 cards; easy → 7 cards | ✅ PASS |
| WHEN `isRecommended` THEN badge "Recomendado" | badge text in card | `client/src/ui/problem-library.ts:389-393` — renders `'Recomendado'` | ❌ GAP — no test asserts badge text |
| WHEN problem selected THEN Study or Speedrun mode + session start | `onSelect({ problemId, mode })` | `problem-library.test.ts:101-113` — study click → `{ problemId: 'chat-system', mode: 'study' }`; speedrun button exists (`problem-library.ts:428-433`) | ⚠️ speedrun selection not tested |

**PLIB-03 status**: ⚠️ Verified with gaps (routing + filters solid; badge + speedrun untested)

---

### PLIB-04 — P2: Trilha e Progresso

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| WHEN library shown THEN per-tier counter (e.g. "2/7 Easy") | progress footer text | `client/src/ui/problem-library.test.ts:90-99` — `library-progress-easy` contains `'2/7'` | ✅ PASS |
| WHEN PARTIAL+ score ≥ 70 in Study THEN mark completed in localStorage | persisted completion | `client/src/storage/progress.test.ts:50-66` — `isQualifyingCompletion('PARTIAL', 70)` true; `recordCompletion` persists; `phase-navigation.ts:235-236` calls `recordCompletion` on result phase | ⚠️ result-phase wiring not integration-tested |
| WHEN completed THEN card shows visual indicator | "Concluído" badge | `problem-library.test.ts:124-130` — card text contains `'Concluído'` | ✅ PASS |
| WHEN Hard selected with zero Easy done THEN friendly non-blocking warning | warning banner visible | `problem-library.test.ts:115-122` — `library-warning` not hidden; text contains `'difícil'` | ✅ PASS |
| WHEN Speedrun Medium with < 2 Easy done THEN friendly non-blocking warning | warning banner | `problem-library.test.ts:41-46` — `shouldWarnSpeedrunMedium('speedrun', youtube, 1)` true; UI path in `problem-library.ts:355-358` | ⚠️ helper tested; UI banner for speedrun medium not tested |

**PLIB-04 status**: ⚠️ Verified with gaps (core progress + hard warning tested)

---

### PLIB-05 — P2: Avisos de Nível

Mapped to PLIB-04 AC4–AC5 (same warning helpers and `library-warning` banner).

| Criterion | Evidence | Result |
| --------- | -------- | ------ |
| Hard without Easy → warning | `problem-library.test.ts:115-122` | ✅ PASS |
| Speedrun Medium without 2 Easy → warning | `problem-library.test.ts:41-46` (helper); UI untested | ⚠️ partial |

**PLIB-05 status**: ⚠️ Verified with gaps

---

## Discrimination Sensor

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 | `libs/shared/src/problems/index.ts:27-29` | `listProblems()` returns 26 via `.slice(0, 26)` | ✅ Killed — `catalog.test.ts:68` (`expected length 27 but got 26`); also `:113`, `:150`; client `problem-library.test.ts:68` would fail (27 cards) |
| 2 | `server/src/judge/prompts.ts:32` | Rubric section replaced with empty `rubricLines: string[]` | ✅ Killed — `dual-judge.test.ts:49` (`toContain('Hidden rubric')` failed); `:57` (`'Token bucket'` failed) |

**Sensor depth**: 2 behavior-level mutations (catalog count + rubric stripping)  
**Result**: 2/2 killed — ✅ PASS

Mutations applied in scratch → tested → `git checkout` restored. Working tree clean.

---

## Gate Check

- **Gate command**: `npx nx run-many -t lint test`
- **Result**: ✅ 279 passed, 0 failed, 0 skipped
  - shared: 57 | server: 50 | client: 172
- **Lint**: 0 errors (warnings only, pre-existing patterns)
- **Baseline** (post ai-judge on `main`): 241 tests
- **Delta**: **+38** new tests

---

## Diff Range

```
f6d972a..a017456  (main..HEAD)
23 files changed, 3053 insertions(+), 15 deletions(-)
```

Commits: T1–T8 implementation + docs commit.

---

## Requirement Traceability

| Requirement | Status | Evidence summary |
| ----------- | ------ | ---------------- |
| PLIB-01 | ✅ Verified | 16 catalog tests; 27/7/10/10 counts; shape + tutorial + registry |
| PLIB-02 | ⚠️ Verified with gaps | Prompt rubric tested; legacy fallback + UI non-exposure untested |
| PLIB-03 | ⚠️ Verified with gaps | Bootstrap routing + filters tested; Recomendado + speedrun click untested |
| PLIB-04 | ⚠️ Verified with gaps | Progress storage + counters + completed badge; result-phase integration partial |
| PLIB-05 | ⚠️ Verified with gaps | Hard warning UI tested; speedrun-medium warning UI untested |

**Coverage:** 5 total — 1 fully verified, 4 verified with gaps; 0 blocking implementation gaps

---

## Summary

**Overall**: ✅ **PASS** (ready with optional test hardening)

**Spec-anchored check**: All 5 PLIB requirements implemented; 0 blocking ❌; 6 ⚠️ test-coverage gaps  
**Sensor**: 2/2 mutations killed  
**Gate**: 279 passed, 0 failed

**What works**: 27-problem catalog with tier files and registry helpers; hidden rubric in judge prompts; library UI with filters, progress counters, completed badges, and hard-tier warning; bootstrap routes experienced/unlocked users to library and beginners to URL Shortener; localStorage progress on PARTIAL+ ≥ 70.

**Recommended optional hardening** (non-blocking):

1. Assert `'Recomendado'` badge on a recommended card (`problem-library.test.ts`)
2. Assert speedrun button click invokes `onSelect` with `mode: 'speedrun'`
3. Assert speedrun-medium warning banner in UI (mirror hard-warning test)
4. Negative assertion: briefing/canvas DOM must not contain rubric component ids
5. Legacy rubric-less prompt test (optional — schema currently requires rubric on all 27 problems)
