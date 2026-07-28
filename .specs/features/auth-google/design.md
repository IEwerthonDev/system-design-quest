# Google OAuth Design

**Spec**: `.specs/features/auth-google/spec.md`  
**Context**: `.specs/features/auth-google/context.md`  
**Status**: Approved (user: recommended options + execute to functional)

---

## Architecture Overview

**Chosen approach:** Serverless BFF on Hobby (`api/auth.js`) — Google OAuth **authorization code + PKCE**, token exchange with **client secret only on server**, app session as **HTTP-only signed JWT cookie** (`sdq_session`, ~30 days). User profile + unique nick maps in **Vercel KV**. Guest play unchanged; durable session upsert + leaderboard **POST** require auth + claimed nick.

Rejected alternatives:
- Pure SPA PKCE without secret — weaker fit for “Web application” Google clients; still need BFF for cookie.
- Auth.js / Clerk — heavier than Hobby thin `api/*` pattern (AD-025).

```mermaid
sequenceDiagram
  participant C as Client SPA
  participant A as /api/auth
  participant G as Google
  participant K as Vercel KV

  C->>A: GET /api/auth/google
  A->>K: store oauth state+verifier
  A-->>C: 302 Google
  G-->>A: GET /api/auth/callback?code&state
  A->>G: exchange code+verifier+secret
  A->>K: upsert user:{userId}
  A-->>C: Set-Cookie sdq_session; 302 /
  C->>A: GET /api/auth/me (cookie)
  A-->>C: { authenticated, publicNickname? }
  C->>A: POST /api/auth/nickname { nickname }
  A->>K: SET nick:{n} NX + user.publicNickname
```

---

## Code Reuse Analysis

| Component | Location | How to Use |
| --------- | -------- | ---------- |
| Nickname validators | `libs/shared` `isValidNickname` / `normalizeNickname` | Claim + display |
| KV client pattern | `server/src/sessions/kv-store.ts` | Same env; new user/nick keys |
| Vercel handler shape | `server/src/vercel/api-sessions.ts` | Mirror for `api-auth.ts` |
| Cron Bearer auth | `api-cron.ts` `authorizeCron` | Pattern for cookie parse helper |
| Client fetch APIs | `sessions-api.ts`, `leaderboard-api.ts` | `credentials: 'include'` |
| Leaderboard qualify | `isQualifyingForLeaderboard` | Unchanged; gate submit with auth |
| Guest nickname | `client/src/storage/nickname.ts` | Guest-only; auth nick from `/me` |

---

## Components

### Auth service (domain)

- **Location**: `server/src/auth/`
- **Interfaces**:
  - `createAuthService(deps)` → `startGoogleLogin()`, `handleGoogleCallback(code,state)`, `getSessionUser(cookie)`, `logout(cookie)`, `claimNickname(userId, nick)`, `mergeGuestSessions(userId, sessions[])`
- **Dependencies**: KV, Google token + userinfo, `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AUTH_BASE_URL`
- **Reuses**: nickname validators, KV createClient pattern

### Auth Vercel + Fastify routes

- **Location**: `server/src/vercel/api-auth.ts` → `api/auth.js`; `server/src/routes/auth.ts`
- **Routes**:
  - `GET /api/auth/google` — start
  - `GET /api/auth/callback` — finish
  - `GET /api/auth/me`
  - `POST /api/auth/logout`
  - `POST /api/auth/nickname`
  - `POST /api/auth/merge`

### Session cookie helper

- **Location**: `server/src/auth/session-cookie.ts`
- **Interfaces**: `signSession(userId)`, `verifySession(cookieHeader)`, `clearCookieHeader()`
- **Deps**: `jose` (HS256 with `AUTH_SECRET`)

### User / nick KV store

- **Location**: `server/src/auth/kv-user-store.ts`
- **Keys**: `user:{userId}`, `nick:{normalized}`, `oauth:{state}` (TTL ~10m), optional `sessidx:user:{userId}`

### Gate durable APIs

- **Sessions**: PUT/list require valid session; ownership by `userId`; `playerNickname` forced from account public nick
- **Leaderboard POST**: require auth + public nick; ignore/override body nickname with account nick
- **Leaderboard GET**: public (unchanged)
- **GET session by id**: require owner or 404

### Client auth UI + API

- **Location**: `client/src/auth/`
- **UI**: library header Sign in / avatar + Sign out; nick claim modal; merge prompt modal
- **APIs**: `fetchMe`, `startGoogleLogin` (navigate), `claimNickname`, `logout`, `mergeGuestSessions`
- **Speedrun**: submit only when authenticated + nick; else toast “Sign in to rank”

---

## Data Models

```typescript
interface AuthUser {
  userId: string; // google sub
  email?: string;
  displayName?: string;
  pictureUrl?: string;
  publicNickname?: string;
  createdAt: string;
  updatedAt: string;
}

interface SessionJwtPayload {
  sub: string; // userId
  exp: number;
}
```

**Relationships**: `nick:{n}` → `userId` (unique); sessions gain `userId` field (keep `playerNickname` for display).

---

## Error Handling Strategy

| Scenario | Handling | User impact |
| -------- | -------- | ----------- |
| Google cancel / error | Stay guest; toast | Can keep playing |
| Invalid state | 400; clear oauth keys | Retry sign-in |
| Nick taken | 409 | Pick another |
| Unauth durable write | 401 | Local fallback / prompt sign-in |
| KV down | 503 on auth writes; guest local ok | Toast |

---

## Risks & Concerns

| Concern | Impact | Mitigation |
| ------- | ------ | ---------- |
| Nickname-only APIs allow spoofing today | Security | AUTH-03 gates; supersede AD-021 surrogate |
| Missing Google credentials blocks prod login | Deploy | Env required; guest still works; document setup |
| GET session by id open | Leak graphs | Require owner cookie |
| Speedrun posts guest nick to LB | Fake ranks | Auth + nick override on POST |
| `.agents/` untracked noise | Repo clutter | Do not commit |

---

## Tech Decisions

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| OAuth shape | Code + PKCE + server secret | Recommended BFF for SPA on Vercel |
| Session | JWT cookie HS256 30d | Stateless verify; logout clears cookie (+ optional denylist skip for Hobby) |
| Identity store | KV | AD-025; no Neon |
| Lib | `jose` | Small, Edge/Node OK |
| Speedrun submit | Auth required | Spec 1A + ranking integrity |
| AD | **AD-026** supersedes nickname-as-auth for durable APIs | Real OAuth |

---

## Speedrun revisit (in scope)

1. Client: only call `submitLeaderboardScore` when `me.authenticated && me.publicNickname`
2. Server: reject POST without session; set `playerNickname` from account
3. Keep AD-016 `isQualifyingForLeaderboard` unchanged
4. Timer / qualify path unchanged otherwise
5. Tests: unauth POST → 401; auth POST uses account nick
