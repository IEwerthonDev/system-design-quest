# Polish — Tasks

**Spec:** `.specs/features/polish/spec.md`  
**Design:** `.specs/features/polish/design.md`  
**Branch:** `feature/polish`

---

## Test Coverage Matrix

> Guidelines: `AGENTS.md` (Vitest + `__GAME_STATE__`; WebGL not in Vitest; atomic commit/task; gate before done).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Manifest + asset loader | unit | POL-01..03; GLB fail → primitive | `client/src/scene/*.test.ts` | `npx nx test client` |
| Sound + preferences | unit | POL-04..05; mute skip; default true | `client/src/audio/*.test.ts`, `client/src/storage/*.test.ts` | `npx nx test client` |
| Settings panel | unit | POL-06..08 | `client/src/ui/settings-panel.test.ts` | `npx nx test client` |
| Responsive / palette | unit | POL-09..10 | `client/src/ui/responsive.test.ts` | `npx nx test client` |
| e2e tutorial | e2e | POL-11 happy path | `e2e/tutorial.spec.ts` | `npx playwright test` |
| Docs SSH | none | POL-12 in AGENTS | `AGENTS.md` | review |

## Gate Check Commands

| Gate Level | When | Command |
| ---------- | ---- | ------- |
| Quick | T1–T7 | `npx nx test client` |
| Full | After T8 / done | `npx nx run-many -t lint test` && `npx playwright test` |

---

## Task Order

```
T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8
```

---

### T1: Component GLB manifest (25 types)

**Files:**
- Create: `client/src/scene/component-manifest.ts`
- Create: `client/src/scene/component-manifest.test.ts`
- Create: `client/public/assets/components/` (minimal `.glb` files by category)

**Req:** POL-01

- [ ] `getComponentManifest()` returns exactly 25 entries matching tier-2 types
- [ ] Each entry has `glbPath` string pointing under `/assets/components/`
- [ ] Commit: `feat(client): component GLB asset manifest for tier-2`

---

### T2: Asset loader + GLB/primitive render path

**Files:**
- Create: `client/src/scene/asset-loader.ts`
- Create: `client/src/scene/asset-loader.test.ts`
- Modify: `client/src/scene/component-instance.ts`
- Modify: `client/src/scene/component-instance` tests / `component-manager.test.ts` as needed

**Req:** POL-02, POL-03

- [ ] Load GLB success → mesh replaced; failure/missing → keep primitive
- [ ] Serialization / graph unchanged (type, id, position)
- [ ] Commit: `feat(client): load GLB icons with primitive fallback`

---

### T3: Web Audio sounds + preference

**Files:**
- Create: `client/src/audio/sound.ts`
- Create: `client/src/audio/sound.test.ts`
- Modify: `client/src/storage/preferences.ts`
- Modify: `client/src/storage/preferences.test.ts` (create if missing)

**Req:** POL-04, POL-05

- [ ] `playSound('place'|'connect'|'submit')`; mute no-op
- [ ] `soundEnabled` default `true` in preferences
- [ ] Commit: `feat(client): subtle place/connect/submit sounds`

---

### T4: Wire sounds to place / connect / submit

**Files:**
- Modify: place path (`component-manager` or bootstrap/palette drop)
- Modify: edge create path (`edge-manager` or selection)
- Modify: submit panel / phase-navigation submit
- Modify: related tests

**Req:** POL-04

- [ ] Three call sites respect `soundEnabled` from preferences
- [ ] Commit: `feat(client): play sounds on place connect submit`

---

### T5: Settings panel — mute, refazer, onboarding

**Files:**
- Create: `client/src/ui/settings-panel.ts`
- Create: `client/src/ui/settings-panel.test.ts`
- Modify: `client/src/storage/preferences.ts` (helpers if needed)
- Modify: `client/src/bootstrap.ts` (mount settings)

**Req:** POL-06, POL-07, POL-08

- [ ] UI: mute toggle, Refazer tutorial, Rever onboarding
- [ ] Refazer → guided URL Shortener; Rever → onboarding shown
- [ ] Commit: `feat(client): settings panel redo tutorial and onboarding`

---

### T6: Responsive tablet layout + palette collapse

**Files:**
- Create: `client/src/ui/responsive.ts`
- Create: `client/src/ui/responsive.test.ts`
- Modify: palette / layout CSS in relevant UI modules
- Modify: bootstrap to apply layout listener

**Req:** POL-09, POL-10

- [ ] ≤1024 → tablet class + collapsible palette
- [ ] >1024 → desktop layout
- [ ] Commit: `feat(client): responsive tablet layout and palette collapse`

---

### T7: Playwright e2e tutorial flow

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/tutorial.spec.ts`
- Modify: `package.json` (playwright dep + script)
- Modify: app hooks/`data-testid` if missing for e2e selectors

**Req:** POL-11

- [ ] e2e: onboarding/beginner → place → connect → submit (judge mocked)
- [ ] Assert via DOM / `__GAME_STATE__`
- [ ] Commit: `test(e2e): tutorial happy path with mocked judge`

---

### T8: SSH remote docs + STATE handoff

**Files:**
- Modify: `AGENTS.md`
- Modify: `.specs/STATE.md`
- Modify: requirement status in polish `spec.md` as Implementing→Verified where done

**Req:** POL-12

- [ ] AGENTS documents SSH-only remote URL
- [ ] STATE handoff: polish ready for verify / merge
- [ ] Commit: `docs(polish): SSH remote policy and STATE handoff`

---

## Parallelization Map

Single batch (8 tasks) — execute inline sequentially. After T8 → automatic Verifier.
