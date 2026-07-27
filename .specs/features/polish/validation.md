# Polish Validation

**Date**: 2026-07-27
**Spec**: `.specs/features/polish/spec.md`
**Diff range**: `main..feature/polish` (`9692120..bafb31f`)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | commit `531b4b0` — manifest + tests |
| T2   | ✅ Done | commit `fb7ef73` — asset loader + GLB/primitive |
| T3   | ✅ Done | commit `a950555` — sound + preferences |
| T4   | ✅ Done | commit `6f9c885` — wire place/connect/submit |
| T5   | ✅ Done | commit `7e84b6c` — settings panel |
| T6   | ✅ Done | commit `8385fa4` — responsive + palette collapse |
| T7   | ✅ Done | commit `6ee1a44` (+ fix `6bfe97d`) — Playwright e2e |
| T8   | ✅ Done | commit `bafb31f` — AGENTS SSH + STATE |

**Note:** `tasks.md` checkboxes remain `[ ]` in the working tree; implementation commits exist for all eight tasks.

---

## Spec-Anchored Acceptance Criteria

| Req | Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --------------------------- | -------------------- | ----------------------- | ------ |
| POL-01 | WHEN catálogo carrega THEN manifest com GLB path por 25 tipos | 25 entries, each with `glbPath` under `/assets/components/` | `client/src/scene/component-manifest.test.ts:6` — `expect(manifest).toHaveLength(25)`; `:18-22` — `expect(entry.glbPath).toMatch(/^\/assets\/components\/…/)` | ✅ PASS |
| POL-02 | WHEN componente colocado e GLB carrega THEN renderizar GLB | `meshSource === 'glb'`, mesh replaced, type/id preserved | `client/src/scene/component-manager.test.ts:79` — `expect(instance.meshSource).toBe('glb')`; `:81-82` — `expect(instance.id).toBe('comp-glb')` | ✅ PASS |
| POL-02 | GLB com cor/categoria preservada | Tint applied to GLB mesh material | — | ⚠️ Spec-precision gap (tint unit-tested in asset-loader, not asserted on GLB upgrade path) |
| POL-03 | WHEN GLB ausente/falha THEN primitivo sem quebrar canvas | `meshSource === 'primitive'`, geometry intact | `client/src/scene/component-manager.test.ts:101` — `expect(instance.meshSource).toBe('primitive')`; `asset-loader.test.ts:32` — `expect(model).toBeNull()` | ✅ PASS |
| POL-03 | WHEN serialização THEN mesmo ArchitectureGraph independente de mesh | nodes: id, type, label, position; no mesh fields | `client/src/scene/graph-serializer.test.ts:34-39` — `expect(instanceToNode(instance)).toEqual({ id, type, label, position })`; `:56-68` — edge/node graph shape | ✅ PASS |
| POL-04 | WHEN place + sons habilitados THEN beep `place` | `playGameSound('place')` on addComponent | `client/src/scene/component-manager.test.ts:192` — `expect(soundSpy).toHaveBeenCalledWith('place')` | ✅ PASS |
| POL-04 | WHEN connect + sons habilitados THEN beep `connect` | `playGameSound('connect')` on connect | `client/src/scene/edge-manager.test.ts:45` — `expect(soundSpy).toHaveBeenCalledWith('connect')` | ✅ PASS |
| POL-04 | WHEN submit + sons habilitados THEN beep `submit` | `playGameSound('submit')` on submit action | `client/src/audio/sound.test.ts:45` — `playSound('submit', { enabled: true, … })` only tests oscillator; **no** submit-panel wiring assertion | ❌ GAP |
| POL-05 | WHEN mute THEN sem áudio | zero oscillators / enabled false | `client/src/audio/sound.test.ts:52-53` — `expect(ctx.oscillators).toHaveLength(0)`; `game-sounds.test.ts:48` — `toHaveBeenCalledWith('connect', { enabled: false })` | ✅ PASS |
| POL-05 | WHEN prefs carregam THEN `soundEnabled` default `true` persistido | default true, round-trip | `client/src/storage/preferences.test.ts:40` — `expect(loadPreferences(storage).soundEnabled).toBe(true)`; `:45-48` persist toggle | ✅ PASS |
| POL-06 | WHEN abre Configurações THEN painel com refazer, rever, mute | DOM testids present | `client/src/ui/settings-panel.test.ts:59-62` — `settings-sound-toggle`, `settings-redo-tutorial`, `settings-replay-onboarding` | ✅ PASS |
| POL-07 | WHEN "Refazer tutorial" THEN modo guiado URL Shortener | guided session with `problemId: 'url-shortener'` | `client/src/ui/settings-panel.test.ts:77-78` — `guidedModeRequested` / `libraryUnlocked` only; **no** `url-shortener` session assertion | ❌ GAP |
| POL-08 | WHEN "Rever onboarding" THEN `onboardingCompleted=false` + fluxo | onboarding shown again | `client/src/ui/settings-panel.test.ts:97` — `expect(shouldShowOnboarding(loadPreferences(storage))).toBe(true)` | ✅ PASS |
| POL-06 | WHEN Configurações fechado THEN não bloquear canvas/UI | panel closed → no overlay block | — | ⚠️ Spec-precision gap (FAB overlay pattern; no closed-state interaction test) |
| POL-09 | WHEN viewport ≤1024px THEN layout tablet empilhado | tablet class applied | `client/src/ui/responsive.test.ts:18-19` — `applyLayoutForWidth(TABLET_MAX_WIDTH, root)` → `LAYOUT_TABLET_CLASS` | ✅ PASS |
| POL-09 | WHEN viewport >1024px THEN layout desktop | tablet class removed | `client/src/ui/responsive.test.ts:21-22` — `applyLayoutForWidth(TABLET_MAX_WIDTH + 1, root)` → class absent | ✅ PASS |
| POL-10 | WHEN paleta colapsada em tablet THEN controle expandir | collapse/expand toggle + class | `client/src/ui/responsive.test.ts:41-47` — `PALETTE_COLLAPSED_CLASS` toggle; `:44` — `/Expandir/i` label | ✅ PASS |
| POL-11 | WHEN e2e THEN happy path tutorial com judge mockado | onboarding → canvas → submit → PASS verdict | `e2e/tutorial.spec.ts:43-101` — DOM testids + `__GAME_STATE__.phase === 'result'` + `judgeResult.verdict === 'PASS'` | ✅ PASS |
| POL-11 | e2e usa DOM/`__GAME_STATE__`, não screenshots | no screenshot assertions | `e2e/tutorial.spec.ts:77-101` — `page.evaluate(() => window.__GAME_STATE__…)` | ✅ PASS |
| POL-12 | AGENTS/docs indicam remote SSH | `git@github.com:…` as standard | `AGENTS.md:31` — `git@github.com:IEwerthonDev/system-design-quest.git` (manual review per tasks matrix) | ✅ PASS |

**Status**: ❌ Gaps present (2 AC gaps, 2 spec-precision gaps)

---

## Discrimination Sensor

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 | `client/src/storage/preferences.ts:18` | Flip default `soundEnabled: true` → `false` | ✅ Killed (`preferences.test.ts` "defaults soundEnabled to true" failed) |
| 2 | `client/src/ui/responsive.ts:74` | Flip tablet threshold `width <= TABLET_MAX_WIDTH` → `width <= 0` | ✅ Killed (`responsive.test.ts` 2 tests failed) |
| 3 | `client/src/audio/sound.ts:70` | Bypass mute guard `if (options.enabled === false)` → never return | ✅ Killed (`sound.test.ts` "does not play when muted" failed) |

**Sensor depth**: lightweight (3 mutations)
**Result**: 3/3 killed — ✅ PASS

*Mutations applied in scratch via sed + `git checkout --`; working tree restored after each run.*

---

## Interactive UAT Results

Not performed (automated gate + spec-anchored check sufficient for this verifier pass).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ Focused feature files; no unrelated refactors |
| Surgical changes | ✅ Scoped to polish surface |
| No scope creep | ✅ Out-of-scope items deferred per spec |
| Matches patterns | ✅ Manifest, `__GAME_STATE__`, preferences, Vitest hooks |
| Spec-anchored outcome check | ❌ POL-04 submit wiring + POL-07 url-shortener session under-asserted |
| Per-layer coverage expectation | ⚠️ Domain mostly 1:1; submit/settings integration gaps |
| Every test maps to spec requirement | ✅ New tests align with coverage matrix |
| Documented guidelines followed | ✅ `AGENTS.md` testing principles cited in tasks matrix |

---

## Edge Cases

- [x] GLB 404/corrupt → primitive fallback (`asset-loader.test.ts:35-40`, `component-manager.test.ts:89-103`)
- [x] AudioContext unavailable → silent fail (`sound.test.ts:56-57` — `not.toThrow()` with null context)
- [ ] Refazer tutorial com sessão ativa → substituir/reiniciar URL Shortener — **no dedicated test** (bootstrap redo remounts via callback; not asserted)
- [x] e2e sem WebGL real → DOM + game state (`e2e/tutorial.spec.ts:57-74` via `__SDQ_E2E__.setGraph`)

---

## Gate Check

- **Gate command**: `npx nx run-many -t lint test` && `npx playwright test`
- **Result**: **271 passed, 0 failed, 0 skipped**
  - client: 208 tests (38 files)
  - server: 62 tests (9 files)
  - shared/libs: included in nx graph
  - playwright: 1 test
- **Lint**: 0 errors, 6 warnings (pre-existing non-null assertions in server)
- **Test count before feature** (main): 186 client + 62 server = 248
- **Test count after feature**: 208 client + 62 server + 1 e2e = 271
- **Delta**: +22 client unit tests, +1 e2e
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans

### Fix 1: Assert submit sound on submit action (POL-04)

- **Root cause**: `submit-panel.ts` calls `playGameSound('submit')` but `submit-panel.test.ts` never spies the audio hook.
- **Fix task**: Add test in `submit-panel.test.ts` that spies `playGameSound`, performs successful submit, asserts `toHaveBeenCalledWith('submit')`.
- **Priority**: Major

### Fix 2: Assert URL Shortener session on Refazer tutorial (POL-07)

- **Root cause**: Settings test stops at preference flags; spec requires guided URL Shortener session start.
- **Fix task**: Extend settings or bootstrap test: after redo click + remount, assert `mountPhaseNavigation` (or session store) receives `problemId: 'url-shortener'` and `guidedMode: true`.
- **Priority**: Major

### Fix 3: Optional — settings closed non-blocking (POL-06 AC4)

- **Root cause**: No interaction test when panel closed.
- **Fix task**: Assert canvas pointer handlers / palette remain usable when `settings.isOpen() === false`.
- **Priority**: Minor (spec-precision)

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| POL-01 | Verified (author) | ✅ Verified |
| POL-02 | Verified (author) | ✅ Verified |
| POL-03 | Verified (author) | ✅ Verified |
| POL-04 | Verified (author) | ❌ Needs Fix (submit wiring test) |
| POL-05 | Verified (author) | ✅ Verified |
| POL-06 | Verified (author) | ⚠️ Verified (AC4 spec-precision only) |
| POL-07 | Verified (author) | ❌ Needs Fix |
| POL-08 | Verified (author) | ✅ Verified |
| POL-09 | Verified (author) | ✅ Verified |
| POL-10 | Verified (author) | ✅ Verified |
| POL-11 | Verified (author) | ✅ Verified |
| POL-12 | Verified (author) | ✅ Verified |

---

## Summary

**Overall**: ❌ Not Ready (test evidence gaps on POL-04 submit + POL-07 redo tutorial)

**Spec-anchored check**: 10/12 requirements fully evidenced; 2 AC gaps; 2 spec-precision gaps flagged
**Sensor**: 3/3 mutations killed
**Gate**: 271 passed, 0 failed

**What works**: GLB manifest/loader/fallback, place/connect sounds, mute persistence, settings UI, responsive tablet layout, Playwright e2e happy path, SSH docs in AGENTS.md.

**Issues found**: Submit sound not tested at submit-panel integration layer; Refazer tutorial test does not assert URL Shortener guided session start.

**Next steps**: Add two targeted tests (Fix 1–2), re-run verifier; optionally add closed-settings interaction test.
