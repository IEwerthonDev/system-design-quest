# Playground Parity Validation

**Date**: 2026-07-27  
**Spec**: `.specs/features/playground-parity/spec.md`  
**Diff range**: `4b8c87a..HEAD` (includes fix commits `dfd4080`, `638ea33`)  
**Verifier**: independent sub-agent (author ≠ verifier)  
**Re-verify**: prior FAIL → re-check from scratch (evidence-or-zero)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1–T17 | ✅ Done | All Done-when checkboxes marked `[x]` in `tasks.md` |
| Fix: Bezier packets (`dfd4080`) | ✅ Done | PP-04 AC3 |
| Fix: reopen resubmit same id (`638ea33`) | ✅ Done | PP-08 AC2 |

---

## Spec-Anchored Acceptance Criteria

### PP-01 — Labels BOTTLENECK / QUEUEING + ms bar

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| AC1: running + hot → BOTTLENECK red | label text `BOTTLENECK`; red/hot class | `client/src/blueprint/blueprint-canvas.test.ts:219-220` — `expect(hotLabel?.textContent).toBe('BOTTLENECK')`; `expect(hotLabel?.className).toMatch(/load-label--hot\|load-label--red/)` | ✅ PASS |
| AC2: running + warn → QUEUEING yellow | label text `QUEUEING`; yellow/warn class | `blueprint-canvas.test.ts:240-241` — `expect(warnLabel?.textContent).toBe('QUEUEING')`; class match warn/yellow | ✅ PASS |
| AC3: running + ok → no BOTTLENECK/QUEUEING | load label hidden / no load text | `blueprint-canvas.test.ts:251-252` — `expect(okLabel?.hidden).toBe(true)`; `not.toMatch(/BOTTLENECK\|QUEUEING/)` | ✅ PASS |
| AC4: running → ms bar green/yellow/red | bar visible; color class by pressure; ms text | `blueprint-canvas.test.ts:221-224,242-243,253-254` — hot/warn/ok bar classes + `280`/`120` text | ✅ PASS |
| AC5: not running → labels/bar hidden | empty load label; ms bar hidden; latencyMs null | `blueprint-canvas.test.ts:256-260` — label `''`; `ms-bar.hidden === true`; `latencyMs` null | ✅ PASS |
| AC6: `__GAME_STATE__` exposes pressures (+ latencyMs) | pressures + latencyMs by nodeId when running | `blueprint-canvas.test.ts:229-230,239-244` — `gs.pressures?.[db]`; `gs.latencyMs?.[db]`; shared `evaluate-simulation.test.ts:78-101` | ✅ PASS |

### PP-02 — Speed + Traffic max 5×

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1: Speed slider 1–5 | `max="5"`; value 5 accepted | `client/src/ui/blueprint-chrome.test.ts:27,34-36` — `expect(speed.max).toBe('5')`; `settings.speed === 5` | ✅ PASS |
| AC2: Traffic slider 1–5 | `max="5"`; value 5 accepted | `blueprint-chrome.test.ts:28,30-32` — `expect(traffic.max).toBe('5')`; `settings.traffic === 5` | ✅ PASS |
| AC3: normalizeGraph clamps >5 → 5 | speed/traffic normalized to 5 | `libs/shared/src/schema/normalize-graph.test.ts:55-56` — `expect(high.simulation?.speed).toBe(5)`; traffic `5` | ✅ PASS |
| AC4: Speed change does not alter pressure | pressures equal at different speeds | `libs/shared/src/simulation/evaluate-simulation.test.ts:72-76,104-110` — `nodes`/`latencyMs` equal when only speed changes | ✅ PASS |

### PP-03 — Remover Dicas

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1: canvas phase → no hints-panel | `querySelector('[data-testid="hints-panel"]') === null` | `client/src/session/phase-navigation.test.ts:208,216-217` — `toBeNull()` on document/container | ✅ PASS |
| AC2: drawing flow still works without Dicas | canvas/submit usable without panel | `phase-navigation.test.ts:256-276` — advances to result with sidebar/modal; submit path intact | ✅ PASS |

### PP-04 — Conexões curvas

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1: edges use Bezier `C`/`Q`, not straight-only `L` | path `d` matches `/[CQ]/`; not straight-only | `client/src/blueprint/svg-edges.test.ts:10-16,52-53` — `toMatch(/[CQ]/)`; `not.toBe(straightOnly)` | ✅ PASS |
| AC2: preview/new connection curved | preview path has `C`/`Q` | `svg-edges.test.ts:65` — `expect(d).toMatch(/[CQ]/)` on `[data-testid="edge-preview"]` | ✅ PASS |
| AC3: packets follow curved path when sim running | packet `cx`/`cy` match Bezier sample, ≠ chord lerp | `svg-edges.test.ts:83-90,117-130` — `toBeCloseTo(pointOnEdgeCurve(...))`; `not.toBeCloseTo(chord)` | ✅ PASS *(prior FAIL — now evidenced)* |

### PP-05 — Judge sidebar + modal

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1: judge as right sidebar | `judge-sidebar`; CSS `right: 0` / `left: auto` | `client/src/ui/result-panel.test.ts:186-191` — testid + style regex; `phase-navigation.test.ts:276` | ✅ PASS |
| AC2: modal max-height ≤ viewport + internal scroll | `max-height: min(90dvh, 100%)`; `overflow-y: auto` | `client/src/ui/session-confirm-modal.test.ts:69-71` | ✅ PASS |
| AC3: ≤375px width usable; Confirmar/Voltar visible | fixture 375×667; actions present | `session-confirm-modal.test.ts:17-18,50-67` — Confirmar/Voltar in actions | ✅ PASS |
| AC4: close judge → canvas intact | after Voltar: phase canvas; graph preserved | `phase-navigation.test.ts:282-293` — phase `canvas`; `getGraph().nodes` length 1; result host hidden | ✅ PASS |

### PP-06 — Salvar Confirmar / Voltar

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1: Confirm persists via API with required fields | PUT upsert with id, problemId, nickname, graph, status, judgeResult | `phase-navigation.test.ts:314-321` — `objectContaining({ status, playerNickname, id })`; `server/src/routes/sessions.test.ts:29-33` — PUT 200 + body fields | ✅ PASS |
| AC2: PASS → `approved` | status `approved` | `libs/shared/src/schema/design-session.test.ts:6` — `verdictToSessionStatus('PASS')`; `phase-navigation.test.ts:343-345` | ✅ PASS |
| AC3: FAIL → `rejected` | status `rejected` | `design-session.test.ts:9-10` — `verdictToSessionStatus('FAIL').toBe('rejected')` (confirm path uses mapper at `phase-navigation.ts:227,395`) | ✅ PASS |
| AC4: PARTIAL → `partial` | status `partial` | `design-session.test.ts:13-14`; `phase-navigation.test.ts:315-317` | ✅ PASS |
| AC5: Voltar → `in_progress` + graph | upsert `status: 'in_progress'` + graph | `phase-navigation.test.ts:285-290` | ✅ PASS |
| AC6: same id upserts (no duplicate) | re-upsert same id → list length 1 | `server/src/sessions/service.test.ts:37-41` | ✅ PASS |
| AC7: 51st session evicts oldest | list ≤50; oldest id gone | `service.test.ts:44-65` — length `SESSION_CAP`; `sess-0` undefined | ✅ PASS |
| AC8: persist fail → message, no fake success | error text shown; stay on result | `phase-navigation.test.ts:368-373` — `session-confirm-error` = `'save failed'`; phase `result` | ✅ PASS |

### PP-07 — Dashboard histórico

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1: list filterable by Approved/Rejected/Partial/In Progress | four tabs; cards per status | `client/src/ui/sessions-dashboard.test.ts:130-143` | ✅ PASS |
| AC2: empty status → clear empty state | `sessions-empty` + “nenhuma sessão” | `sessions-dashboard.test.ts:163-166` | ✅ PASS |
| AC3: select session reopens saved graph | hydrate `__GAME_STATE__.graph` | `sessions-dashboard.test.ts:254-260` | ✅ PASS |
| AC4: card shows problem, status, updatedAt, score/verdict; nickname context | list has problem name, date, score/PASS | `sessions-dashboard.test.ts:126-128,141-148` | ✅ PASS |
| AC5: data from sessions API filtered by nickname | `listSessionsFn` called with nickname | `sessions-dashboard.test.ts:122-125` | ✅ PASS |

### PP-08 — Reabrir / re-submit

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1: reopen `in_progress` → graph + requirements + canvas | hydrate id/graph/reqs/phase | `session-store.test.ts:119+`; `sessions-dashboard.test.ts:254-260,278-281` | ✅ PASS |
| AC2: re-submit + confirm → same `id` + terminal status | upsert `id` unchanged; status ∈ approved\|rejected\|partial | `sessions-dashboard.test.ts:344-357` — `id: 'sess-reopen-confirm'`; `status: 'approved'`; terminal set | ✅ PASS *(prior FAIL — now evidenced)* |

**Status**: ✅ All ACs covered (34/34) — 0 spec-precision gaps flagged as blocking

---

## Discrimination Sensor

Scratch protocol: mutate production source → run targeted Vitest → `git checkout --` restore (worktree attempted; no `node_modules` there). Source tree clean after sensor.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 | `client/src/blueprint/svg-edges.ts:38-52` | `pointOnEdgeCurve` replaced with linear chord lerp | ✅ Killed — `svg-edges.test.ts` PP-04 AC3 (2 failures) |
| 2 | `client/src/session/phase-navigation.ts:187` | persist `id: session.id` → `id: \`new-${session.id}\`` | ✅ Killed — `sessions-dashboard.test.ts` reopen resubmit same-id assertion |
| 3 | `libs/shared/src/simulation/evaluate-simulation.ts:13-15` | swapped `ok:35` / `hot:280` latencyMs | ✅ Killed — `evaluate-simulation.test.ts` expected 280 got 35 |

**Sensor depth**: lightweight (3 behavior-level mutations)  
**Result**: 3/3 killed — PASS ✅

---

## Interactive UAT Results

Not performed (Verifier re-verify; automated evidence sufficient for this pass). Orchestrator may still offer optional UAT for visual polish.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ |
| No scope creep | ✅ |
| Matches patterns | ✅ (`__GAME_STATE__`, Vitest, Fastify inject, shared schema) |
| Spec-anchored outcome check | ✅ |
| Per-layer Coverage Expectation met | ✅ (shared domain, server store/routes, client UI/blueprint) |
| Every feature test maps to AC/edge/Done-when | ✅ |
| Documented guidelines: `AGENTS.md` testing principles | ✅ |

---

## Edge Cases

- [x] Speed/Traffic legacy >5 → normalize clamps — `normalize-graph.test.ts:49-56`
- [x] Sim running + empty graph → no label/bar required — vacuously satisfied (zero nodes); no crash path required beyond empty sync
- [x] PARTIAL → `partial` never collapsed — `design-session.test.ts:13-14`; confirm PUT partial
- [x] Corrupt JSON storage → empty list, no throw — `server/src/sessions/json-file-store.test.ts:39-46`
- [x] Double confirm same id → single record — `service.test.ts:37-41`
- [x] Low viewport height → modal scroll + actions — `session-confirm-modal.test.ts:69-71` (`max-height` + `overflow-y: auto`)
- [x] Near-coincident nodes → curved path no NaN — `svg-edges.test.ts:19-33` *(prior FAIL — now evidenced)*

---

## Gate Check

- **Gate command**: `npx nx run-many -t lint test`
- **Result**: ✅ Successfully ran targets lint, test for 3 projects (exit 0)
  - shared: 79 passed
  - client: 284 passed
  - server: 76 passed
  - **Total**: 439 passed, 0 failed
- **Lint**: 0 errors (warnings present; non-blocking)
- **Test count before feature** (`it(` at `4b8c87a`): 379
- **Test count after feature** (`it(` at `HEAD`): 424
- **Delta**: +45 tests
- **Skipped tests**: none observed in gate summary
- **Failures**: none

---

## Fix Plans

None — re-verify PASS.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| PP-01 | In Tasks / prior FAIL gaps unrelated | ✅ Verified |
| PP-02 | In Tasks | ✅ Verified |
| PP-03 | In Tasks | ✅ Verified |
| PP-04 | Prior FAIL (AC3 packets) | ✅ Verified |
| PP-05 | In Tasks | ✅ Verified |
| PP-06 | In Tasks | ✅ Verified |
| PP-07 | In Tasks | ✅ Verified |
| PP-08 | Prior FAIL (AC2 same-id resubmit) | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 34/34 ACs matched spec outcome | 0 blocking spec-precision gaps  
**Sensor**: 3/3 mutations killed  
**Gate**: 439 passed, 0 failed  

**What works**: Prior FAIL gaps (Bezier packet path, reopen→resubmit same id, near-coincident path) now have `file:line` + discriminating assertions; full gate green; sensor kills regressions.

**Issues found**: None

**Next steps**: Merge `feature/playground-parity` after any optional interactive UAT; no fix tasks.
