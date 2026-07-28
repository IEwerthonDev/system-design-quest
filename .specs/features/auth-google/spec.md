# Google OAuth Specification

## Problem Statement

Sessions and leaderboard today key off a nickname stored in the browser. Anyone who types that string can claim the history; cross-device sync is fragile and not a real account. Players need real Google sign-in so durable data is owned by an authenticated identity, while still allowing zero-friction guest play.

## Goals

- [ ] Player can sign in with Google and sign out explicitly
- [ ] Authenticated player claims a unique public nickname used on leaderboard and session lists
- [ ] Guest play remains available; remote durable ownership requires auth
- [ ] On first login with local guest progress, player can choose to import or skip

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| GitHub / Apple / magic-link auth | Deferred; Google-only MVP |
| Full account settings / email change | Nickname + logout enough |
| Admin nick moderation tooling | Later |
| Neon user table | Stay on KV + session cookie unless Design proves otherwise |
| Removing guest play | Explicitly rejected (1A) |
| Password / username local accounts | OAuth only |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Guest vs forced login | Guest OK; Google for sync/ranking/history (1A) | User | y |
| Public display | Unique nickname after login (2B) | User | y |
| Guest data | Prompt to import on first login (3B) | User | y |
| Logout | Explicit; returns to guest (4A) | User | y |
| Providers | Google only | User + prior ask | y |
| Leaderboard read | Public without auth; write requires auth | Agent default | y (user: ok para a spec) |
| Session duration | ~30-day cookie; logout clears | Agent default | y (user: ok para a spec) |
| Nick rules | Existing `isValidNickname` (3–20 `[a-zA-Z0-9_-]`) + uniqueness | Reuse shared validators | y |

**Open questions:** none — spec confirmed 2026-07-28.

---

## Implicit-Requirement Dimensions

| Dimension | Resolution |
| --------- | ---------- |
| Input validation & bounds | OAuth `state`/`nonce`; nickname via existing validators; reject taken nick with clear error |
| Failure / partial-failure | Google down / denied consent → stay guest + error toast; partial merge → report failed session ids, keep rest |
| Idempotency / retry | OAuth callback idempotent by `state`; nick claim retry-safe; session upsert by id under `userId` |
| Auth boundaries & rate limits | Unauthenticated: play local + read public leaderboard; Authenticated: upsert sessions/leaderboard for own `userId` only; throttle auth + claim endpoints |
| Concurrency / ordering | Nick claim atomic (KV/set-if-absent); merge LWW on `updatedAt` |
| Data lifecycle / expiry | Auth session ~30 days or until logout; OAuth tokens not stored long-term beyond session needs |
| Observability | Analytics events: `auth_login_start`, `auth_login_success`, `auth_logout`, `auth_nick_claim`, `auth_merge_yes`/`no` |
| External-dependency failure | Google OAuth failure → guest continues; KV failure → existing local fallback for guest; authenticated writes surface error |
| State-transition integrity | `guest` → `authenticated_needs_nick` → `authenticated`; `authenticated` → `guest` on logout; merge prompt only guest→auth with local data |

---

## User Stories

### P1: Google sign-in & session ⭐ MVP

**User Story**: As a player, I want to sign in with Google so my account is real and portable across devices.

**Why P1**: Core of “OAuth de verdade”.

**Acceptance Criteria**:

1. WHEN the player activates Sign in with Google THEN system SHALL start a Google OAuth 2.0 authorization code flow (PKCE or confidential server exchange) and SHALL NOT put client secrets in the browser bundle
2. WHEN Google auth succeeds THEN system SHALL create an authenticated session for that Google subject and return the player to the app signed-in
3. WHEN Google auth is cancelled or fails THEN system SHALL remain in guest mode and SHALL show a non-blocking error
4. WHEN the player is signed in THEN UI SHALL show signed-in state (avatar or email/name cue) and a Sign out control (`data-testid="auth-sign-out"`)
5. WHEN `GET` (or equivalent) session/me is called with a valid session THEN system SHALL return `{ authenticated: true, userId, email?, displayName?, publicNickname? }`
6. WHEN session/me is called without a valid session THEN system SHALL return `{ authenticated: false }`

**Independent Test**: Mock OAuth success → me returns authenticated; cancel → still guest; secrets absent from client build.

---

### P1: Unique public nickname claim ⭐ MVP

**User Story**: As a signed-in player, I want to choose a unique public nickname so the leaderboard shows my handle, not my email.

**Why P1**: User choice 2B; replaces unsafe nickname-as-auth.

**Acceptance Criteria**:

1. WHEN a signed-in player has no public nickname THEN system SHALL block remote session upsert and leaderboard write until a nickname is claimed
2. WHEN the player submits a valid unused nickname THEN system SHALL persist it as their unique public nickname and associate it with their `userId`
3. WHEN the player submits a nickname already claimed by another `userId` THEN system SHALL reject with a clear “already taken” error and SHALL NOT change ownership
4. WHEN the player submits an invalid nickname THEN system SHALL reject using the same rules as `isValidNickname`
5. WHEN the player already has a public nickname THEN system SHALL use it for leaderboard display and session `playerNickname` fields without requiring re-claim on each visit
6. WHEN listing or showing leaderboard entries THEN system SHALL display the owner's public nickname

**Independent Test**: Two users — second cannot claim first’s nick; first can write leaderboard under nick.

---

### P1: Guest play + auth-gated durable writes ⭐ MVP

**User Story**: As a casual player, I want to play without signing in, and only sign in when I care about sync/ranking.

**Why P1**: User choice 1A.

**Acceptance Criteria**:

1. WHEN the player never signs in THEN system SHALL allow problem library, canvas, requirements, judge, and local session storage to work
2. WHEN an unauthenticated client attempts durable remote session upsert or leaderboard submit THEN system SHALL reject with `401` (or equivalent) and the client SHALL keep/use local fallback without claiming another user’s remote data
3. WHEN an authenticated client with a claimed nickname upserts a session THEN system SHALL store it under that `userId` (and public nick for display)
4. WHEN an authenticated client lists “my sessions” THEN system SHALL return only sessions owned by that `userId`
5. WHEN anyone requests the public leaderboard THEN system SHALL return entries without requiring auth

**Independent Test**: Guest completes a study session locally; remote PUT returns 401; after login+nick, PUT succeeds and list is scoped to user.

---

### P1: Import guest progress prompt ⭐ MVP

**User Story**: As a player signing in on a device with local progress, I want to choose whether to bring that progress into my Google account.

**Why P1**: User choice 3B.

**Acceptance Criteria**:

1. WHEN a guest with local session data (or stored guest nickname history) successfully signs in THEN system SHALL show a one-time prompt offering to import progress from this device
2. WHEN the player chooses **Yes** THEN system SHALL merge local guest sessions into the authenticated account (same id → keep newer `updatedAt`) and SHALL clear or stop treating those records as guest-owned after success
3. WHEN the player chooses **No** THEN system SHALL leave local guest data as-is for guest mode and SHALL NOT copy it into the account
4. WHEN the prompt has been answered on that device THEN system SHALL not show it again for that guest→account transition (persisted local flag)
5. WHEN merge partially fails THEN system SHALL report failure for affected sessions and keep successfully merged ones

**Independent Test**: Seed local sessions → login → Yes → remote list contains them; fresh login path with No → remote list unchanged.

---

### P1: Sign out to guest ⭐ MVP

**User Story**: As a signed-in player, I want to sign out so this browser returns to guest play.

**Why P1**: User choice 4A.

**Acceptance Criteria**:

1. WHEN the player activates Sign out THEN system SHALL invalidate the auth session server-side (or clear session cookie) and UI SHALL enter guest mode
2. WHEN signed out THEN remote session list / leaderboard writes SHALL behave as unauthenticated (401 on durable writes)
3. WHEN the same Google account signs in again THEN system SHALL restore the same `userId` and previously claimed public nickname

**Independent Test**: Sign out → me unauthenticated → sign in again → same nick.

---

### P2: Change public nickname

**User Story**: As a signed-in player, I want to change my public nickname later if it is still unique.

**Why P2**: Nice; not required for first login flow.

**Acceptance Criteria**:

1. WHEN an authenticated player submits a new valid unused nickname THEN system SHALL update their public nickname and historical display for new leaderboard writes
2. WHEN the new nick is taken THEN system SHALL reject

**Independent Test**: Change nick → leaderboard new posts use new nick.

---

## Edge Cases

- WHEN OAuth `state` mismatches THEN system SHALL abort login and stay guest
- WHEN two clients race to claim the same nick THEN exactly one SHALL succeed
- WHEN guest local nick equals an already claimed public nick and user imports THEN import still proceeds under the account’s claimed (possibly different) public nick — local string does not steal the global claim
- WHEN signed-in user opens a second browser THEN both SHALL share the same account after login; guest data merge prompt only if that browser has its own guest local data
- WHEN Google returns no email (rare) THEN system SHALL still create account keyed by Google `sub`

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| AUTH-01 | P1: Google sign-in & session | Design | Pending |
| AUTH-02 | P1: Unique public nickname claim | Design | Pending |
| AUTH-03 | P1: Guest play + auth-gated durable writes | Design | Pending |
| AUTH-04 | P1: Import guest progress prompt | Design | Pending |
| AUTH-05 | P1: Sign out to guest | Design | Pending |
| AUTH-06 | P2: Change public nickname | Design | Pending |

**Coverage:** 6 total, 0 mapped to tasks, 6 unmapped

---

## Success Criteria

- [ ] Guest can finish a problem without Google
- [ ] Google login + unique nick + remote session/leaderboard write works on production Hobby
- [ ] Another user cannot read/write the first user’s remote sessions by guessing a nickname
- [ ] Logout returns to guest; re-login restores nick
- [ ] Import prompt Yes/No behaves as specified
