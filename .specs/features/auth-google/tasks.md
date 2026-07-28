# Google OAuth Tasks

**Spec**: `.specs/features/auth-google/spec.md`  
**Design**: `.specs/features/auth-google/design.md`  
**Branch**: `feature/auth-google`

---

## Test Coverage Matrix

> Guidelines: `AGENTS.md` (Vitest, `__GAME_STATE__`, no WebGL, tests from ACs).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Auth domain (cookie, user store, service) | unit | AUTH-01..05 ACs + edge races/state | `server/src/auth/*.test.ts` | `npx nx test server` |
| Vercel/Fastify auth + gated sessions/LB | unit | happy + 401/409/422 + nick override | `server/src/vercel/*.test.ts`, `server/src/routes/*.test.ts` | `npx nx test server` |
| Client auth API / speedrun gate | unit | credentials include; skip LB when guest | `client/src/auth/*.test.ts`, `leaderboard-api.test.ts`, `phase-navigation` tests | `npx nx test client` |
| Shared schema | unit | optional `userId` on session if added | `libs/shared/**/*.test.ts` | `npx nx test shared` |

## Gate Check Commands

| Gate Level | When | Command |
| ---------- | ---- | ------- |
| Quick | After unit task | `npx nx test server` or `npx nx test client` |
| Full | Phase end | `npx nx run-many -t lint test` |
| Build | Before merge | `npm run vercel-build` |

---

## Phase 1 — Auth domain

### T1: Env + jose + shared AuthUser types
- **Done when**: `.env.example` documents `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_SECRET`, `AUTH_BASE_URL`; `jose` installed; shared exports `AuthUser` / `AuthMeResponse`; shared tests pass
- **Commit**: `feat(auth): add jose and auth env/types`

### T2: Session cookie sign/verify
- **Done when**: `session-cookie.ts` tests cover sign, verify, reject tampered/expired, clear header
- **Commit**: `feat(auth): signed HTTP-only session cookie`

### T3: KV user + nick store
- **Done when**: upsert user, get by id, claim nick NX, conflict, get by nick — unit tests with mock KV
- **Commit**: `feat(auth): KV user and unique nickname store`

### T4: Auth service (Google + claim + merge)
- **Done when**: buildAuthUrl, callback (mock token), me, logout, claimNickname, mergeGuestSessions — AC-aligned tests; invalid state fails
- **Commit**: `feat(auth): Google OAuth service with nick claim and merge`

## Phase 2 — HTTP APIs

### T5: `/api/auth` Vercel handler + build
- **Done when**: `api-auth.ts` routes work in unit tests; `vercel-build.sh` + `vercel.json` rewrites; bundle produces `api/auth.js`
- **Commit**: `feat(auth): serverless /api/auth endpoints`

### T6: Gate sessions API by userId
- **Done when**: unauth PUT/list → 401; auth forces nick + userId; GET by id owner-only; tests pass
- **Commit**: `feat(auth): require session for durable sessions API`

### T7: Gate leaderboard POST + speedrun nick
- **Done when**: unauth POST → 401; auth overrides nickname from account; GET public; tests pass
- **Commit**: `feat(auth): require auth for leaderboard submit`

### T8: Fastify auth routes parity
- **Done when**: local Fastify registers same auth + gates; route tests pass
- **Commit**: `feat(auth): Fastify auth routes for local/dev`

## Phase 3 — Client + speedrun

### T9: Client auth API module
- **Done when**: fetchMe/logout/claim/merge with credentials; tests with fetch mock
- **Commit**: `feat(auth): client auth API with credentials`

### T10: Auth UI (login, logout, nick claim, merge prompt)
- **Done when**: library header controls + modals; bilingual strings; unit/DOM tests
- **Commit**: `feat(auth): sign-in UI nick claim and merge prompt`

### T11: Speedrun submit only when authenticated
- **Done when**: phase-navigation skips LB submit for guest; toast/hint; tests updated
- **Commit**: `fix(speedrun): submit leaderboard only when signed in`

## Phase 4 — Ship

### T12: STATE AD-026 + docs handoff
- **Done when**: AD-026 active; AD-021 noted superseded for durable Hobby path; handoff updated
- **Commit**: `docs(auth): record AD-026 Google OAuth identity`

### T13: Quality gate + merge main + Vercel prod deploy
- **Done when**: `nx run-many -t lint test` green; merged to `main`; production deploy READY with env vars set
- **Commit**: merge commit / push main

---

## Requirement Traceability

| ID | Tasks |
| -- | ----- |
| AUTH-01 | T2 T4 T5 T9 T10 |
| AUTH-02 | T3 T4 T5 T10 |
| AUTH-03 | T6 T7 T9 T11 |
| AUTH-04 | T4 T5 T10 |
| AUTH-05 | T2 T4 T5 T10 |
| AUTH-06 | Deferred P2 — skip MVP |
| Speedrun revisit | T7 T11 |
