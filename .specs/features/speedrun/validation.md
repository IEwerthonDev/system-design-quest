# Speedrun Validation

**Date**: 2026-07-27
**Spec**: `.specs/features/speedrun/spec.md`
**Diff range**: `85836a8..91ff7b5` (`main..HEAD` on `feature/speedrun`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `6720cfc` — shared leaderboard types + qualify |
| T2   | ✅ Done | `7d41b10` — in-memory store + service |
| T3   | ✅ Done | `51b68e3` — leaderboard HTTP routes |
| T4   | ✅ Done | `3e022b9` — session timer + `__GAME_STATE__.elapsedMs` |
| T5   | ✅ Done | `401d643` — timer panel UI |
| T6   | ✅ Done | `e151d0c` — anonymous nickname storage |
| T7   | ✅ Done | `35a7990` — submit scores to leaderboard API |
| T8   | ✅ Done | `91ff7b5` — leaderboard panel in problem library |

---

## Spec-Anchored Acceptance Criteria

### P1: Modo Speedrun com Timer (SPD-01..03)

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| SPD-01 WHEN Study THEN hide timer | `panel.root.hidden === true` | `client/src/ui/timer-panel.test.ts:18-21` — `expect(panel.root.hidden).toBe(true)` | ✅ PASS |
| SPD-01 WHEN Study THEN do not register ranking time | Study mode must not POST leaderboard | — no test asserts study skips `submitLeaderboardScore` (impl guard at `phase-navigation.ts:261`) | ⚠️ Spec-precision gap |
| SPD-02 WHEN Speedrun session starts at briefing THEN start timer | Timer visible / elapsed advances from `createSession` | `client/src/ui/timer-panel.test.ts:24-31` — `expect(panel.root.hidden).toBe(false)`; `expect(panel.root.textContent).toBe('01:04')` | ✅ PASS |
| SPD-02 WHEN Speedrun submit THEN stop timer | `markSubmitted` freezes elapsed | `client/src/session/session-store.test.ts:102-110` — `markSubmitted(clock)` then `expect(getElapsedMs(session, clock)).toBe(60000)` | ✅ PASS |
| SPD-03 WHEN Speedrun submit THEN expose `elapsedMs` via `__GAME_STATE__` | `elapsedMs > 0` numeric | `client/src/session/session-store.test.ts:111` — `expect(window.__GAME_STATE__.elapsedMs).toBe(60000)` | ✅ PASS |
| SPD-03 WHEN Study THEN `elapsedMs` null/undefined | `elapsedMs === null` | `client/src/session/session-store.test.ts:114-115` — `expect(window.__GAME_STATE__.elapsedMs).toBeNull()`; also `client/src/test-hook.test.ts:21` | ✅ PASS |

### P1: Ranking por Problema (SPD-04..06)

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| SPD-04 WHEN GET `/api/leaderboard/:problemId` THEN ≤50 entries ASC by `elapsedMs` | Sorted ASC; length ≤ 50 | `server/src/leaderboard/store.test.ts:25-30` — `expect(list.map(...)).toEqual(['fast', 'slow'])`; `:41-46` — `expect(...listByProblem(..., 50)).toHaveLength(50)`; route list: `server/src/routes/leaderboard.test.ts:58-66` | ✅ PASS |
| SPD-05 WHEN POST PASS or PARTIAL (score ≥ 70) THEN persist | 201 + entry in GET | Domain: `libs/shared/src/schema/leaderboard.test.ts:9-14`; service: `server/src/leaderboard/service.test.ts:25-30`; HTTP: `server/src/routes/leaderboard.test.ts:53-66` — `expect(post.statusCode).toBe(201)` | ✅ PASS |
| SPD-05 WHEN POST FAIL or score < 70 THEN 422 and no persist | HTTP 422; empty list | FAIL HTTP: `server/src/routes/leaderboard.test.ts:85-92` — `expect(post.statusCode).toBe(422)`; `expect(list.entries).toHaveLength(0)`; score 69 domain: `libs/shared/src/schema/leaderboard.test.ts:17-18` — `expect(isQualifyingForLeaderboard('PARTIAL', 69)).toBe(false)` | ⚠️ Spec-precision gap (score < 70 not asserted at HTTP 422) |
| SPD-06 WHEN equal `elapsedMs` THEN tie-break score DESC | Higher score first | `server/src/leaderboard/store.test.ts:33-38` — `expect(list.map(...)).toEqual(['higher-score', 'lower-score'])` | ✅ PASS |
| SPD-04 AC5 WHEN persisted THEN include `problemId`, `playerNickname`, `elapsedMs`, `score`, `verdict`, `createdAt` | All six fields on response/store entry | Partial: `server/src/routes/leaderboard.test.ts:54-56` asserts `playerNickname` + `elapsedMs` only | ⚠️ Spec-precision gap |

### P2: Nickname Anônimo (SPD-07..08)

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| SPD-07 WHEN first speedrun THEN request or generate nickname | Valid default generated + stored | `client/src/storage/nickname.test.ts:44-47` — `expect(isValidNickname(nickname)).toBe(true)`; `expect(loadNickname(storage)).toBe(nickname)` | ✅ PASS |
| SPD-07 WHEN nickname saved THEN reuse on future submissions | Same nickname in subsequent POSTs | Storage round-trip: `client/src/storage/nickname.test.ts:39-41` — `expect(loadNickname(storage)).toBe('architect_42')`; **no test that submit payload includes reused nickname** | ⚠️ Spec-precision gap |
| SPD-08 WHEN invalid nickname (<3, >20, forbidden chars) THEN POST 400 | HTTP 400 | Short: `server/src/routes/leaderboard.test.ts:110` — `expect(post.statusCode).toBe(400)`; chars: `libs/shared/src/schema/leaderboard.test.ts:36-37`; **>20 length not asserted** | ⚠️ Spec-precision gap |

**Status**: ⚠️ Spec-precision gaps flagged (core SPD outcomes covered; 5 precision gaps)

---

## Discrimination Sensor

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 | `libs/shared/src/schema/leaderboard.ts:23` | Flipped `isQualifyingForLeaderboard` to `!((PASS\|\|PARTIAL) && score >= 70)` | ✅ Killed — 4 failures in `leaderboard.test.ts` (PASS 80, PARTIAL 70, PARTIAL 69, FAIL); `shared:test` exit 1 |

**Sensor depth**: lightweight (1 targeted behavior fault)
**Result**: 1/1 killed — PASS ✅
**Scratch**: mutation applied then discarded via `git checkout -- libs/shared/src/schema/leaderboard.ts` (working tree clean)

---

## Interactive UAT Results

Not performed (automated Verifier pass only; orchestrator may schedule UAT separately for timer/leaderboard UI).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ |
| No scope creep | ✅ |
| Matches patterns | ✅ |
| Spec-anchored outcome check | ⚠️ (see precision gaps) |
| Per-layer Coverage Expectation met | ✅ domain + routes + client unit |
| Every test maps to a spec requirement — no unclaimed tests | ✅ |
| Documented guidelines followed: `AGENTS.md`, `.specs/features/speedrun/tasks.md` | ✅ |

---

## Edge Cases

- [x] Empty canvas / local FAIL → no leaderboard POST: `client/src/leaderboard/leaderboard-api.test.ts:10-23` — `expect(fetchFn).not.toHaveBeenCalled()`
- [ ] Duplicate nickname+problem+time accepted: **NOT tested**
- [ ] Unknown `problemId` → GET/POST 400: parse rejects (`leaderboard.test.ts:20-28` `parsed.ok === false`) but **HTTP 400 not asserted**

---

## Gate Check

- **Gate command**: `npx nx run-many -t lint test`
- **Result**: exit code **0** — Successfully ran targets lint, test for 3 projects
- **Per-project tests**: shared 65 passed; client 186 passed; server 62 passed (cached)
- **Lint**: 0 errors (server: 6 pre-existing warnings in judge files, unrelated)
- **Test count before feature**: not recorded in this session
- **Test count after feature**: ~313 across 3 projects (shared 65 + client 186 + server 62)
- **Skipped tests**: none observed
- **Failures**: none

---

## Fix Plans (if issues found)

### Fix 1: Study mode must not POST leaderboard (SPD-01)

- **Root cause**: No assertion covering `mode !== 'speedrun'` skip path
- **Fix task**: Add phase-navigation (or submit) test: Study + qualifying verdict → `submitLeaderboardScore` not called
- **Priority**: Minor

### Fix 2: Assert full entry fields + score < 70 → 422 (SPD-04/05)

- **Root cause**: Route tests only assert nickname/elapsedMs; PARTIAL score 69 not injected at HTTP
- **Fix task**: Extend `leaderboard.test.ts` POST response field asserts; add PARTIAL score 69 → 422
- **Priority**: Minor

### Fix 3: Nickname >20 + POST includes saved nickname (SPD-07/08)

- **Root cause**: `isValidNickname` >20 and submit wiring untested
- **Fix task**: Unit assert `isValidNickname('x'.repeat(21)) === false`; integration: save nickname → submit body includes it
- **Priority**: Minor

### Fix 4: Edge cases (duplicate accept, unknown problemId HTTP 400)

- **Priority**: Cosmetic / Minor

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| SPD-01 | Pending | ⚠️ Verified (timer hide); ranking-skip untested |
| SPD-02 | Pending | ✅ Verified |
| SPD-03 | Pending | ✅ Verified |
| SPD-04 | Pending | ⚠️ Verified (sort/cap); full field assert incomplete |
| SPD-05 | Pending | ⚠️ Verified (FAIL 422 + domain qualify); score<70 HTTP incomplete |
| SPD-06 | Pending | ✅ Verified |
| SPD-07 | Pending | ⚠️ Verified (persist/generate); POST reuse untested |
| SPD-08 | Pending | ⚠️ Verified (<3 + chars + HTTP 400); >20 untested |

---

## Summary

**Overall**: ⚠️ Issues (Ready for merge after optional minor test hardening — no blocking functional gaps found)

**Spec-anchored check**: 8/8 SPD IDs have primary evidence; 5 spec-precision gaps
**Sensor**: 1/1 mutations killed
**Gate**: exit 0 — lint+test green (65+186+62 tests)

**What works**: Speedrun timer start/stop + `__GAME_STATE__.elapsedMs`; Study timer hidden; qualify rules AD-016; GET top-50 ASC + score tie-break; FAIL → 422; nickname generate/persist; invalid short nickname → 400; client FAIL guard skips POST; leaderboard panel from library.

**Issues found**: Study ranking-skip untested; score < 70 HTTP 422 untested; persisted entry fields partially asserted; nickname >20 and submit-body reuse untested; two edge cases untested.

**Next steps**: Optional Fix 1–3 to close precision gaps; interactive UAT for timer visibility + ranking panel; then merge after Verify PASS if gaps accepted as non-blocking.
