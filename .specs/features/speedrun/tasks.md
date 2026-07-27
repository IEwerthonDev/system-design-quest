# Speedrun — Tasks

**Spec:** `.specs/features/speedrun/spec.md`  
**Design:** `.specs/features/speedrun/design.md`  
**Branch:** `feature/speedrun`

---

## Test Coverage Matrix

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Shared leaderboard + qualify | unit | SPD-05 boundaries | `libs/shared/src/schema/leaderboard.test.ts` | `npx nx test shared` |
| Server store + routes | unit | SPD-04..06, POST 422/400 | `server/src/leaderboard/**/*.test.ts`, `server/src/routes/leaderboard.test.ts` | `npx nx test server` |
| Client timer + nickname + API | unit | SPD-01..03, SPD-07..08 | `client/src/session/*.test.ts`, `client/src/storage/nickname.test.ts`, `client/src/leaderboard/*.test.ts` | `npx nx test client` |

## Gate Check Commands

| Gate Level | When | Command |
| ---------- | ---- | ------- |
| Quick | T1–T3 | `npx nx test shared server` |
| Quick | T4–T7 | `npx nx test client` |
| Full | T8 + done | `npx nx run-many -t lint test` |

---

## Task Order

```
T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8
```

---

### T1: Shared leaderboard types + qualify helper

**Files:**
- Create: `libs/shared/src/schema/leaderboard.ts`
- Create: `libs/shared/src/schema/leaderboard.test.ts`
- Modify: `libs/shared/src/index.ts`

**Req:** SPD-05

- [ ] Export types + `isQualifyingForLeaderboard`
- [ ] Tests: PASS 80+, PARTIAL 70+, FAIL, score 69, blockers N/A (verdict already FAIL)
- [ ] Commit: `feat(shared): leaderboard types and qualify rules`

---

### T2: Server leaderboard store + service

**Files:**
- Create: `server/src/leaderboard/store.ts`
- Create: `server/src/leaderboard/store.test.ts`
- Create: `server/src/leaderboard/service.ts`
- Create: `server/src/leaderboard/service.test.ts`

**Req:** SPD-04, SPD-06

- [ ] Sort ASC elapsedMs, tie-break score DESC, cap 50
- [ ] Commit: `feat(server): in-memory leaderboard store and service`

---

### T3: Leaderboard HTTP routes

**Files:**
- Create: `server/src/routes/leaderboard.ts`
- Create: `server/src/routes/leaderboard.test.ts`
- Modify: `server/src/main.ts`

**Req:** SPD-04, SPD-05, SPD-08

- [ ] POST validate + 422 on non-qualifying
- [ ] GET by problemId
- [ ] Commit: `feat(server): leaderboard API routes`

---

### T4: Session timer (store + game state)

**Files:**
- Modify: `client/src/session/session-store.ts`
- Modify: `client/src/session/session-store.test.ts`
- Modify: `client/src/test-hook.ts`
- Modify: `client/src/test-hook.test.ts`

**Req:** SPD-02, SPD-03

- [ ] `getElapsedMs`, `markSubmitted`, `submittedAt`
- [ ] Expose `elapsedMs` on `__GAME_STATE__`
- [ ] Commit: `feat(client): speedrun timer in session store`

---

### T5: Timer panel UI

**Files:**
- Create: `client/src/ui/timer-panel.ts`
- Create: `client/src/ui/timer-panel.test.ts`
- Modify: `client/src/session/phase-navigation.ts`
- Modify: `client/src/session/phase-navigation.test.ts`

**Req:** SPD-01, SPD-02

- [ ] Visible speedrun only; hidden study
- [ ] Commit: `feat(client): speedrun timer panel UI`

---

### T6: Nickname storage

**Files:**
- Create: `client/src/storage/nickname.ts`
- Create: `client/src/storage/nickname.test.ts`

**Req:** SPD-07, SPD-08

- [ ] load/save/validate/generate default
- [ ] Commit: `feat(client): anonymous nickname storage`

---

### T7: Leaderboard API client + submit on result

**Files:**
- Create: `client/src/leaderboard/leaderboard-api.ts`
- Create: `client/src/leaderboard/leaderboard-api.test.ts`
- Modify: `client/src/session/phase-navigation.ts`
- Modify: `client/src/ui/submit-panel.ts` (markSubmitted on submit)
- Modify: `client/src/session/phase-navigation.test.ts`

**Req:** SPD-03, SPD-05

- [ ] POST on qualifying speedrun result only
- [ ] Commit: `feat(client): submit speedrun scores to leaderboard API`

---

### T8: Leaderboard panel UI + library entry

**Files:**
- Create: `client/src/ui/leaderboard-panel.ts`
- Create: `client/src/ui/leaderboard-panel.test.ts`
- Modify: `client/src/ui/problem-library.ts`
- Modify: `client/src/ui/problem-library.test.ts`

**Req:** SPD-04, SPD-07

- [ ] View ranking per problem from library
- [ ] Commit: `feat(client): leaderboard panel in problem library`

---

**Marco (T8):** Speedrun completo com timer, submit ranking, ver ranking na biblioteca; gate full verde.
