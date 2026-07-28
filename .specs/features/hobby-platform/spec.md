# Hobby Platform Specification

## Problem Statement

On Vercel Hobby the product is bilingual-incomplete (UI locked to PT-BR per AD-011), sessions die in browser `localStorage`, leaderboard is deferred, and several UX gaps frustrate mobile play (modal stacking, no undo, no share link, weak progress/resume). We need durable free-tier persistence plus full EN/PT-BR coverage including the AI Judge, and the listed UX fixes, without leaving Hobby.

## Goals

- [ ] Player can switch the entire product between English and Brazilian Portuguese (UI, problems, AI Judge) from the problem library
- [ ] Sessions and leaderboard survive across devices via Vercel KV for a given nickname
- [ ] UX list shipped: auto-confirm sessions CTA, undo/redo, share-via-URL, progress %, continue in-progress
- [ ] Blob export, Edge Config flags, daily Cron, and Web Analytics instrumented on Hobby

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Full Fastify on Vercel | AD-022: thin serverless `api/*` only |
| Real user accounts / OAuth | Nickname surrogate remains |
| Short Blob share IDs (v2) | Hash share in v1; Blob for export/backup |
| Neon Postgres (unless needed) | Deferred until KV cannot serve stats/history |
| Tier-4 GLB polish unrelated to this list | Separate `polish` feature |
| Changing AD-016 score/verdict rules | Unrelated |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| i18n depth | Complete: UI + problems + Judge | User: “TODO incluindo AI Judge” | y (agent + user) |
| Locale controls | Library EN / PT-BR buttons; persist `sdq-locale`; default `pt-BR` | User request + existing audience | y |
| Share encoding | Hash + compact payload; Blob for export | Offline review; soft 8KB guard | y |
| Ship model | One feature, batched execute; KV first | User priority + “tudo desta lista” | y |
| Neon | Out until proven necessary | “se precisar” | y |
| Session LWW | Last `updatedAt` wins across devices | Hobby simplicity | y |
| Technical terms | Remain English in both locales | AD-011 jargon spirit | y |

**Open questions:** none — all resolved or logged above.

---

## Implicit-Requirement Dimensions

| Dimension | Resolution |
| --------- | ---------- |
| Input validation & bounds | Locale enum `en` \| `pt-BR`; nickname max length unchanged; share hash reject malformed/oversize; session payload size capped (existing or ≤256KB) |
| Failure / partial-failure | KV/Blob/Edge down → localStorage/cache fallback + non-blocking toast; Judge without locale → `pt-BR` |
| Idempotency / retry | Session upsert by id; leaderboard write keyed by nickname+problemId+mode; safe client retry |
| Auth boundaries & rate limits | Nickname header/query only; serverless best-effort throttle; no secrets in client |
| Concurrency / ordering | LWW on `updatedAt`; undo stack single-tab |
| Data lifecycle / expiry | Cron deletes sessions older than 90 days; KV TTL optional on ephemeral keys |
| Observability | Web Analytics custom events: `problem_start`, `phase_requirements`, `phase_canvas`, `phase_result`, `abandon` |
| External-dependency failure | Fallbacks documented per service; app remains playable offline for canvas |
| State-transition integrity | Auto-confirm uses same upsert path as Confirm; `in_progress` → terminal statuses unchanged |

---

## User Stories

### P1: Locale switch EN / PT-BR ⭐ MVP

**User Story**: As a player, I want EN and PT-BR buttons on the problem library so the whole product (including AI Judge) speaks my language.

**Why P1**: Explicit primary ask; unlocks global content.

**Acceptance Criteria**:

1. WHEN the problem library is shown THEN system SHALL render two controls `data-testid="locale-en"` and `data-testid="locale-pt-BR"` with the active locale visually indicated
2. WHEN the player activates EN or PT-BR THEN system SHALL persist locale to `localStorage` (`sdq-locale`) and update all visible UI strings to that locale within the current view without full page reload
3. WHEN locale is `en` or `pt-BR` THEN problem titles, briefs, and requirement labels SHALL render in that locale
4. WHEN the player submits to AI Judge with an active locale THEN `/api/judge` SHALL receive `locale` and return strengths/issues/improvements/nextStep (and mock narrative) in that locale
5. WHEN no locale is stored THEN system SHALL default to `pt-BR`
6. WHEN locale is `en` THEN industry component names (e.g. Load Balancer) SHALL remain English

**Independent Test**: Toggle EN on library → home strings English → open problem → requirements English → judge mock returns English narrative; toggle PT-BR restores Portuguese.

---

### P1: KV-backed sessions ⭐ MVP

**User Story**: As a player, I want my sessions stored in Vercel KV so the same nickname sees them on another device.

**Why P1**: Highest Hobby ROI; replaces localStorage source-of-truth.

**Acceptance Criteria**:

1. WHEN client upserts a session on Hobby THEN `PUT /api/sessions` SHALL persist to Vercel KV keyed by nickname + session id
2. WHEN client lists sessions for a nickname THEN `GET /api/sessions?nickname=` SHALL return records from KV (same shape as current DesignSession API)
3. WHEN KV is unavailable THEN client SHALL fall back to `localStorage` (`sdq-sessions`) and surface a non-blocking notice
4. WHEN a session exists in both KV and local cache THEN system SHALL prefer the newer `updatedAt`
5. WHEN Fastify local dev runs THEN existing SessionStore path SHALL remain usable (KV adapter injectable / env-gated)

**Independent Test**: Upsert via API with mock KV → GET returns session; simulate KV failure → localStorage still lists session.

---

### P1: KV leaderboard ⭐ MVP

**User Story**: As a speedrun player, I want a durable leaderboard without full Fastify so rankings work on Hobby.

**Why P1**: Currently deferred blocker in STATE.

**Acceptance Criteria**:

1. WHEN a qualifying speedrun result is submitted THEN `POST /api/leaderboard` SHALL store/update score in KV for `problemId` + nickname
2. WHEN client requests leaderboard for a problem THEN `GET /api/leaderboard?problemId=` SHALL return entries ordered by score desc (then time asc if tied), capped reasonably (e.g. top 50)
3. WHEN KV is unavailable THEN write SHALL fail soft (local play continues) and read SHALL show empty/error state without crashing

**Independent Test**: Post two scores → GET ordered list; AD-016 qualifying rules unchanged.

---

### P1: Auto-confirm “Ver em Minhas sessões” ⭐ MVP

**User Story**: As a player, I want “Ver em Minhas sessões” to save and open sessions without the confirm modal staying on top.

**Why P1**: Current bug/UX friction called out explicitly.

**Acceptance Criteria**:

1. WHEN the player clicks “Ver em Minhas sessões” while a session confirm modal is pending THEN system SHALL perform the confirm upsert, close/dismiss the modal, then open the sessions dashboard
2. WHEN no confirm is pending THEN the button SHALL open sessions dashboard only
3. WHEN upsert fails THEN system SHALL show an error and SHALL NOT leave a stuck modal covering the dashboard

**Independent Test**: Trigger result → open sessions CTA with modal present → modal gone, dashboard visible, session listed.

---

### P2: Undo / redo on canvas

**User Story**: As a player, I want Ctrl+Z / redo so accidental drags and connections are recoverable (especially on mobile).

**Why P2**: High frustration reducer; not blocking persistence.

**Acceptance Criteria**:

1. WHEN the player mutates the graph (add/move/delete node, connect/disconnect, config change) THEN system SHALL push a snapshot onto an undo stack (max 50)
2. WHEN Ctrl+Z (Cmd+Z on Mac) is pressed on the canvas THEN system SHALL restore the previous snapshot
3. WHEN Ctrl+Y or Ctrl+Shift+Z is pressed THEN system SHALL redo if available
4. WHEN on coarse pointer / ≤768px THEN canvas chrome SHALL expose Undo and Redo buttons (≥44px targets)
5. WHEN a new edit happens after undo THEN redo stack SHALL clear

**Independent Test**: Add node → Ctrl+Z removes it → redo restores; assert via `__GAME_STATE__` graph.

---

### P2: Share design via URL

**User Story**: As a player, I want a shareable URL containing the serialized graph so someone can review asynchronously without login.

**Why P2**: Collaboration without accounts.

**Acceptance Criteria**:

1. WHEN the player activates Share THEN system SHALL write a compact encoding of `{ problemId, graph }` into the URL hash and copy the URL (or show copy UI)
2. WHEN a visitor opens a URL with a valid share hash THEN system SHALL restore the graph for that problem without requiring nickname login
3. WHEN the encoded payload exceeds the soft size limit (~8KB) THEN system SHALL refuse hash share, explain, and offer JSON backup export instead
4. WHEN the hash is malformed THEN system SHALL ignore it and show the normal home/library with an optional toast

**Independent Test**: Build graph → share → open hash in clean profile → graph matches serialized ArchitectureGraph.

---

### P2: Progress % by difficulty + persistent badge

**User Story**: As a player, I want to see % of approved problems per difficulty on the library with a persistent badge.

**Why P2**: Motivation / library UX.

**Acceptance Criteria**:

1. WHEN the library renders THEN each difficulty filter (easy/medium/hard) SHALL show percent completed = approved / total in that tier
2. WHEN a problem reaches qualifying completion (existing PARTIAL+ ≥70 / PASS rules) THEN the percent and badge SHALL update and persist across reloads
3. WHEN locale changes THEN labels update but percentages remain correct

**Independent Test**: Mark one easy complete in progress store → easy shows non-zero %; reload persists.

---

### P2: Continuar de onde parei

**User Story**: As a returning player, I want a home shortcut to my latest `in_progress` session.

**Why P2**: Resume friction.

**Acceptance Criteria**:

1. WHEN the library/home loads and the current nickname has at least one `in_progress` session THEN system SHALL show `data-testid="continue-session"` for the most recently updated one
2. WHEN the player activates it THEN system SHALL open that session’s canvas (same path as reopen from dashboard)
3. WHEN there is no `in_progress` session THEN the shortcut SHALL be hidden

**Independent Test**: Seed in_progress → shortcut visible → click resumes graph; clear → hidden.

---

### P2: Vercel Blob export

**User Story**: As a player, I want to export PNG/SVG of the diagram or JSON backup of the session.

**Why P2**: Backup and sharing artifacts on free 1GB Blob.

**Acceptance Criteria**:

1. WHEN the player chooses Export JSON THEN system SHALL download session JSON and optionally upload a copy to Blob when configured, returning a URL
2. WHEN the player chooses Export SVG or PNG THEN system SHALL produce a snapshot of the blueprint diagram for download (and optional Blob upload)
3. WHEN Blob is not configured THEN downloads SHALL still work client-side

**Independent Test**: Export JSON contains graph; SVG/PNG download triggers without throwing when Blob env missing.

---

### P2: Edge Config flags & copy

**User Story**: As an operator, I want maintenance and “new problem” flags/text without redeploy.

**Why P2**: Hobby ops without rebuild.

**Acceptance Criteria**:

1. WHEN Edge Config contains `maintenance: true` THEN library/home SHALL show maintenance banner and block new session start
2. WHEN Edge Config lists new problem ids / promo text THEN library SHALL show a “new” badge or banner string
3. WHEN Edge Config is unreachable THEN system SHALL behave as flags off (fail open for playability)

**Independent Test**: Mock config maintenance → banner + start blocked; mock fail → app playable.

---

### P3: Vercel Cron daily job

**User Story**: As an operator, I want one daily Hobby cron to clean old sessions, aggregate light stats, and warm the judge mock.

**Why P3**: Hygiene; 1 job/day limit.

**Acceptance Criteria**:

1. WHEN the cron route runs (secured by `CRON_SECRET` / Vercel header) THEN system SHALL delete KV sessions with `updatedAt` older than 90 days
2. WHEN cron runs THEN system SHALL warm-up `POST /api/judge` mock path (or health) once
3. WHEN cron runs THEN system SHALL write a small usage aggregate key in KV (counts by day) without failing the job on aggregate errors

**Independent Test**: Unit-test cleanup predicate; cron handler rejects unauthorized.

---

### P3: Web Analytics events

**User Story**: As a product owner, I want to see where players abandon (requirements vs canvas) via Vercel Web Analytics.

**Why P3**: Insight; free on Vercel.

**Acceptance Criteria**:

1. WHEN the player enters requirements, canvas, or result phases THEN client SHALL emit named analytics events
2. WHEN the player leaves mid-flow (visibility/pagehide without result) THEN client SHALL emit an abandon event with `problemId` + last phase when possible
3. WHEN Analytics is unavailable THEN emit SHALL no-op without breaking UX

**Independent Test**: Spy on analytics helper during phase navigation; abandon path called once.

---

### P3: Neon Postgres (conditional)

**User Story**: As an operator, I want Neon only if KV cannot answer history/stats queries.

**Why P3**: Explicit “se precisar”.

**Acceptance Criteria**:

1. WHEN KV-backed list/filter and aggregate keys satisfy library progress + session history THEN Neon SHALL NOT be introduced
2. WHEN a verified gap remains after KV ship (documented in design Risks) THEN a thin `/api/stats` on Neon MAY be added in a follow-up task within this feature

**Independent Test**: Design checklist documents KV-sufficient or Neon task opened with evidence of gap.

---

## Edge Cases

- WHEN locale switches mid-canvas THEN labels/panels re-render; graph data unchanged
- WHEN share hash and normal routing conflict THEN hash share takes precedence on first load only
- WHEN nickname empty THEN continue shortcut and remote sessions skip remote calls
- WHEN undo stack empty THEN Ctrl+Z is no-op
- WHEN two devices edit same session id THEN later `updatedAt` wins (possible silent overwrite)
- WHEN leaderboard score lower than existing for same nickname+problem THEN keep best score (do not worsen)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| LOCALE-01 | P1: Locale switch | Design | Pending |
| LOCALE-02 | P1: Locale switch (problems) | Design | Pending |
| LOCALE-03 | P1: Locale switch (Judge) | Design | Pending |
| LOCALE-04 | P1: Locale default + jargon | Design | Pending |
| SESS-01 | P1: KV sessions | Design | Pending |
| SESS-02 | P1: KV fallback | Design | Pending |
| LB-01 | P1: KV leaderboard write/read | Design | Pending |
| UX-01 | P1: Auto-confirm sessions CTA | Design | Pending |
| UX-02 | P2: Undo/redo | Design | Pending |
| UX-03 | P2: Share URL | Design | Pending |
| UX-04 | P2: Progress % | Design | Pending |
| UX-05 | P2: Continue shortcut | Design | Pending |
| BLOB-01 | P2: Blob/export | Design | Pending |
| EDGE-01 | P2: Edge Config | Design | Pending |
| CRON-01 | P3: Daily cron | Design | Pending |
| ANALYTICS-01 | P3: Web Analytics | Design | Pending |
| NEON-01 | P3: Conditional Neon | Design | Pending |

**Coverage:** 17 total, 0 mapped to tasks, 17 unmapped ⚠️ (expected pre-Tasks)

---

## Success Criteria

- [ ] EN ↔ PT-BR toggles change library, problem copy, and Judge narrative
- [ ] Same nickname sessions visible across two browser profiles when KV configured
- [ ] Leaderboard endpoint returns ordered scores on Hobby
- [ ] “Ver em Minhas sessões” never leaves confirm modal stacked on dashboard
- [ ] Undo/redo, share hash, progress %, continue shortcut demoable
- [ ] Export works without Blob; with Blob optional URL returned
- [ ] Edge maintenance flag, cron auth, analytics helpers covered by tests
- [ ] Quality gate `nx run-many -t lint test` green; AD-022 pattern preserved
