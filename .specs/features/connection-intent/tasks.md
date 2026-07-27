# Connection Intent — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design:** `.specs/features/connection-intent/design.md`  
**Spec:** `.specs/features/connection-intent/spec.md`  
**Context:** `.specs/features/connection-intent/context.md`  
**Branch:** `feature/playground-parity`  
**Status:** Approved 2026-07-27 — ready for Execute (prefer fresh chat)  

**Gate (feature):** `npx nx run-many -t lint test`

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `AGENTS.md` (Vitest, `__GAME_STATE__`, no WebGL, deterministic, no wall-clock sleeps, >10s/file = defect), existing `client/src/blueprint/*.test.ts`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Intent catalog / heuristic (domain) | unit | 1:1 CI-03 destination→label branches; catalog shortLabels; CUSTOM resolve; DB dual-id → same shortLabel | `client/src/blueprint/connection-intents.test.ts` | `npx nx test client` |
| SVG edge layer (pills + activate) | unit | CI-01 pill present/absent/update/selected; CI-02 path/pill activate via delegation; no packet regression (curve still `C`/`Q`) | `client/src/blueprint/svg-edges.test.ts` | `npx nx test client` |
| Intent popover UI | unit | CI-02 title + 4 rows + select callback; CUSTOM header; CI-05 ≤375px / ≤640px sheet bounds within viewport mock | `client/src/blueprint/connection-intent-popover.test.ts` | `npx nx test client` |
| Blueprint canvas wiring | unit via `__GAME_STATE__` | CI-02 select+menu+label update+delete+Escape; CI-03 heuristic on connect; mutual exclusion with node popover; CI-05 pointer on edge opens menu | `client/src/blueprint/blueprint-canvas.test.ts` | `npx nx test client` |
| Deploy config (`vercel.json`) | none | — (build/lint via full gate; manual/MCP preview URL) | repo root | full gate + MCP deploy |

## Gate Check Commands

> Generated from codebase — confirm before Execute.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After client unit tasks | `npx nx test client` |
| Full | Phase end / feature / before deploy | `npx nx run-many -t lint test` |
| Build | Config-only / deploy prep | `npx nx run client:build` (or project equivalent) + full gate |

---

## Execution Plan

Phases are ordered and run sequentially.

```
Phase 1 (Catalog):   T1
Phase 2 (SVG):       T2
Phase 3 (Popover):   T3
Phase 4 (Canvas):    T4 → T5
Phase 5 (Release):   T6 → T7
```

**Execute packing:** 7 tasks ≤ ~8 → **single inline batch** (no sub-agent offer required). Recommend **new chat** for Execute (Context AMBER).

---

## Task Breakdown

### T1: Intent catalog + destination heuristic

**What:** Pure module `CONNECTION_INTENTS`, `defaultLabelForDestination`, `resolveMenuSelection` (+ session-Map helper for DB role if colocated).  
**Where:** `client/src/blueprint/connection-intents.ts`, `connection-intents.test.ts`  
**Depends on:** None  
**Reuses:** `@sdq/shared` `ComponentType`  
**Requirement:** CI-03, CI-02 (catalog rows / CUSTOM)

**Tools:**

- MCP: NONE (local files)
- Skill: `tlc-spec-driven` (Execute)

**Done when:**

- [x] Four options: `req`, `db-default`, `db-origin-fallback`, `cache` with shortLabels `REQ`|`DB`|`CACHE`
- [x] Heuristic: cache/cdn→CACHE; sql/nosql/object/search→DB; else→REQ
- [x] `resolveMenuSelection` returns active id / `'custom'` / null for empty
- [x] Unit tests cover all CI-03 branches + CUSTOM + dual DB → `DB`
- [x] Gate: `npx nx test client` PASS
- [x] Commit: `feat(client): connection intent catalog and destination heuristic`

**Tests:** unit  
**Gate:** quick

---

### T2: Edge pills + SVG event delegation

**What:** Replace plain `<text>` with pill (`[data-testid="edge-label"]`); selected styling; `pointerdown` delegated on SVG root → `onEdgeActivate(edgeId)`; preserve Bezier + packets.  
**Where:** `client/src/blueprint/svg-edges.ts`, `svg-edges.test.ts`  
**Depends on:** None (catalog not required for render)  
**Reuses:** `curvePath`, `pointOnEdgeCurve`, existing sync API  
**Requirement:** CI-01, CI-02 (activate surface)

**Tools:**

- MCP: NONE
- Skill: `tlc-spec-driven` (Execute)

**Done when:**

- [x] Non-empty label → pill at mid-curve with label text; empty/absent → no pill
- [x] `setSelected` / sync reflects selected edge visually
- [x] Label update on re-sync updates pill text without remounting canvas host
- [x] Delegation survives `innerHTML` clear; activates for path and pill
- [x] Existing PP-04 curve/packet tests still green
- [x] Gate: `npx nx test client` PASS
- [x] Commit: `feat(client): pill edge labels and SVG edge activation`

**Tests:** unit  
**Gate:** quick

---

### T3: CONNECTION INTENT popover (+ mobile sheet)

**What:** Mount/open/close/destroy popover mirroring config-popover; catalog rows; header role; CUSTOM; ≤640px bottom-sheet / clamp.  
**Where:** `client/src/blueprint/connection-intent-popover.ts`, `connection-intent-popover.test.ts`  
**Depends on:** T1  
**Reuses:** `config-popover.ts` mount/styles pattern; T1 catalog  
**Requirement:** CI-02, CI-05

**Tools:**

- MCP: NONE
- Skill: `tlc-spec-driven` (Execute)

**Done when:**

- [ ] `[data-testid="connection-intent"]` with title `CONNECTION INTENT`
- [ ] Lists four intents with short code + role + description; onSelect passes option id
- [ ] Custom label → header `CUSTOM`, no row selected
- [ ] Viewport mock 375×667 (and/or width ≤640): open → `getBoundingClientRect` within viewport
- [ ] Gate: `npx nx test client` PASS
- [ ] Commit: `feat(client): connection intent popover with viewport-safe layout`

**Tests:** unit  
**Gate:** quick

---

### T4: Canvas wire — select, heuristic create, apply intent

**What:** On edge activate: `selectedEdgeId`, clear node selection, close config popover, open intent popover; on connect use `defaultLabelForDestination(to.type)`; pick updates `edge.label` + sync + `__GAME_STATE__`.  
**Where:** `client/src/blueprint/blueprint-canvas.ts`, `blueprint-canvas.test.ts`  
**Depends on:** T1, T2, T3  
**Reuses:** `connectForTest`, edge layer callback, config popover close  
**Requirement:** CI-02 (AC1–4), CI-03, CI-05 (pointer opens menu)

**Tools:**

- MCP: NONE
- Skill: `tlc-spec-driven` (Execute)

**Done when:**

- [ ] Pointer on path/pill → `selectedEdgeId` set; intent popover visible; node config closed
- [ ] Connect app→cache → `CACHE`; →sql → `DB`; client→lb → `REQ`
- [ ] Choosing menu row updates graph label and pill; republishes `__GAME_STATE__`
- [ ] Gate: `npx nx test client` PASS
- [ ] Commit: `feat(client): wire edge select, heuristic labels, and intent apply`

**Tests:** unit (`__GAME_STATE__`)  
**Gate:** quick

---

### T5: Escape / canvas dismiss + Delete edge

**What:** Escape or background tap closes intent + may clear edge selection; Delete/Backspace removes selected edge when focus not in input.  
**Where:** `client/src/blueprint/blueprint-canvas.ts`, `blueprint-canvas.test.ts`  
**Depends on:** T4  
**Reuses:** existing keyboard handlers for node delete if present  
**Requirement:** CI-02 (AC5–6)

**Tools:**

- MCP: NONE
- Skill: `tlc-spec-driven` (Execute)

**Done when:**

- [ ] Escape / canvas background closes `[data-testid="connection-intent"]`
- [ ] Delete/Backspace with `selectedEdgeId` removes edge and clears selection
- [ ] Focus in input does not delete edge
- [ ] Full gate: `npx nx run-many -t lint test` PASS
- [ ] Commit: `feat(client): dismiss intent popover and delete selected edge`

**Tests:** unit (`__GAME_STATE__`)  
**Gate:** full

---

### T6: Static client Hobby deploy config

**What:** Add `vercel.json` (or documented root config) so Vercel Hobby serves Vite client `dist/client` (or monorepo equivalent); document `VITE_*` API URL for sessions/judge; no Fastify on Hobby in this task.  
**Where:** `vercel.json` (repo root), brief note in `.specs/STATE.md` Handoff or existing deploy docs if present  
**Depends on:** T5 (feature code complete before release config)  
**Reuses:** Design “static client first”  
**Requirement:** Success Criteria — Vercel Hobby preview path

**Tools:**

- MCP: `user-vercel` (inspect project patterns if needed)
- Skill: `deploy-to-vercel` (for next task; config only here)

**Done when:**

- [ ] Config points build/output at client static artifacts
- [ ] API deferred explicitly documented (Hobby client-only)
- [ ] `npx nx run client:build` (or project build) succeeds
- [ ] Full gate PASS
- [ ] Commit: `chore: vercel Hobby static client config for preview`

**Tests:** none  
**Gate:** build + full

---

### T7: Preview deploy via Vercel MCP

**What:** Deploy branch preview to team Spiral Out / Hobby via MCP; record preview URL in STATE Handoff.  
**Where:** Vercel project (no app code unless MCP requires link)  
**Depends on:** T6  
**Reuses:** `deploy-to-vercel` skill + `user-vercel` MCP  
**Requirement:** Success Criteria — preview URL

**Tools:**

- MCP: `user-vercel` (`deploy_to_vercel`, `list_teams`, …)
- Skill: `deploy-to-vercel`

**Done when:**

- [ ] Preview deployment succeeds (or failure reported with MCP error — do not fake URL)
- [ ] Preview URL written to `.specs/STATE.md` Handoff
- [ ] Commit only if STATE/docs change: `docs: record connection-intent Hobby preview URL` (skip empty commit)

**Tests:** none  
**Gate:** none (release); feature code already full-gated in T5/T6

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1
Phase 2:  T2
Phase 3:  T3
Phase 4:  T4 ──→ T5
Phase 5:  T6 ──→ T7
```

Execution is strictly sequential. 7 tasks → one inline Execute session (prefer fresh chat).

---

## Task Granularity Check

| Task | Scope | Status |
| ---- | ----- | ------ |
| T1: Catalog + heuristic | 1 module + tests | ✅ Granular |
| T2: Pills + delegation | 1 file cohesive change | ✅ Granular |
| T3: Intent popover | 1 component + tests | ✅ Granular |
| T4: Canvas select/heuristic/apply | 1 wiring concern | ✅ Granular |
| T5: Dismiss + delete | 1 UX concern | ✅ Granular |
| T6: vercel.json static | 1 config deliverable | ✅ Granular |
| T7: MCP preview deploy | 1 release step | ✅ Granular |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
| ---- | ----------------- | ------------- | ------ |
| T1 | None | (start) | ✅ Match |
| T2 | None | (start; parallel after T1 in plan order) | ✅ Match |
| T3 | T1 | T1 → T3 | ✅ Match |
| T4 | T1, T2, T3 | T1/T2/T3 → T4 | ✅ Match |
| T5 | T4 | T4 → T5 | ✅ Match |
| T6 | T5 | T5 → T6 | ✅ Match |
| T7 | T6 | T6 → T7 | ✅ Match |

Note: Plan sequences T1 then T2 for clean commits; T2 has no hard dep on T1 (diagram allows T2 after T1 without arrow from T1).

---

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| ---- | ---------- | --------------- | --------- | ------ |
| T1 | Intent catalog | unit | unit | ✅ OK |
| T2 | SVG edge layer | unit | unit | ✅ OK |
| T3 | Intent popover | unit | unit | ✅ OK |
| T4 | Blueprint canvas | unit `__GAME_STATE__` | unit | ✅ OK |
| T5 | Blueprint canvas | unit `__GAME_STATE__` | unit | ✅ OK |
| T6 | Deploy config | none | none | ✅ OK |
| T7 | Deploy release | none | none | ✅ OK |

---

## Requirement → Task map

| Req | Tasks |
| --- | ----- |
| CI-01 | T2 (+ T4 sync) |
| CI-02 | T1, T3, T4, T5 |
| CI-03 | T1, T4 |
| CI-05 | T3, T4 |
| CI-04 | — deferred |
| Deploy Hobby | T6, T7 |
