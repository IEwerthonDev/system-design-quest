# MVP Canvas Validation

**Date**: 2026-07-27  
**Spec**: `.specs/features/product/spec.md` (PROD-01–04, 11–16)  
**Diff range**: `main...524f115` (22 commits, T1–T22 on `feature/mvp-canvas`)  
**Verifier**: orchestrator standalone pass (Verifier sub-agent unavailable — API limit)  
**Verdict**: **PASS** (2 spec-precision gaps deferred to Phase 3 — see Gaps)

---

## Gate Check

| Command | Exit | Result |
| ------- | ---- | ------ |
| `npx nx run-many -t lint test` | `0` | ✅ PASS |

- **Tests**: 155 passed, 0 failed (shared: 24, client: 130, server: 1)
- **Lint**: 0 errors, 72 warnings (pre-existing style warnings)

---

## Spec-Anchored Acceptance Criteria

Evidence-or-zero: each AC maps to test assertion or marked GAP.

### PROD-01 — Briefing

| AC | Spec outcome | Evidence | Result |
| -- | ------------ | -------- | ------ |
| 1 | Title, narrative, metrics, constraints | `briefing-panel.test.ts:42-63` — renders URL Shortener briefing fields | ✅ PASS |
| 2 | Difficulty badge + domain tags | `briefing-panel.test.ts:42-63` — Easy badge + tags | ✅ PASS |
| 3 | "Começar" advances to requirements | `briefing-panel.test.ts:102-118` — onStart + `advancePhase` | ✅ PASS |

### PROD-02 — Requisitos

| AC | Spec outcome | Evidence | Result |
| -- | ------------ | -------- | ------ |
| 1 | Separate FR/NFR lists, add/edit/remove | `requirements-panel.test.ts:46-114` | ✅ PASS |
| 2 | Non-empty text min 10 chars | `requirements-panel.test.ts:25-31,80-93` | ✅ PASS |
| 3 | Warn on empty lists but allow advance | `requirements-panel.test.ts:116-126` | ✅ PASS |
| 4 | Persist requirements in session | `requirements-persistence.test.ts:29-75` | ✅ PASS |

### PROD-03 — Canvas 3D

| AC | Spec outcome | Evidence | Result |
| -- | ------------ | -------- | ------ |
| 1 | Palette by category | `palette.test.ts:59-83`; tier 2: `component-catalog.test.ts:90-92` (25 types) | ✅ PASS |
| 2 | Drag creates XZ-positionable instance | `component-manager.test.ts` + `palette.test.ts:93-120` | ✅ PASS |
| 3 | Connect with forward/bidirectional edge | `edge-manager.test.ts:29-50` | ✅ PASS |
| 4 | Directional flow animation loop | `flow-edge.test.ts:43-63` — `uTime` advance + shader pulse | ✅ PASS |
| 5 | Rename label + note ≤200 chars | `selection.test.ts` — label/note panel sync | ✅ PASS |
| 6 | Delete removes component + edges | `selection.test.ts:172` — Delete key | ✅ PASS |
| 7 | Submit serializes ArchitectureGraph | `graph-serializer.test.ts` + `submit-panel.test.ts:49-54` | ✅ PASS |

### PROD-04 — Conexões animadas

| AC | Spec outcome | Evidence | Result |
| -- | ------------ | -------- | ------ |
| 1 | TubeGeometry + flow shader | `flow-edge.test.ts:18-31` | ✅ PASS |
| 2 | Bidirectional dual-band | `flow-edge.test.ts:33-41,57-63` — `uBidirectional` + reverse pulse in frag | ✅ PASS |

*(PROD-04 ACs consolidated in product spec under PROD-03 #4; covered by flow-edge tests.)*

### PROD-11 — Onboarding

| AC | Spec outcome | Evidence | Result |
| -- | ------------ | -------- | ------ |
| 1 | 3 screens on first visit | `onboarding.test.ts:48-55,79-107` | ✅ PASS |
| 2 | "Sou iniciante" → guided URL Shortener | `onboarding.test.ts:153-169` | ✅ PASS |
| 3 | "Já sei o básico" → home with full library | `onboarding.test.ts:131-143` — sets experienced, no guided; **no library home UI** (starts URL Shortener like skip) | ⚠️ GAP |
| 4 | "Pular" persists preference | `onboarding.test.ts:63-68,181-189` | ✅ PASS |

### PROD-12 — Modo Guiado

| AC | Spec outcome | Evidence | Result |
| -- | ------------ | -------- | ------ |
| 1 | Sequential highlights briefing→submit | `guided-mode.test.ts:38-54,177-187` | ✅ PASS |
| 2 | Suggested order Client→LB→App→Cache→DB | `guided-mode.test.ts:56-64` | ✅ PASS |
| 3 | Connection tooltip with HTTPS direction | `guided-mode.test.ts:66-72` — `GUIDED_CONNECTION_ORDER` label | ✅ PASS |
| 4 | Completion unlocks library (Modo Livre) | `guided-mode.test.ts:205-210` — `unlockProblemLibrary()`; UI placeholder per T16 | ⚠️ PARTIAL |
| 5 | Ignoring hints does not block | `guided-mode.test.ts:111-115` | ✅ PASS |

### PROD-13 — Tooltips e Glossário

| AC | Spec outcome | Evidence | Result |
| -- | ------------ | -------- | ------ |
| 1 | Palette hover: name, ≤2 sentences, when to use | `glossary.test.ts:16-30,62-79` | ✅ PASS |
| 2 | Metric `?` shows simple explanation | `briefing-panel.test.ts:65-100` | ✅ PASS |
| 3 | Shortcut `G` opens problem glossary | `glossary.test.ts:126-157` | ✅ PASS |

### PROD-14 — Métricas explicadas

| AC | Spec outcome | Evidence | Result |
| -- | ------------ | -------- | ------ |
| 1 | `?` on each metric → plain-language explanation | `briefing-panel.test.ts:65-100` + `glossary.test.ts:33-37` | ✅ PASS |

### PROD-16 — Dicas contextuais (P2 stretch)

| AC | Spec outcome | Evidence | Result |
| -- | ------------ | -------- | ------ |
| 1 | Study canvas: 2–3 hints from problem + graph | `hints-panel.test.ts:25-59` | ✅ PASS |
| 2 | Mark resolved when relevant component added | `hints-panel.test.ts:32-48,51-76` | ✅ PASS |
| 3 | Guided mode → more prescriptive copy | `hints-panel.test.ts:79-83` | ✅ PASS |

**Acceptance status**: **28/30 PASS** · **2 gaps** (library UI deferred Phase 3)

---

## Discrimination Sensor

| Mutation | Fault | Killed? |
| -------- | ----- | ------- |
| M1 | Remove `panel.toggle()` on G keydown | ✅ `glossary.test.ts` — toggle test fails |
| M2 | Expect tier-2 catalog length 24 instead of 25 | ✅ `component-catalog.test.ts` fails |
| M3 | `validateLocalSubmit` accepts empty graph | ✅ `submit-panel.test.ts` — 2 tests fail |

**Result**: **3/3 killed — PASS**

---

## Manual Checkpoints (1a / 1b / 1c)

WebGL canvas interactions are not testable in Vitest (AD-010). Automated tests cover logic via `__GAME_STATE__` and DOM panels; **browser UAT still required** before merge.

| Checkpoint | Manual steps | Automated proxy | Status |
| ---------- | ------------ | --------------- | ------ |
| **1a** | Dev → drag components → connect → see animation → submit | Unit tests for palette, edges, flow shader, submit validation | ⏳ Manual UAT pending |
| **1b** | URL Shortener briefing → requirements + suggestions → canvas → submit | `phase-navigation.test.ts`, briefing/requirements/suggestions tests | ⏳ Manual UAT pending |
| **1c** | Onboarding → guided tutorial <15 min → G glossary → 25 types palette | Onboarding, guided, glossary, catalog tier-2, hints tests | ⏳ Manual UAT pending |

**Smoke**: `component-lab.html` available at `/component-lab.html` for primitive preview (T21).

---

## Ranked Gaps (post-verify)

| Priority | Gap | Owner phase |
| -------- | --- | ----------- |
| P2 | PROD-11 AC3 — experienced path lacks problem library home | `problem-library` (Phase 3) |
| P2 | PROD-12 AC4 — `libraryUnlocked` flag only; no library UI | `problem-library` (Phase 3) |
| P3 | Manual WebGL UAT for checkpoints 1a–1c | Human QA before merge |

---

## Summary

**Overall**: ✅ **PASS** for MVP Canvas phase scope (T1–T22)  
**Gate**: green · **Sensor**: 3/3 killed · **AC coverage**: 28/30 with documented deferrals  
**Next**: Manual browser UAT → merge `feature/mvp-canvas` → `main` → begin Phase 2 `ai-judge`
