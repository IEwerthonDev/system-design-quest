# Playground Parity — Context

**Gathered:** 2026-07-27  
**Spec:** `.specs/features/playground-parity/spec.md`  
**Status:** Ready for design — **confirmed** 2026-07-27

---

## Feature Boundary

Bring System Design Quest canvas/session UX to Playground parity: BOTTLENECK/QUEUEING + ms bar, Speed/Traffic max 5×, remove Dicas, curved SVG edges, judge as right sidebar with viewport-safe approve/reject modal, persist sessions on Confirm/Back, and a session history dashboard. Chaos/Mermaid remain out of scope.

---

## Implementation Decisions

### Persistência (1B — API + DB)

- Session records (graph + status + judge metadata + nickname) persist via **server API + database**, not localStorage-as-source-of-truth
- Client may keep ephemeral/in-memory session while playing; **Confirmar** and **Voltar** call the API to upsert
- Existing `sdq-progress` (problem completions) stays as-is; this feature owns a **separate sessions store**
- Storage tech (SQLite file, Postgres, in-memory for tests, etc.) is a **Design** choice — product decision is “server-backed”

### Auth (Nickname-only)

- No account / login / OAuth
- Player identifies with a **nickname** (reuse speedrun nickname generate/persist patterns where possible)
- API associates sessions with `playerNickname` (validation rules aligned with leaderboard nickname: length bounds, sanitize)
- No cross-user private ACL beyond nickname string matching for “my sessions” listing (Design may scope list as nickname-filtered query param)

### Verdict → session status (Partial as own status)

- `PASS` → `approved`
- `FAIL` → `rejected`
- `PARTIAL` → **`partial`** (dedicated status — not folded into approved/rejected)
- `Voltar` / leave without final confirm → `in_progress`
- Dashboard filters/sections: **Approved / Rejected / Partial / In Progress** (four buckets)
- Cards still show underlying judge `verdict` + score when present

### Retenção (Cap 50)

- Hard cap: **50 sessions per nickname** (or global if Design collapses identity — prefer per-nickname)
- When upsert would exceed 50, **evict oldest by `updatedAt`** (FIFO by recency) until ≤50 — Design specifies exact eviction API behavior
- No TTL/time expiry in this feature

### Agent's Discretion

- Exact DB engine and migration approach → **locked: Approach A JSON file SessionStore** (2026-07-27)
- Sidebar dock vs overlay animation
- Educational ms formula from pressure (as long as green/yellow/red map ok/warn/hot) → **locked in design:** ok=35 / warn=120 / hot=280
- Whether reopen from dashboard auto-fills nickname from stored session
- Empty-state copy (PT-BR)

### Declined / Undiscussed Gray Areas → Assumptions

- Multi-tab concurrent edits: last-write-wins on API upsert by `id`
- Deleting sessions from UI: not required in P1 (cap eviction only); note as deferred if user wants trash later
- Sharing session URLs publicly: out of scope

---

## Specific References

- System Design Playground dashboard (Approved / Rejected / In Progress prints) — extended here with **Partial** bucket per Discuss
- Speedrun nickname flow as auth surrogate
- Existing dual-judge result panel → move/adapt to right sidebar

---

## Deferred Ideas

- Chaos tab / Mermaid view (Playground extras)
- Full user accounts / multi-device sync beyond nickname
- Manual session delete UI
- localStorage offline cache of sessions (optional later hybrid)
