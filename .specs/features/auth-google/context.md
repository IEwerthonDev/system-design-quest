# Google OAuth Context

**Gathered:** 2026-07-28
**Spec:** `.specs/features/auth-google/spec.md`
**Status:** Ready for design (pending user confirm of context + spec)

---

## Feature Boundary

Real Google OAuth for System Design Quest on Hobby: players may keep playing as guests; signing in with Google unlocks durable cross-device sessions/leaderboard ownership. After login, the player chooses a **unique public nickname**. First login on a device that has anonymous progress **asks** whether to import that progress. Logout is explicit and returns the player to guest mode.

---

## Implementation Decisions

### 1. Guest vs login (1A)

- Guest play remains fully available (Study + Speedrun canvas/judge locally).
- Google sign-in is required only for: remote session sync (KV), posting/updating leaderboard under a durable identity, and continuing authenticated history on another device.
- Guest remote upsert with a bare nickname alone is **not** treated as ownership of another player's data once auth ships (server binds durable data to `userId`).

### 2. Public identity (2B)

- Google account is the private identity (`sub` / email for account ops).
- After first successful Google login (or when no public nick is set), the player **must choose a unique public nickname** before remote sync/leaderboard write.
- Leaderboard and session lists display the public nickname (not email).
- Google display name / photo may appear in the signed-in chrome; ranking uses the public nick.

### 3. Anonymous progress merge (3B)

- On first authenticated session on a browser that already has guest nickname/local sessions, the UI **asks**: bring progress from this device?
- **Yes** → merge local guest sessions into the authenticated account (LWW on `updatedAt` for conflicting ids).
- **No** → leave guest local data untouched; authenticated account keeps its existing remote data only.
- Prompt is shown once per guest→auth transition on that device (dismissed choice persisted locally).

### 4. Logout (4A)

- Clear **Sair / Sign out** control when signed in.
- Logout clears the auth session and returns to **guest** mode (play continues without Google).
- Signing in again with the same Google account restores that account’s nick + remote data.

### Agent's Discretion

- Cookie vs bearer token shape, OAuth library, exact Google consent screens copy.
- Exact placement of Login / Logout / nick claim UI (library header vs modal) as long as bilingual and discoverable.
- Rate limits and CSRF/state parameter details in Design.

### Declined / Undiscussed Gray Areas → Assumptions

| Topic | Default | Rationale |
| ----- | ------- | --------- |
| Providers | Google only in MVP | User: “login com google”; GitHub deferred |
| Guest leaderboard read | Public leaderboard readable without login | Ranking is a social surface; write requires auth |
| Nick uniqueness | Unique among authenticated public nicks; case-normalized | Matches 2B “sem poder ser um que já exista” |
| Guest nick collision | Guest may use any valid local nick; claim at login enforces uniqueness | Avoid blocking guest play |
| Session lifetime | Persistent session cookie (~30 days) with logout revoke | Hobby convenience; logout is explicit |
| Multi-device same Google | Same `userId` / nick everywhere | Point of OAuth |

---

## Specific References

- User choices: `1A, 2B, 3B, 4A` (2026-07-28)
- Prior product note: nickname was auth surrogate; OAuth was deferred in hobby-platform Out of Scope
- Prior discuss: uniqueness-without-auth is unsafe — OAuth is the chosen fix

---

## Deferred Ideas

- GitHub / Apple OAuth
- Account deletion / GDPR export UI (beyond logout)
- Admin moderation of nicknames
- Linking multiple OAuth providers to one account
