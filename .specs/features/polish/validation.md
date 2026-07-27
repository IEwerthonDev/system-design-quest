# Polish Validation

**Date**: 2026-07-27 (re-verify after fix commits)
**Spec**: `.specs/features/polish/spec.md`
**Diff range**: `main..feature/polish` (`9692120..a9f58e9`)
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
| Fix  | ✅ Done | commit `a9f58e9` — POL-04 submit sound + POL-07 redo tutorial session tests |

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
| POL-04 | WHEN submit + sons habilitados THEN beep `submit` | `playGameSound('submit')` on submit action | `client/src/ui/submit-panel.test.ts:110` — spy on `playGameSound`; `:127` — `expect(soundSpy).toHaveBeenCalledWith('submit')` | ✅ PASS |
| POL-05 | WHEN mute THEN sem áudio | zero oscillators / enabled false | `client/src/audio/sound.test.ts:52-53` — `expect(ctx.oscillators).toHaveLength(0)`; `game-sounds.test.ts:48` — `toHaveBeenCalledWith('connect', { enabled: false })` | ✅ PASS |
| POL-05 | WHEN prefs carregam THEN `soundEnabled` default `true` persistido | default true, round-trip | `client/src/storage/preferences.test.ts:40` — `expect(loadPreferences(storage).soundEnabled).toBe(true)`; `:45-48` persist toggle | ✅ PASS |
| POL-06 | WHEN abre Configurações THEN painel com refazer, rever, mute | DOM testids present | `client/src/ui/settings-panel.test.ts:59-62` — `settings-sound-toggle`, `settings-redo-tutorial`, `settings-replay-onboarding` | ✅ PASS |
| POL-07 | WHEN "Refazer tutorial" THEN modo guiado URL Shortener | guided session with `problemId: 'url-shortener'` | `client/src/bootstrap.test.ts:140-145` — `expect(mountPhaseNavigation).toHaveBeenCalledWith(container, expect.objectContaining({ problemId: 'url-shortener', guidedMode: true }))` | ✅ PASS |
| POL-08 | WHEN "Rever onboarding" THEN `onboardingCompleted=false` + fluxo | onboarding shown again | `client/src/ui/settings-panel.test.ts:97` — `expect(shouldShowOnboarding(loadPreferences(storage))).toBe(true)` | ✅ PASS |
| POL-06 | WHEN Configurações fechado THEN não bloquear canvas/UI | panel closed → no overlay block | — | ⚠️ Spec-precision gap (FAB overlay pattern; no closed-state interaction test) |
| POL-09 | WHEN viewport ≤1024px THEN layout tablet empilhado | tablet class applied | `client/src/ui/responsive.test.ts:18-19` — `applyLayoutForWidth(TABLET_MAX_WIDTH, root)` → `LAYOUT_TABLET_CLASS` | ✅ PASS |
| POL-09 | WHEN viewport >1024px THEN layout desktop | tablet class removed | `client/src/ui/responsive.test.ts:21-22` — `applyLayoutForWidth(TABLET_MAX_WIDTH + 1, root)` → class absent | ✅ PASS |
| POL-10 | WHEN paleta colapsada em tablet THEN controle expandir | collapse/expand toggle + class | `client/src/ui/responsive.test.ts:41-47` — `PALETTE_COLLAPSED_CLASS` toggle; `:44` — `/Expandir/i` label | ✅ PASS |
| POL-11 | WHEN e2e THEN happy path tutorial com judge mockado | onboarding → canvas → submit → PASS verdict | `e2e/tutorial.spec.ts:43-101` — DOM testids + `__GAME_STATE__.phase === 'result'` + `judgeResult.verdict === 'PASS'` | ✅ PASS |
| POL-11 | e2e usa DOM/`__GAME_STATE__`, não screenshots | no screenshot assertions | `e2e/tutorial.spec.ts:77-101` — `page.evaluate(() => window.__GAME_STATE__…)` | ✅ PASS |
| POL-12 | AGENTS/docs indicam remote SSH | `git@github.com:…` as standard | `AGENTS.md:31` — `git@github.com:IEwerthonDev/system-design-quest.git` (manual review per tasks matrix) | ✅ PASS |

**Status**: ✅ All ACs covered (2 spec-precision gaps flagged, non-blocking)

---

## Discrimination Sensor

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 | `client/src/storage/preferences.ts:18` | Flip default `soundEnabled: true` → `false` | ✅ Killed (prior pass) |
| 2 | `client/src/ui/responsive.ts:74` | Flip tablet threshold `width <= TABLET_MAX_WIDTH` → `width <= 0` | ✅ Killed (prior pass) |
| 3 | `client/src/audio/sound.ts:70` | Bypass mute guard `if (options.enabled === false)` → never return | ✅ Killed (prior pass) |

**Sensor depth**: lightweight (3 mutations, prior pass — not re-run; fix commits are test-only)
**Result**: 3/3 killed — ✅ PASS

---

## Interactive UAT Results

Not performed (automated gate + spec-anchored check sufficient).

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ |
| No scope creep | ✅ |
| Matches patterns | ✅ |
| Spec-anchored outcome check | ✅ All POL-* ACs evidenced |
| Per-layer coverage expectation | ✅ Domain 1:1; integration gaps closed |
| Every test maps to spec requirement | ✅ |
| Documented guidelines followed | ✅ `AGENTS.md` |

---

## Edge Cases

- [x] GLB 404/corrupt → primitive fallback
- [x] AudioContext unavailable → silent fail
- [x] Refazer tutorial com sessão ativa → reinicia URL Shortener (`bootstrap.test.ts:127-147`)
- [x] e2e sem WebGL real → DOM + game state

---

## Gate Check

- **Gate command**: `npx nx run-many -t lint test` && `npx playwright test`
- **Result**: **272 passed, 0 failed, 0 skipped**
  - client: 209 tests (38 files)
  - server: 62 tests (9 files)
  - playwright: 1 test
- **Lint**: 0 errors, 6 warnings (pre-existing)
- **Test count before feature** (main): 186 client + 62 server = 248
- **Test count after feature + fixes**: 209 client + 62 server + 1 e2e = 272
- **Delta**: +23 client unit tests, +1 e2e
- **Failures**: none

---

## Fix Plans (resolved)

| Fix | Status | Evidence |
| --- | ------ | -------- |
| POL-04 submit sound wiring | ✅ Resolved | `submit-panel.test.ts:127` |
| POL-07 redo tutorial URL Shortener | ✅ Resolved | `bootstrap.test.ts:140-145` |

---

## Requirement Traceability Update

| Requirement | Status |
| ----------- | ------ |
| POL-01 … POL-03 | ✅ Verified |
| POL-04 | ✅ Verified |
| POL-05 | ✅ Verified |
| POL-06 | ✅ Verified (AC4 spec-precision only) |
| POL-07 | ✅ Verified |
| POL-08 … POL-12 | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 12/12 requirements evidenced; 2 spec-precision gaps (non-blocking)
**Sensor**: 3/3 mutations killed (prior pass)
**Gate**: 272 passed, 0 failed

**Re-verify note**: Fix commit `a9f58e9` closed the two prior AC gaps (POL-04 submit-panel integration test, POL-07 bootstrap redo-tutorial session assertion).

**Next steps**: Feature ready for merge to `main` per branch strategy.
