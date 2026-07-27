# Speedrun — Design

**Spec:** `.specs/features/speedrun/spec.md`  
**Branch:** `feature/speedrun`  
**Depends on:** `problem-library`, `ai-judge` merged em `main`

---

## Architecture

```
Client                          Server
──────                          ──────
session-store ──elapsedMs──►    leaderboard-service
timer-panel (UI)                ├── in-memory Map
nickname (localStorage)         └── optional JSON file
leaderboard-api ──HTTP──►       routes/leaderboard.ts
  POST /api/leaderboard
  GET  /api/leaderboard/:problemId
```

---

## Components

### Shared — `libs/shared/src/schema/leaderboard.ts`

```typescript
interface LeaderboardEntry {
  id: string;
  problemId: string;
  playerNickname: string;
  elapsedMs: number;
  score: number;
  verdict: 'PASS' | 'PARTIAL';
  createdAt: string; // ISO
}

interface LeaderboardSubmitInput {
  problemId: string;
  playerNickname: string;
  elapsedMs: number;
  score: number;
  verdict: Verdict;
}
```

- `isQualifyingForLeaderboard(verdict, score)` — reutiliza regra AD-016 (PASS/PARTIAL ≥70)

### Server — `server/src/leaderboard/`

- `LeaderboardStore` interface (add, listByProblem)
- `InMemoryLeaderboardStore` — default; sort ASC elapsedMs, tie-break score DESC
- `createLeaderboardService(store)`

### Server — `server/src/routes/leaderboard.ts`

- `POST /api/leaderboard` — validate body, qualify, persist
- `GET /api/leaderboard/:problemId?limit=50` — list

### Client — Timer

- `session-store`: `submittedAt?: number`, `getElapsedMs(now?)`, `markSubmitted(now?)`
- `timer-panel.ts`: fixed top bar, `data-testid="speedrun-timer"`, hidden in study

### Client — Nickname

- `storage/nickname.ts`: `loadNickname`, `saveNickname`, `generateDefaultNickname`, `isValidNickname`

### Client — Leaderboard UI

- `leaderboard-api.ts`: fetch GET/POST
- `leaderboard-panel.ts`: modal/list from problem library + result panel link
- `phase-navigation`: on speedrun result qualifying → POST leaderboard; show elapsed time

---

## Test Strategy

| Layer | Pattern | Hook |
| ----- | ------- | ---- |
| Shared qualify | unit | verdict boundaries |
| Server store + routes | unit | inject store, supertest-style inject |
| Client timer | unit | inject `now` |
| Client integration | unit | `__GAME_STATE__.elapsedMs` |

Clock: never `setTimeout` in tests — inject `now: () => number`.
