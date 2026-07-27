# Connection Intent Validation

**Date**: 2026-07-27  
**Spec**: `.specs/features/connection-intent/spec.md`  
**Diff range**: `d2aadbe^..HEAD` (docs approve `d2aadbe`; implementation from `c63174e`)  
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 | ✅ Done | Catalog + heuristic |
| T2 | ✅ Done | SVG pill labels + edge activation |
| T3 | ✅ Done | Connection intent popover |
| T4 | ✅ Done | Canvas wiring (select, heuristic connect, apply) |
| T5 | ✅ Done | Dismiss + Delete selected edge |
| T6 | ✅ Done | Vercel Hobby static config |
| T7 | ✅ Done | Preview URL recorded |
| CI-04 | ⏭️ Deferred | Linking preview pill — out of scope per spec |

---

## Spec-Anchored Acceptance Criteria

### CI-01 — Pill label na aresta (P1)

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| AC1: label non-empty → pill at path midpoint | `[data-testid="edge-label"]` with short label text at midpoint | `client/src/blueprint/svg-edges.test.ts:160-162` — `expect(pill).toBeTruthy()`; `expect(pill!.textContent).toContain('DB')` | ⚠️ Partial — text evidenced; midpoint position not asserted (impl: `svg-edges.ts:152-154` uses `pointOnEdgeCurve(..., 0.5)`) |
| AC2: label absent/empty → no pill | no `[data-testid="edge-label"]` | `svg-edges.test.ts:176,183` — `expect(...querySelector('[data-testid="edge-label"]')).toBeNull()` | ✅ PASS |
| AC3: edge selected → path/pill highlight | distinct selected stroke + pill selected state | `svg-edges.test.ts:224-227` — `stroke '#38bdf8'`; `stroke-width '2.5'`; `is-selected` or `data-selected='true'` | ✅ PASS |
| AC4: label update → pill reflects without remount | same SVG host; updated pill text | `svg-edges.test.ts:205-207` — `expect(layer.svg).toBe(host)`; pill text `CACHE` | ✅ PASS |

### CI-02 — Selecionar aresta + menu CONNECTION INTENT (P1)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1: click/tap path or pill → select edge, clear node popover, open menu | `selectedEdgeId` set; config popover hidden; `[data-testid="connection-intent"]` visible | `blueprint-canvas.test.ts:318-325` — `selectedEdgeId === edgeId`; intent `hidden === false`; config popover `hidden` | ✅ PASS |
| AC2: popover title + current role in header | title `CONNECTION INTENT`; role `DEFAULT` \| `ORIGIN FALLBACK` \| `REQUEST` \| `CACHE` \| `CUSTOM` | `connection-intent-popover.test.ts:43-44` — title `CONNECTION INTENT`; `81` — `CUSTOM` for legacy | ⚠️ Partial — title + CUSTOM role evidenced; catalog roles (`REQUEST`, `DEFAULT`, etc.) not asserted on open |
| AC3: menu lists DB+DEFAULT, DB+ORIGIN FALLBACK, REQ+REQUEST, CACHE | four rows with short code + role + description | `connection-intents.test.ts:15-29`; `connection-intent-popover.test.ts:46-52` — 4 rows; each contains `shortLabel`, `role`, `description` | ✅ PASS |
| AC4: choose intent → correct `label` + `__GAME_STATE__` | DB rows → `"DB"`; REQ → `"REQ"`; CACHE → `"CACHE"` | `blueprint-canvas.test.ts:344-345` — CACHE: `getGraph().edges[0]?.label === 'CACHE'`; `__GAME_STATE__.graph.edges[0]?.label === 'CACHE'` | ⚠️ Partial — CACHE path evidenced; DB DEFAULT / ORIGIN FALLBACK menu apply not integration-tested (unit: `connection-intents.test.ts:23-24` both `shortLabel 'DB'`) |
| AC5: Escape or canvas background closes popover | intent hidden | `blueprint-canvas.test.ts:364-375` — Escape + host pointerdown → `hidden === true` | ✅ PASS |
| AC6: Delete/Backspace with selected edge removes edge | edge removed; selection cleared; skip when input focused | `blueprint-canvas.test.ts:394-400` — Delete with/without input focus | ⚠️ Partial — Delete evidenced; Backspace not asserted (impl: `blueprint-canvas.ts:450` handles both) |

### CI-03 — Default heurístico + CACHE no create (P1)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1: dest `cache_redis` or `cdn` → `CACHE` | initial label `CACHE` | `connection-intents.test.ts:42-43,54-55`; `blueprint-canvas.test.ts:294` — `labels[app->cache] === 'CACHE'` | ✅ PASS |
| AC2: dest sql/nosql/object/search → `DB` | initial label `DB` | `connection-intents.test.ts:44-47,54-55`; `blueprint-canvas.test.ts:295` — `labels[app->sql] === 'DB'` | ✅ PASS |
| AC3: other dest → `REQ` | initial label `REQ` | `connection-intents.test.ts:48-51,54-55`; `blueprint-canvas.test.ts:296` — `labels[client->lb] === 'REQ'` | ✅ PASS |
| AC4: catalog includes CACHE with lookup/hit-path description | CACHE row + description | `connection-intents.test.ts:32-36` — `shortLabel 'CACHE'`; `description.toLowerCase().toMatch(/lookup\|hit/)` | ✅ PASS |

### CI-04 — Preview during linking (P2 deferred)

| Criterion | Spec-defined outcome | Evidence | Result |
| --------- | -------------------- | -------- | ------ |
| AC1–AC2 | preview pill during linking | — | ⏭️ Out of scope (deferred per spec) |

### CI-05 — Mobile / touch viewport-safe (P1)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| AC1: viewport ≤375px → all catalog options reachable | sheet layout; internal scroll; bounds within viewport | `connection-intent-popover.test.ts:87-122` — `--sheet` class; `overflow-y: auto`; mocked rect within 375×667 | ✅ PASS |
| AC2: touch (pointer) on stroke/pill → select + open menu | same as click | `svg-edges.test.ts:249-261` — `pointerdown` on path/pill → `onEdgeActivate`; `blueprint-canvas.test.ts:318` — `firePointerDown(path)` opens intent | ✅ PASS |
| AC3: popover repositioned when outside viewport | clamp / bottom sheet | `connection-intent-popover.test.ts:97-118` — sheet at 375px | ⚠️ Partial — mobile sheet evidenced; desktop anchor clamp (`connection-intent-popover.ts:201-209`) not tested |

**Status**: ⚠️ 12/17 P1 sub-criteria fully evidenced; 5 partial (assertion gaps, implementation present)

---

## Discrimination Sensor

Scratch protocol: in-place mutation via Python edit → targeted Vitest → `git checkout --` restore. Working tree clean after sensor.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 | `connection-intents.ts:67-70` | `defaultLabelForDestination` always returns `'REQ'` | ✅ Killed — 7 failures in `connection-intents.test.ts` + `blueprint-canvas.test.ts` heuristic |
| 2 | `svg-edges.ts:151` | Disable pill branch (`if (false && edge.label)`) | ✅ Killed — 5 failures in `svg-edges.test.ts` pill tests |
| 3 | `blueprint-canvas.ts:158` | `activateEdge` leaves `selectedEdgeId = null` | ✅ Killed — `blueprint-canvas.test.ts` pointer/Delete intent tests |

**Sensor depth**: lightweight (3 behavior-level mutations)  
**Result**: 3/3 killed — PASS ✅

---

## Interactive UAT Results

Not performed (automated Verifier pass only; orchestrator may schedule UAT for visual pill/menu parity).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ |
| No scope creep | ✅ (simulation unchanged per AD-020) |
| Matches patterns | ✅ Vitest + `__GAME_STATE__`; manifest-style catalog module |
| Spec-anchored outcome check | ⚠️ 5 partial sub-criteria (see above) |
| Per-layer Coverage Expectation | ✅ domain 1:1 heuristic branches; canvas wiring via test hook |
| Every test maps to spec AC | ✅ (see Test Coverage Matrix in `tasks.md`) |
| Documented guidelines: `AGENTS.md` | ✅ |

---

## Edge Cases (from spec)

| Edge case | Result |
| --------- | ------ |
| Legacy custom label (e.g. HTTPS) → pill + CUSTOM header | ✅ `connection-intent-popover.test.ts:79-83` |
| Click edge clears node config popover | ✅ `blueprint-canvas.test.ts:324-325` |
| DB dual-row session memory | ✅ `connection-intents.test.ts:74-77` |
| Edge under card / crossing edges hit-test priority | ⚠️ Not explicitly tested (implicit via delegation) |

---

## Gate Check

- **Gate command**: `npx nx run-many -t lint test`
- **Exit code**: 0
- **Result**: 470 passed, 0 failed, 0 skipped
  - shared: 79 tests (11 files)
  - client: 315 tests (50 files)
  - server: 76 tests (14 files)
- **Lint**: 0 errors (pre-existing warnings in shared simulation tests)
- **Test count before feature** (client feature files): svg-edges 6 + blueprint-canvas 11 = 17 `it()` blocks
- **Test count after**: svg-edges 11 + blueprint-canvas 15 + connection-intents 8 + connection-intent-popover 4 = 38
- **Delta**: ~+21 new client tests; no tests deleted

---

## Fix Plans (recommended — non-blocking for MVP)

### Fix 1: Assert role header for catalog labels (CI-02 AC2)

- **Root cause**: Popover test opens with `'REQ'` but never reads `[data-testid="connection-intent-role"]`
- **Fix task**: In `connection-intent-popover.test.ts`, after `pop.open('e1', 'REQ')`, `expect(role?.textContent).toBe('REQUEST')`; repeat for `'DB'` → `DEFAULT` / remembered `ORIGIN FALLBACK`
- **Priority**: Minor

### Fix 2: Integration test DB menu rows → label `"DB"` (CI-02 AC4)

- **Root cause**: Canvas wiring test only selects CACHE
- **Fix task**: In `blueprint-canvas.test.ts`, select `[data-intent-id="db-origin-fallback"]` and assert `label === 'DB'` + `__GAME_STATE__`
- **Priority**: Minor

### Fix 3: Backspace deletes selected edge (CI-02 AC6)

- **Root cause**: Test uses Delete key only
- **Fix task**: Duplicate delete test with `key: 'Backspace'`
- **Priority**: Minor

### Fix 4: Pill midpoint position (CI-01 AC1)

- **Root cause**: Test checks text only, not SVG coordinates
- **Fix task**: Assert pill `text` `x`/`rect` center ≈ `pointOnEdgeCurve(from, to, 0.5).x`
- **Priority**: Minor

### Fix 5: Desktop popover clamp (CI-05 AC3)

- **Root cause**: Only ≤375px sheet path tested
- **Fix task**: At 1024px viewport with anchor near bottom-right, assert `root.style.top`/`left` clamped within viewport
- **Priority**: Minor

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| CI-01 | Mapped T2 | ✅ Verified (1 partial assertion) |
| CI-02 | Mapped T1,T3–T5 | ⚠️ Verified with gaps (AC2, AC4, AC6 partial) |
| CI-03 | Mapped T1,T4 | ✅ Verified |
| CI-04 | Deferred | ⏭️ Out of scope |
| CI-05 | Mapped T3,T4 | ⚠️ Verified (AC3 partial) |

---

## Summary

**Overall**: ✅ Ready (PASS with ranked assertion gaps)

**Spec-anchored check**: 12/17 P1 sub-criteria fully match spec outcome; 5 partial (implementation present, tests shallow)  
**Sensor**: 3/3 mutations killed  
**Gate**: 470 passed, 0 failed  

**What works**: Pill labels, edge selection, CONNECTION INTENT popover, heuristic connect labels, CACHE/REQ apply, Escape/canvas dismiss, Delete edge, mobile sheet layout, Vercel preview config.

**Issues found**: Five test-strengthening gaps (role header, DB menu apply, Backspace, pill midpoint coords, desktop clamp) — no behavior defects observed in code review.

**Next steps**: Optional fix tasks above → re-verify; then merge `feature/playground-parity` when orchestrator accepts PASS-with-gaps or after gap fill.
