# Hobby Platform Validation

**Date**: 2026-07-28
**Spec**: `.specs/features/hobby-platform/spec.md`
**Diff range**: `main...HEAD` (`e2435e2`…`65bf007`; Execute tip `e2ff622` + docs Verifier start)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1–T5 | ✅ Done | Locale foundation (`ba6f3e1`…`480e4d7`) |
| T6–T10 | ✅ Done | KV sessions + leaderboard (`de2dcad`…`8165ba4`) |
| T11–T15 | ✅ Done | UX list (`a03c959`…`c9a3618`) |
| T16–T20 | ✅ Done | Ops + Neon defer (`d43984b`…`e2ff622`) |

All tasks marked Execute-complete in `tasks.md`. No blocked/partial tasks.

---

## Spec-Anchored Acceptance Criteria

### P1: Locale switch EN / PT-BR

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| AC1 locale controls + active state | `locale-en` / `locale-pt-BR`; PT-BR active by default | `client/src/ui/problem-library.test.ts:176-188` — `toBeTruthy()`; `--active` on pt-BR | ✅ PASS |
| AC2 persist `sdq-locale` + update UI without reload | storage + remount / click updates strings | `client/src/i18n/locale.test.ts:38-45` — `LOCALE_STORAGE_KEY`; `problem-library.test.ts:191-239` — EN→PT titles | ✅ PASS |
| AC3 titles/briefs/requirement labels in locale | bilingual copy for every problem | `libs/shared/src/problems/localize-problem.test.ts:7-23,33-47` — title/description/constraints/suggestedRequirements | ✅ PASS |
| AC4 Judge receives `locale` + narrative in locale | en vs pt-BR strengths/nextStep; client POST locale | `server/src/judge/locale.test.ts:48-62`; `client/src/session/phase-navigation.test.ts:551+`; `locale-payload.test.ts:13-18` | ✅ PASS |
| AC5 no stored locale → `pt-BR` | `getLocale()` / `DEFAULT_LOCALE` = `pt-BR` | `client/src/i18n/locale.test.ts:33-35` — `toBe('pt-BR')` | ✅ PASS |
| AC6 industry names stay English | jargon / component types English in both locales | `client/src/i18n/t.test.ts:75-78`; `localize-problem.test.ts:50-58` — `expectedComponents` equal; `load_balancer` | ✅ PASS |

### P1: KV-backed sessions

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 PUT persists to KV (nickname + id) | `sess:{id}` + `sessidx:{nickname}` | `server/src/sessions/kv-store.test.ts:90-99` — `kv.store.has('sess:a')`; `smembers('sessidx:alice')` | ✅ PASS |
| AC2 GET list from KV / same shape | `{ nickname, sessions }` | `server/src/vercel/api-sessions.test.ts:50-85` — status 200; `sessions: [{ id: 'sess-1' }]` | ✅ PASS |
| AC3 KV unavailable → localStorage + notice | fallback + `onFallbackNotice` | `client/src/sessions/sessions-api.test.ts:252-271` — `sdq-sessions`; `onFallbackNotice` called | ✅ PASS |
| AC4 prefer newer `updatedAt` | LWW merge | `sessions-api.test.ts:179-250` — remote/local newer wins | ✅ PASS |
| AC5 Fastify local SessionStore remains | injectable / InMemory path | `server/src/routes/sessions.test.ts` + `InMemorySessionStore`; `createKvSessionStore` injectable (`kv-store.test.ts:133-136`) | ✅ PASS |

### P1: KV leaderboard

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 POST qualifying → store in KV | 201 + entry | `server/src/vercel/api-leaderboard.test.ts:29-48` — `status 201`; `kv-store.test.ts:81-87` add/list | ✅ PASS |
| AC2 GET ordered + cap ~50 | Spec text: score desc then time asc; **design/AD speedrun: elapsedMs asc, score desc** | `kv-store.test.ts:99-118` — order `['b','c','a']`; length 50 | ⚠️ Spec-precision gap (literal AC vs design.md §Leaderboard ordering) |
| AC3 KV down → soft write + empty/error read | server 503; client error UI | Server: `api-leaderboard.test.ts:95-104` — `503`. Client panel catch exists (`leaderboard-panel.ts:178-180`) but **no test** asserts error copy / soft write continues | ⚠️ Spec-precision gap / shallow client |

### P1: Auto-confirm “Ver em Minhas sessões”

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 pending confirm → upsert, dismiss modal, open sessions | upsert called; modal null; `onOpenSessions` | `client/src/session/phase-navigation.test.ts:460-485` | ✅ PASS |
| AC2 no pending → open sessions only | no extra upsert | `phase-navigation.test.ts:488-515` | ✅ PASS |
| AC3 upsert fail → error; no stuck modal over dashboard | error text; dashboard null | `phase-navigation.test.ts:518-548` | ✅ PASS |

### P2: Undo / redo

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 mutate → undo stack max 50 | `GRAPH_HISTORY_MAX` steps | `client/src/canvas/history.test.ts:58-69` — `steps === GRAPH_HISTORY_MAX` (50) | ✅ PASS |
| AC2 Ctrl/Cmd+Z restores | `__GAME_STATE__.graph` length 0 after undo | `blueprint-canvas.test.ts:487-498` — Ctrl+Z | ✅ PASS |
| AC3 Ctrl+Y / Ctrl+Shift+Z redo | redo restores | `blueprint-canvas.test.ts:501-504` — Ctrl+Y; Shift+Z implemented (`blueprint-canvas.ts:699`) but **not separately asserted** | ⚠️ Spec-precision gap (Shift+Z path) |
| AC4 coarse/≤768 Undo/Redo ≥44px | visible bar; CSS min 44px | `blueprint-canvas.test.ts:519-532` | ✅ PASS |
| AC5 edit after undo clears redo | `canRedo() === false` | `history.test.ts:46-55`; canvas `:506-508` | ✅ PASS |

### P2: Share via URL

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 Share → hash + copy | status `shared`; hash written; copy called | `share-design.test.ts:19-35` | ✅ PASS |
| AC2 valid hash → restore without nickname | bootstrap opens canvas; empty nickname | `bootstrap.test.ts:100-140`; `share-design.test.ts:70-79` | ✅ PASS |
| AC3 oversize ~8KB → refuse + export hook | `reason: 'oversize'`; no hash | `codec.test.ts:45-62`; `share-design.test.ts:38-66` | ✅ PASS |
| AC4 malformed → ignore + library | library mounted | `bootstrap.test.ts:143-149`; `codec.test.ts:65-69` | ✅ PASS (optional toast not asserted) |

### P2: Progress %

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 filters show % completed/total | `library-filter-percent-easy` | `problem-library.test.ts:101-117`; `progress.test.ts:94-102` | ✅ PASS |
| AC2 qualifying completion updates + persists | remount keeps % | `problem-library.test.ts:119-123`; `progress.test.ts:104-109` | ✅ PASS |
| AC3 locale change → labels update, % unchanged | same percent after locale toggle | No combined assertion (locale + percent in one test) | ⚠️ Spec-precision gap |

### P2: Continuar de onde parei

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 show `continue-session` for latest in_progress | visible; newest id | `problem-library.test.ts:241-296` | ✅ PASS |
| AC2 activate → open session canvas path | `onContinueSession` with latest | `:293-296` | ✅ PASS |
| AC3 none → hidden | hidden when empty list | `:318-334` | ✅ PASS |

### P2: Blob export

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 Export JSON (+ optional Blob URL) | graph fields; mocked Blob URL | `export-session.test.ts:29-62,92-103` | ✅ PASS |
| AC2 SVG/PNG download | no throw; `<svg` body | `:65-89` | ✅ PASS |
| AC3 no Blob env → client download works | `blobUrl` undefined | `:47-48,72` | ✅ PASS |

### P2: Edge Config

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 maintenance → banner + block start | banner; study disabled | `problem-library.test.ts:337-361` | ✅ PASS |
| AC2 newProblemIds / bannerText | badge + banner | `:364-388` | ✅ PASS |
| AC3 unreachable → fail-open | study enabled; start works | `edge-flags.test.ts:33-42`; `problem-library.test.ts:391-414` | ✅ PASS |

### P3: Cron

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 auth + delete >90d | 401 unauthorized; old deleted | `api-cron.test.ts:128-137,153-191`; predicate `:107-109` | ✅ PASS |
| AC2 warm-up judge once | `fetchFn` once POST | `:192-196` | ✅ PASS |
| AC3 aggregate errors do not fail job | 200; `statsWritten: false` | `:200-223` | ✅ PASS |

### P3: Web Analytics

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 phase events | requirements/canvas/result | `track.test.ts:14-25`; `phase-navigation.test.ts:589+` | ✅ PASS |
| AC2 abandon with problemId + phase | once on pagehide | `track.test.ts:28-45` | ✅ PASS |
| AC3 unavailable → no-op | no throw | `track.test.ts:10-11` | ✅ PASS |

### P3: Neon conditional

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1 KV sufficient → no Neon | design checklist + STATE | `design.md` NEON-01 checklist; `.env.example` Neon deferred; `STATE.md` AD-025 | ✅ PASS |
| AC2 Neon only if documented gap | no Neon code introduced | Diff review: no Neon client/API | ✅ PASS |

**Status**: ⚠️ Spec-precision gaps flagged (core AC outcomes covered; 5 precision/shallow gaps)

---

## Discrimination Sensor

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 | `client/src/i18n/locale.ts:4` | `DEFAULT_LOCALE` `pt-BR` → `en` | ✅ Killed — 7 failures (`locale.test`, `locale-payload`, library default PT) |
| 2 | `server/src/leaderboard/kv-store.ts:22` | `elapsedMs <` → `>` (best-entry inverted) | ✅ Killed — `isBetterLeaderboardEntry` + keep-best tests |
| 3 | `client/src/share/codec.ts:70` | oversize guard disabled (`if (false && …)`) | ✅ Killed — `codec.test` + `share-design` oversize |

**Sensor depth**: lightweight (3 targeted behavior faults)
**Result**: 3/3 killed — PASS ✅
**Scratch**: mutations applied on main working tree then discarded via `git checkout -- <file>`; detached worktree `/tmp/sdq-hobby-sensor` removed (no node_modules). Working tree clean after sensor.

---

## Interactive UAT Results

Not performed (automated Verifier only; feature is user-facing — orchestrator may schedule interactive UAT for locale toggle, share hash, continue shortcut).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ |
| No scope creep | ✅ (Neon deferred as specified) |
| Matches patterns | ✅ (thin `api/*`, injectable stores) |
| Spec-anchored outcome check | ⚠️ (see precision gaps) |
| Per-layer Coverage Expectation met | ✅ (matrix layers have unit tests) |
| Every test maps to a spec requirement — no unclaimed tests | ✅ (hobby-platform tests map to ACs/edges/Done-when) |
| Documented guidelines followed | ✅ `AGENTS.md`, tasks.md coverage matrix |

---

## Edge Cases

- [ ] Locale mid-canvas → labels re-render; graph unchanged — **NOT tested** (locale controls live on library; mid-canvas path unclear)
- [x] Share hash vs normal routing → share first load — `bootstrap.test.ts:100-140`
- [x] Empty nickname → continue hidden / no remote — `problem-library.test.ts:299-315`
- [x] Empty undo → no-op — `history.test.ts:39-43`; canvas `:514`
- [x] Two devices same session → newer `updatedAt` — LWW tests in `sessions-api.test.ts`
- [x] Leaderboard keep best — elapsedMs-primary (`kv-store.test.ts:81-87`); edge text says “best score” — ⚠️ wording vs speedrun semantics

---

## Gate Check

- **Gate command**: `npx nx run-many -t lint test`
- **Result**: exit **0** — Successfully ran targets lint, test for 3 projects
- **Per-project tests**: shared **85** passed; client **384** passed; server **112** passed
- **Total**: **581** passed, **0** failed
- **Lint**: 0 errors (warnings only: shared 9, client 196, server 12 — non-blocking)
- **Test count before feature**: not re-run on `main` this session; Batch 4 recorded 581 after T20 (delta positive vs pre-feature; new suites added across i18n/KV/UX/ops)
- **Skipped tests**: none observed
- **Failures**: none

---

## Fix Plans (if issues found)

### Fix 1 (optional): Assert leaderboard client soft-fail / error UI

- **Root cause**: LB AC3 client read error path and soft write lack discriminating tests
- **Fix task**: Add `leaderboard-panel` test for fetch reject → “Não foi possível carregar”; phase-nav test that speedrun submit continues when `submitLeaderboardScore` rejects
- **Priority**: Minor

### Fix 2 (optional): Align LB AC wording in spec with design

- **Root cause**: Spec AC says score-desc; implementation/design correctly keep speedrun elapsedMs-asc
- **Fix task**: Edit `spec.md` LB AC2 (+ edge “best score”) to match design.md interpretation
- **Priority**: Cosmetic / docs

### Fix 3 (optional): Progress % + locale combined test; Ctrl+Shift+Z; mid-canvas locale

- **Root cause**: Spec-precision gaps
- **Fix task**: One library test toggling locale while asserting percent unchanged; keyboard Shift+Z redo; document or test mid-canvas locale behavior
- **Priority**: Minor

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| LOCALE-01..04 | Design/Pending in spec table | ✅ Verified |
| SESS-01..02 | Design/Pending | ✅ Verified |
| LB-01 | Design/Pending | ⚠️ Verified (ordering wording gap) |
| UX-01..05 | Design/Pending | ✅ Verified (UX-04 AC3 precision gap) |
| BLOB-01 | Design/Pending | ✅ Verified |
| EDGE-01 | Design/Pending | ✅ Verified |
| CRON-01 | Design/Pending | ✅ Verified |
| ANALYTICS-01 | Design/Pending | ✅ Verified |
| NEON-01 | Design/Pending | ✅ Verified |

*(Verifier does not mutate `spec.md` requirement table — statuses recorded here only.)*

---

## Summary

**Overall**: ✅ Ready (PASS with non-blocking spec-precision gaps)

**Spec-anchored check**: 41/46 ACs fully matched spec/design outcome | 5 spec-precision gaps
**Sensor**: 3/3 mutations killed
**Gate**: 581 passed, 0 failed

**What works**: Bilingual locale + Judge; KV sessions/LWW/fallback; KV leaderboard (speedrun order); auto-confirm CTA; undo/redo; share hash + oversize; progress %; continue shortcut; export; Edge flags; cron auth/cleanup; analytics; Neon deferred.

**Issues found**: Spec LB sort text vs speedrun order; client LB soft-fail UI untested; progress+locale combo untested; Ctrl+Shift+Z and mid-canvas locale untested.

**Next steps**: Optional Fix 1–3; interactive UAT for locale/share/continue; merge after orchestrator accepts PASS-with-gaps.
