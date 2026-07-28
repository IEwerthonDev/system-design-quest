# Hobby Platform Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/hobby-platform/design.md`  
**Spec**: `.specs/features/hobby-platform/spec.md`  
**Status**: In Progress (Execute Batch 1)

**Branch at Execute start:** `feature/hobby-platform` from `main`

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `AGENTS.md` (tests from spec ACs; WebGL N/A; `__GAME_STATE__` + serialized graph; Vitest; deterministic; gate before done; one atomic commit per task), `STATE.md` AD-010/024/025.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| i18n locale + catalogs | unit | Locale get/set/default; `t()` keys; jargon unchanged | `client/src/i18n/*.test.ts` | `npx nx test client` |
| Localized problems | unit | Every problem has `en` + `pt-BR` copy; resolver picks locale | `libs/shared/src/**/*.test.ts` | `npx nx test shared` |
| Judge locale | unit | Prompts/mock narrative honor `locale`; default `pt-BR` | `server/src/judge/*.test.ts` | `npx nx test server` |
| KvSessionStore / KvLeaderboardStore | unit | Happy + missing env + upsert/list/best-entry; mock KV | `server/src/sessions/*.test.ts`, `server/src/leaderboard/*.test.ts` | `npx nx test server` |
| Vercel API handlers | unit | Method/auth/body errors + happy path with mocked services | `server/src/vercel/*.test.ts` | `npx nx test server` |
| sessions-api client | unit | Remote OK; KV/404 fallback; LWW `updatedAt` | `client/src/sessions/*.test.ts` | `npx nx test client` |
| Library/UI locale + progress + continue | unit | Buttons, %, shortcut visibility via DOM testids | `client/src/ui/*.test.ts` | `npx nx test client` |
| Canvas undo / share | unit | Stack behavior + `__GAME_STATE__` graph; codec roundtrip / oversize | `client/src/canvas/*.test.ts`, `client/src/share/*.test.ts` | `npx nx test client` |
| Auto-confirm CTA | unit | Modal dismissed + upsert called + dashboard path | `client/src/ui/result-panel.test.ts` (+ session flow) | `npx nx test client` |
| Export / Edge / Analytics | unit | Download works without Blob; flags fail-open; track no-op | `client/src/**/*.test.ts` | `npx nx test client` |
| Cron handler | unit | Unauthorized 401; cleanup predicate; warm-up invoked | `server/src/vercel/*cron*.test.ts` | `npx nx test server` |
| Neon | none | Document KV-sufficient in task Done when (no code) | design/STATE | build gate only |
| vercel.json / env.example | none | Files present; build command includes new entries | root | build gate |

## Gate Check Commands

> Generated from codebase — confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick (client) | Client-only tasks | `npx nx test client` |
| Quick (server) | Server-only tasks | `npx nx test server` |
| Quick (shared) | Shared-only tasks | `npx nx test shared` |
| Full | Cross-package task | `npx nx run-many -t test --projects=shared,server,client` |
| Build | Phase end / config | `npx nx run-many -t lint test` |

---

## Execution Plan

### Phase 1: Locale foundation

```
T1 → T2 → T3 → T4 → T5
```

### Phase 2: KV durable stores

```
T6 → T7 → T8 → T9 → T10
```

### Phase 3: UX list

```
T11 → T12 → T13 → T14 → T15
```

### Phase 4: Hobby ops

```
T16 → T17 → T18 → T19 → T20
```

**Batch packing (Execute):** 4 batches × 5 tasks (one phase each). Offer sub-agents — sequential batches.

---

## Task Breakdown

### T1: Locale storage module

**What**: `Locale` type, `getLocale` / `setLocale`, default `pt-BR`, key `sdq-locale`.  
**Where**: `client/src/i18n/locale.ts`, `locale.test.ts`  
**Depends on**: None  
**Reuses**: `client/src/storage/preferences.ts` pattern  
**Requirement**: LOCALE-04

**Tools**: MCP filesystem · Skill tlc-spec-driven Execute

**Done when**:

- [ ] `getLocale` returns `pt-BR` when unset; persists `en` \| `pt-BR` only
- [ ] Invalid stored value falls back to `pt-BR`
- [ ] Gate: `npx nx test client` (locale tests green)

**Tests**: unit  
**Gate**: quick (client)  
**Commit**: `feat(i18n): add locale preference storage`

---

### T2: UI catalogs + `t()`

**What**: EN and PT-BR string catalogs for chrome; `t(key, locale?)`.  
**Where**: `client/src/i18n/catalog-en.ts`, `catalog-pt-BR.ts`, `t.ts`, `t.test.ts`  
**Depends on**: T1  
**Reuses**: T1 locale  
**Requirement**: LOCALE-01

**Tools**: MCP filesystem · Skill tlc-spec-driven Execute

**Done when**:

- [ ] Keys cover library chrome, sessions, result CTA, continue, share, undo (extensible map)
- [ ] Missing key returns key string (dev-safe) and is tested
- [ ] Gate: `npx nx test client`

**Tests**: unit  
**Gate**: quick (client)  
**Commit**: `feat(i18n): add EN/PT-BR UI string catalogs`

---

### T3: Bilingual problem copy + resolver

**What**: Schema for per-locale `ProblemCopy`; `localizeProblem`; EN+PT-BR for all catalog problems.  
**Where**: `libs/shared/src/schema/problem.ts`, `libs/shared/src/i18n/localize-problem.ts`, `libs/shared/src/problems/*`, tests  
**Depends on**: None (shared; parallel-safe after branch cut, ordered before T4)  
**Reuses**: `getProblem` / `listProblems`  
**Requirement**: LOCALE-02

**Tools**: MCP filesystem · Skill tlc-spec-driven Execute

**Done when**:

- [ ] Every problem id resolves both locales without undefined title/description
- [ ] Unit test fails if any problem missing a locale
- [ ] Industry component types elsewhere remain English
- [ ] Gate: `npx nx test shared`

**Tests**: unit  
**Gate**: quick (shared)  
**Commit**: `feat(shared): bilingual problem copy for all problems`

---

### T4: Library EN / PT-BR buttons

**What**: Locale controls on problem library; persist + refresh strings/problems.  
**Where**: `client/src/ui/problem-library.ts`, CSS, `problem-library.test.ts`  
**Depends on**: T1, T2, T3  
**Reuses**: library chrome  
**Requirement**: LOCALE-01, LOCALE-02

**Tools**: MCP filesystem · Skill tlc-spec-driven Execute

**Done when**:

- [ ] `data-testid="locale-en"` and `locale-pt-BR"` present; active state reflects locale
- [ ] Click EN updates titles via `localizeProblem`; PT-BR restores
- [ ] Preference survives remount (storage)
- [ ] Gate: `npx nx test client`

**Tests**: unit  
**Gate**: quick (client)  
**Commit**: `feat(library): add EN/PT-BR locale buttons`

---

### T5: Judge `locale` end-to-end

**What**: `JudgeInput.locale`; prompts + mock narrative in locale; client sends active locale.  
**Where**: `libs/shared` judge types, `server/src/judge/prompts.ts`, mock fixtures, `handle-judge-request.ts`, client judge caller, tests  
**Depends on**: T1  
**Reuses**: dual-judge / AD-016  
**Requirement**: LOCALE-03, LOCALE-04

**Tools**: MCP filesystem · Skill tlc-spec-driven Execute

**Done when**:

- [ ] Missing locale defaults to `pt-BR`
- [ ] Mock strengths/issues/nextStep language matches requested locale (spot-check assertions)
- [ ] Client POST includes `locale` from `getLocale()`
- [ ] Gate: `npx nx run-many -t test --projects=shared,server,client`

**Tests**: unit  
**Gate**: full  
**Commit**: `feat(judge): honor request locale in prompts and mock`

---

### T6: KvSessionStore

**What**: `SessionStore` implementation on Vercel KV (`sess:` / `sessidx:`).  
**Where**: `server/src/sessions/kv-store.ts`, `kv-store.test.ts`  
**Depends on**: None (server)  
**Reuses**: `SessionStore`, `createSessionService`  
**Requirement**: SESS-01

**Tools**: MCP filesystem · Skill tlc-spec-driven Execute

**Done when**:

- [ ] upsert/get/list/delete work against mocked KV client
- [ ] Missing KV env throws clear error (factory) for handler to catch
- [ ] Gate: `npx nx test server`

**Tests**: unit  
**Gate**: quick (server)  
**Commit**: `feat(sessions): add KvSessionStore adapter`

---

### T7: Vercel `/api/sessions` handler + build

**What**: Thin handler wiring session service + KV; esbuild out `api/sessions.js`; update `vercel.json`.  
**Where**: `server/src/vercel/api-sessions.ts`, `api-sessions.test.ts`, `vercel.json`, `api/sessions.js` build  
**Depends on**: T6  
**Reuses**: `api-judge.ts` pattern, Fastify session routes contracts  
**Requirement**: SESS-01

**Tools**: MCP filesystem · Skill tlc-spec-driven Execute

**Done when**:

- [ ] GET list + PUT upsert match existing API shapes
- [ ] Method not allowed → 405
- [ ] `vercel.json` buildCommand bundles sessions
- [ ] Gate: `npx nx test server`

**Tests**: unit  
**Gate**: quick (server)  
**Commit**: `feat(api): add Hobby serverless sessions route`

---

### T8: Client sessions LWW + fallback notice

**What**: Prefer newer `updatedAt` when merging remote/local; non-blocking notice on fallback.  
**Where**: `client/src/sessions/sessions-api.ts`, tests  
**Depends on**: T7 (contract stable; can stub)  
**Reuses**: existing Hobby fallback  
**Requirement**: SESS-02

**Tools**: MCP filesystem · Skill tlc-spec-driven Execute

**Done when**:

- [ ] Tests: remote newer wins; local newer wins; 404 still falls back
- [ ] Optional callback/event for “offline sessions” notice without crashing
- [ ] Gate: `npx nx test client`

**Tests**: unit  
**Gate**: quick (client)  
**Commit**: `feat(sessions): LWW merge and fallback notice`

---

### T9: KvLeaderboardStore

**What**: KV leaderboard store; best entry per nickname (elapsedMs, then score); speedrun sort.  
**Where**: `server/src/leaderboard/kv-store.ts`, tests  
**Depends on**: None (server; after T6 pattern)  
**Reuses**: `LeaderboardStore`, `createLeaderboardService`  
**Requirement**: LB-01

**Tools**: MCP filesystem · Skill tlc-spec-driven Execute

**Done when**:

- [ ] Worse elapsedMs does not replace better; tie uses higher score
- [ ] `listByProblem` order: elapsedMs asc, score desc
- [ ] Gate: `npx nx test server`

**Tests**: unit  
**Gate**: quick (server)  
**Commit**: `feat(leaderboard): add KvLeaderboardStore adapter`

---

### T10: Vercel `/api/leaderboard` handler + build

**What**: GET/POST leaderboard serverless + vercel build entry; soft-fail documented.  
**Where**: `server/src/vercel/api-leaderboard.ts`, tests, `vercel.json`  
**Depends on**: T9  
**Reuses**: Fastify leaderboard routes, `api-judge.ts`  
**Requirement**: LB-01

**Tools**: MCP filesystem · Skill tlc-spec-driven Execute

**Done when**:

- [ ] Qualifying submit persists; non-qualifying rejected per AD-016
- [ ] GET returns ordered list
- [ ] Gate: `npx nx test server`

**Tests**: unit  
**Gate**: quick (server)  
**Commit**: `feat(api): add Hobby serverless leaderboard route`

---

### T11: Auto-confirm “Ver em Minhas sessões”

**What**: CTA confirms pending session, closes modal, opens dashboard.  
**Where**: `client/src/ui/result-panel.ts`, session confirm orchestration, tests  
**Depends on**: None (client UX; better after T8)  
**Reuses**: `session-confirm-modal.ts`  
**Requirement**: UX-01

**Tools**: MCP filesystem · Skill tlc-spec-driven Execute

**Done when**:

- [ ] With pending confirm: upsert runs, modal absent, sessions UI opens
- [ ] Without pending: opens sessions only
- [ ] Upsert failure: error shown; no stuck modal over dashboard
- [ ] Gate: `npx nx test client`

**Tests**: unit  
**Gate**: quick (client)  
**Commit**: `fix(sessions): auto-confirm before opening sessions dashboard`

---

### T12: Canvas undo / redo

**What**: History stack (max 50), Ctrl/Cmd+Z, Ctrl+Y / Shift+Z, mobile buttons.  
**Where**: `client/src/canvas/history.ts`, canvas wiring, `__GAME_STATE__`, tests  
**Depends on**: None  
**Reuses**: graph normalize / game state  
**Requirement**: UX-02

**Tools**: MCP filesystem · Skill tlc-spec-driven Execute

**Done when**:

- [ ] Mutate → undo restores prior graph via `__GAME_STATE__`
- [ ] Redo works; divergent edit clears redo
- [ ] Empty undo is no-op; mobile buttons ≥44px when coarse/≤768
- [ ] Gate: `npx nx test client`

**Tests**: unit  
**Gate**: quick (client)  
**Commit**: `feat(canvas): add undo/redo history stack`

---

### T13: Share design via URL hash

**What**: Encode/decode compact share payload; Share action; bootstrap restore; oversize guard.  
**Where**: `client/src/share/codec.ts`, bootstrap, UI control, tests  
**Depends on**: None  
**Reuses**: `ArchitectureGraph`  
**Requirement**: UX-03

**Tools**: MCP filesystem · Skill tlc-spec-driven Execute

**Done when**:

- [ ] Roundtrip encode/decode preserves problemId + graph
- [ ] Oversize → no hash write; message + export offer hook
- [ ] Malformed hash ignored safely
- [ ] Gate: `npx nx test client`

**Tests**: unit  
**Gate**: quick (client)  
**Commit**: `feat(share): compact architecture share via URL hash`

---

### T14: Progress % by difficulty

**What**: Per-tier completion percent + persistent badge on library filters.  
**Where**: `client/src/storage/progress.ts` (helper), `problem-library.ts`, tests  
**Depends on**: T4 (library chrome; can soft-depend)  
**Reuses**: `isQualifyingCompletion` / completions map  
**Requirement**: UX-04

**Tools**: MCP filesystem · Skill tlc-spec-driven Execute

**Done when**:

- [ ] easy/medium/hard show `completed/total` percent
- [ ] Recording completion updates %; reload persists
- [ ] Gate: `npx nx test client`

**Tests**: unit  
**Gate**: quick (client)  
**Commit**: `feat(library): show progress percent by difficulty`

---

### T15: Continuar de onde parei

**What**: Home/library shortcut to latest `in_progress` session.  
**Where**: `client/src/ui/problem-library.ts` (+ bootstrap), tests  
**Depends on**: T8 (list API reliable)  
**Reuses**: sessions-api list, dashboard reopen path  
**Requirement**: UX-05

**Tools**: MCP filesystem · Skill tlc-spec-driven Execute

**Done when**:

- [ ] `data-testid="continue-session"` when in_progress exists; hidden otherwise
- [ ] Click opens that session canvas
- [ ] Empty nickname → hidden / no remote call
- [ ] Gate: `npx nx test client`

**Tests**: unit  
**Gate**: quick (client)  
**Commit**: `feat(library): continue in-progress session shortcut`

---

### T16: Export JSON / SVG / PNG (+ optional Blob)

**What**: Client downloads; optional Blob upload when token configured.  
**Where**: `client/src/export/*`, optional `server/src/vercel/api-export.ts`, tests  
**Depends on**: None  
**Reuses**: graph JSON; blueprint DOM/SVG  
**Requirement**: BLOB-01

**Tools**: MCP filesystem · Skill tlc-spec-driven Execute

**Done when**:

- [ ] JSON export contains session/graph fields without Blob env
- [ ] SVG and/or PNG path does not throw without Blob
- [ ] With mocked Blob, URL returned
- [ ] Gate: `npx nx test client` (+ server if handler added)

**Tests**: unit  
**Gate**: quick (client) or full if server handler  
**Commit**: `feat(export): session JSON and diagram snapshot export`

---

### T17: Edge Config flags

**What**: Load maintenance / new-problem flags; banner + block start when maintenance.  
**Where**: `client/src/config/edge-flags.ts`, library bootstrap, tests  
**Depends on**: T4  
**Reuses**: library banner slot  
**Requirement**: EDGE-01

**Tools**: MCP filesystem · Skill tlc-spec-driven Execute

**Done when**:

- [ ] `maintenance: true` → banner + cannot start new session
- [ ] Unreachable config → fail-open (playable)
- [ ] `newProblemIds` / bannerText reflected when present
- [ ] Gate: `npx nx test client`

**Tests**: unit  
**Gate**: quick (client)  
**Commit**: `feat(config): Edge Config maintenance and promo flags`

---

### T18: Daily Cron cleanup + warm-up

**What**: Secured cron route; delete sessions >90d; daily stats key; judge warm-up; vercel cron config.  
**Where**: `server/src/vercel/api-cron.ts`, tests, `vercel.json`  
**Depends on**: T6, T7  
**Reuses**: KvSessionStore  
**Requirement**: CRON-01

**Tools**: MCP filesystem · Skill tlc-spec-driven Execute

**Done when**:

- [ ] Unauthorized → 401
- [ ] Cleanup predicate unit-tested (90 days)
- [ ] Warm-up invoked once per run (mocked fetch)
- [ ] Aggregate errors do not fail job
- [ ] Gate: `npx nx test server`

**Tests**: unit  
**Gate**: quick (server)  
**Commit**: `feat(api): daily cron cleanup and judge warm-up`

---

### T19: Web Analytics events

**What**: `track()` wrapper; phase + abandon events.  
**Where**: `client/src/analytics/track.ts`, phase-navigation hooks, tests  
**Depends on**: None  
**Reuses**: phase navigation  
**Requirement**: ANALYTICS-01

**Tools**: MCP filesystem · Skill tlc-spec-driven Execute

**Done when**:

- [ ] Events for requirements/canvas/result phases
- [ ] Abandon on pagehide without result (spy)
- [ ] Unavailable analytics → no-op
- [ ] Gate: `npx nx test client`

**Tests**: unit  
**Gate**: quick (client)  
**Commit**: `feat(analytics): phase and abandon event tracking`

---

### T20: Neon skip checklist + STATE + env docs

**What**: Confirm KV covers history/stats (NEON-01 no Neon); update STATE Handoff; `.env.example` KV/Blob/Edge/Cron.  
**Where**: `.specs/STATE.md`, `.env.example`, design Risks note if needed  
**Depends on**: T6–T10, T18  
**Reuses**: AD-025  
**Requirement**: NEON-01

**Tools**: MCP filesystem · Skill tlc-spec-driven Execute

**Done when**:

- [ ] Written confirmation: Neon not introduced; KV sufficient for listed queries
- [ ] STATE Handoff points at feature status / env checklist
- [ ] `.env.example` documents required Hobby vars
- [ ] Gate: `npx nx run-many -t lint test`

**Tests**: none  
**Gate**: build  
**Commit**: `docs(hobby-platform): finalize STATE and env; defer Neon`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 → T2 → T3 → T4 → T5
Phase 2:  T6 → T7 → T8 → T9 → T10
Phase 3:  T11 → T12 → T13 → T14 → T15
Phase 4:  T16 → T17 → T18 → T19 → T20
```

**Batches (~5 tasks each):** B1=P1, B2=P2, B3=P3, B4=P4. After last commit → automatic Verifier.

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 Locale storage | 1 module | ✅ |
| T2 Catalogs + t() | 1 cohesive i18n layer | ✅ |
| T3 Problem bilingual data | 1 schema + catalog data | ⚠️ large data, single deliverable |
| T4 Library buttons | 1 UI surface | ✅ |
| T5 Judge locale | 1 cross-cut feature slice | ⚠️ shared+server+client OK (one AC) |
| T6–T10 KV/API | 1 store or 1 handler each | ✅ |
| T11–T15 UX | 1 behavior each | ✅ |
| T16–T19 Ops features | 1 feature each | ✅ |
| T20 Docs/STATE | docs only | ✅ |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
| ---- | ----------------- | ------------- | ------ |
| T1 | None | (start) | ✅ |
| T2 | T1 | T1→T2 | ✅ |
| T3 | None | parallel before T4 | ✅ (T4 depends T3) |
| T4 | T1,T2,T3 | T1–T3→T4 | ✅ |
| T5 | T1 | after T1 | ✅ |
| T6 | None | Phase2 start | ✅ |
| T7 | T6 | T6→T7 | ✅ |
| T8 | T7 | T7→T8 | ✅ |
| T9 | None | before T10 | ✅ |
| T10 | T9 | T9→T10 | ✅ |
| T11 | None | Phase3 (soft after T8) | ✅ |
| T12 | None | Phase3 | ✅ |
| T13 | None | Phase3 | ✅ |
| T14 | T4 soft | Phase3; body notes T4 | ✅ |
| T15 | T8 | body T8; diagram Phase3 after P2 | ✅ |
| T16 | None | Phase4 | ✅ |
| T17 | T4 | body T4 | ✅ |
| T18 | T6,T7 | body | ✅ |
| T19 | None | Phase4 | ✅ |
| T20 | T6–T10,T18 | end | ✅ |

Phase order ensures T15/T17/T18/T20 deps from earlier phases complete first. Intra-phase T12–T14 listed sequential for worker simplicity (no hard deps).

---

## Test Co-location Validation

| Task | Layer | Matrix Requires | Task Says | Status |
| ---- | ----- | --------------- | --------- | ------ |
| T1 | i18n locale | unit | unit | ✅ |
| T2 | i18n catalogs | unit | unit | ✅ |
| T3 | localized problems | unit | unit | ✅ |
| T4 | library UI | unit | unit | ✅ |
| T5 | judge locale | unit | unit | ✅ |
| T6 | KvSessionStore | unit | unit | ✅ |
| T7 | vercel handler | unit | unit | ✅ |
| T8 | sessions-api | unit | unit | ✅ |
| T9 | KvLeaderboardStore | unit | unit | ✅ |
| T10 | vercel handler | unit | unit | ✅ |
| T11 | auto-confirm UI | unit | unit | ✅ |
| T12 | canvas undo | unit | unit | ✅ |
| T13 | share codec | unit | unit | ✅ |
| T14 | progress UI | unit | unit | ✅ |
| T15 | continue UI | unit | unit | ✅ |
| T16 | export | unit | unit | ✅ |
| T17 | edge flags | unit | unit | ✅ |
| T18 | cron | unit | unit | ✅ |
| T19 | analytics | unit | unit | ✅ |
| T20 | docs/config | none | none | ✅ |

---

## Requirement Traceability (tasks)

| ID | Tasks |
| -- | ----- |
| LOCALE-01 | T2, T4 |
| LOCALE-02 | T3, T4 |
| LOCALE-03 | T5 |
| LOCALE-04 | T1, T5 |
| SESS-01 | T6, T7 |
| SESS-02 | T8 |
| LB-01 | T9, T10 |
| UX-01 | T11 |
| UX-02 | T12 |
| UX-03 | T13 |
| UX-04 | T14 |
| UX-05 | T15 |
| BLOB-01 | T16 |
| EDGE-01 | T17 |
| CRON-01 | T18 |
| ANALYTICS-01 | T19 |
| NEON-01 | T20 |

**Coverage:** 17 requirements → mapped; 0 unmapped.
