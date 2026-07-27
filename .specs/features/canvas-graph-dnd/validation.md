# canvas-graph-dnd Validation

**Date**: 2026-07-27  
**Spec**: `.specs/features/canvas-graph-dnd/spec.md`  
**Diff range**: `bf5da0a..d7aa155` (includes CGD-04 fix `d7aa155`; parent polish handoff `e327521`)  
**Verifier**: independent sub-agent re-verify (author ≠ verifier)  
**Working tree note**: Ignored dirty `.specs/STATE.md` / `tasks.md` / lessons artifacts from orchestrator; coverage scoped to committed client code + tests at HEAD `d7aa155`.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 EdgeManager APIs | ✅ Done | Commit `34557f5` |
| T2 Bezier flow-edge | ✅ Done | Commit `947831f` |
| T3 Component handles | ✅ Done | Commit `9aa5ec4` |
| T4 Link preview | ✅ Done | Commit `553320f` |
| T5 Properties edge mode | ✅ Done | Commit `c44d566` |
| T6 Link create/cancel | ✅ Done | Commit `f1dd296` |
| T7 Preview + highlight | ✅ Done | Commit `d0d8d1c` |
| T8 Select/delete/invert | ✅ Done | Commit `2e77829` |
| T9 Reconnect endpoint | ✅ Done | Commit `884d066` |
| T10 Bidirectional dual-pulse | ✅ Done | Commit `d18b1ef` |
| T11 Boot wiring | ✅ Done | Commit `b1d7cb6` |
| Fix CGD-04 in-handle assert | ✅ Done | Commit `d7aa155` — `bIn.scale` 1.45 + reset to 1 |

---

## Spec-Anchored Acceptance Criteria

### P1: Ligar com handles

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| WHEN hover em componente THEN exibe handles in/out distintos | `mode=hover`, in/out `visible=true` | `canvas-interaction.test.ts:155-158` — `mode === 'hover'`; `set.in/out.visible === true` | ✅ PASS |
| WHEN drag no handle de saída THEN entra modo ligação (não move nó) | `mode=linking`, `linkingFromId=A`, controls disabled | `canvas-interaction.test.ts:176-178` — `mode === 'linking'`; `controls.enabled === false` | ✅ PASS |
| WHEN solta em in-handle/corpo válido THEN cria `from=A,to=B,direction=forward` + sync graph | 1 edge A→B forward; persisted graph matches | `canvas-interaction.test.ts:190-194` — `toMatchObject({ from, to, direction: 'forward' })`; `persisted` / `serializeGraph` | ✅ PASS |
| WHEN solta no vazio / cancela gesto THEN sem aresta nova | 0 edges; idle; controls re-enabled | `canvas-interaction.test.ts:244-246` — `getEdges().toHaveLength(0)`; `mode === 'idle'` | ✅ PASS |
| WHEN mesmo nó OU par A→B já existe THEN cursor proibido e NÃO cria aresta | `invalidTarget=true`, `cursor=not-allowed`, edge count unchanged | `canvas-interaction.test.ts:271-295` — `invalidTarget`; `cursor === 'not-allowed'`; `toHaveLength(1)` | ✅ PASS |

### P1: Preview curvo + luz

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| WHEN linking ativo THEN preview curva suave origem→ponteiro | `previewActive` + Bezier/TubeGeometry | `canvas-interaction.test.ts:446-450` — `previewActive`; TubeGeometry; `link-preview.test.ts:31-33` QuadraticBezierCurve3 | ✅ PASS |
| WHEN preview ativo THEN anima brilho origem→ponteiro | `uTime` avança com `update(dt)` | `canvas-interaction.test.ts:455-459` — `uTime.value > 0`; `link-preview.test.ts:50-53` | ✅ PASS |
| WHEN alvo válido sob cursor THEN destaca **nó e handle de entrada** | node emissive + in-handle scale highlight | `canvas-interaction.test.ts:488-492` — `emissiveIntensity > 0`; `bIn.scale.x/y/z === 1.45`; reset `:504` `bIn.scale.x === 1` (impl `canvas-interaction.ts:271`) | ✅ PASS |
| WHEN linking ativo THEN handles do nó sob cursor sem hover prévio | destination in/out visible while linking | `canvas-interaction.test.ts:451-453` — `bSet.in/out.visible === true` | ✅ PASS |
| WHEN aresta criada THEN preview some; aresta permanente com fluxo A→B | preview hidden; flow-edge mesh present | `canvas-interaction.test.ts:530-539` — `previewActive=false`; `isFlowEdge` / visible | ✅ PASS |

### P1: Editar arestas

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| WHEN clica na linha THEN seleciona aresta + painel edge | `mode=edgeSelected`; panel `data-mode=edge` | `canvas-interaction.test.ts:690-694` | ✅ PASS |
| WHEN edge selecionada + Delete/Backspace THEN remove | edges length 0; visual removed | `canvas-interaction.test.ts:708-710` — Delete key | ✅ PASS |
| WHEN “apagar” no painel THEN remove | edges length 0 after panel click | `canvas-interaction.test.ts:714-715` | ✅ PASS |
| WHEN “inverter” THEN troca from/to + luz inverte | endpoints swapped; `rebuildGeometry` called | `canvas-interaction.test.ts:729-730` — `{ from: b, to: a }`; rebuild spy | ✅ PASS |
| WHEN arrasta ponta até nó válido THEN atualiza endpoint | A→B becomes A→C; invalid restores | `canvas-interaction.test.ts:936`, `:959` — `to: c.id`; invalid keeps previous | ✅ PASS |

### P2: Bidirecional dual-pulse

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| WHEN edge selecionada THEN painel oferece ação bidirecional | edge mode bidirectional control + callback | `properties-panel.test.ts:96-99` — `onEdgeDirectionChange(..., 'bidirectional')` | ✅ PASS |
| WHEN `direction=bidirectional` THEN dois pulsos opostos | `uBidirectional=1` + frag reverse pulse | `canvas-interaction.test.ts:1099-1101`; `flow-edge.test.ts:54`, `:112-113` — `flowPulse(1.0 - vUv.x)` | ✅ PASS |
| WHEN volta para forward THEN um pulso from→to | `direction=forward`, `uBidirectional=0` | `canvas-interaction.test.ts:1107-1109` | ✅ PASS |

### Wiring (CGD-09)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --------- | -------------------- | ----------------------- | ------ |
| Boot + `__GAME_STATE__` + palette drop | serializable `canvasInteraction`; palette places node + graph sync | `canvas-interaction.test.ts:1114+` (boot describe); `main.ts` mounts interaction | ✅ PASS |

**Status**: ✅ All ACs covered (prior CGD-04 gap closed by `d7aa155`)

---

## Discrimination Sensor

Scratch: `git worktree` at `/tmp/sdq-cgd-reverify` (HEAD `d7aa155`); main working tree client code untouched. Mutations discarded via worktree remove.

| Mutation | File:line | Description | Killed? |
| -------- | --------- | ----------- | ------- |
| 1 | `canvas-interaction.ts:271` | `setScalar(1.45)` → `setScalar(1.0)` | ✅ Killed — `canvas-interaction.test.ts:490` expected 1.45 got 1 |
| 2 | `edge-manager.ts:73-74` | `canConnect` always `true` | ✅ Killed — `edge-manager.test.ts:132` (+ connect/dup failures) |
| 3 | `canvas-interaction.ts:271` | Skip `setScalar(1.45)` entirely | ✅ Killed — `canvas-interaction.test.ts:490` |

**Sensor depth**: lightweight (highlight scale + canConnect; prior-round gaps re-probed)  
**Result**: 3/3 killed — PASS ✅

---

## Interactive UAT Results

Not performed in this Verifier run (automated evidence + sensor only). Manual UAT remains available for orchestrator/user.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code | ✅ |
| Surgical changes | ✅ |
| No scope creep | ✅ |
| Matches patterns | ✅ — `__GAME_STATE__`, EdgeManager, Vitest without WebGL pixels (`AGENTS.md`) |
| Spec-anchored outcome check | ✅ — including in-handle highlight scale 1.45 |
| Per-layer Coverage Expectation | ✅ domain / handles / preview / panel / FSM covered per matrix |
| Every test maps to a spec requirement | ✅ feature tests map to CGD-01…09 |
| Documented guidelines followed | ✅ `AGENTS.md` testing principles |

---

## Edge Cases

- [x] Drop on self-node rejected (cursor forbidden) — `canvas-interaction.test.ts:249-275`
- [x] Duplicate A→B rejected — same test + `edge-manager.test.ts:127-134`
- [x] B→A exists → A→B allowed — `edge-manager.test.ts:134` `canConnect(b,a)===true`
- [x] Component deleted removes incident edges — `canvas-interaction.test.ts:733-754`; `edge-manager.test.ts:94-109`
- [x] Invalid reconnect reverts endpoint — `canvas-interaction.test.ts:951-959`
- [x] Linking disables orbit/controls — `canvas-interaction.test.ts:178`; reconnect `:902`

---

## Gate Check

- **Gate command**: `npx nx run-many -t lint test`
- **Result**: ✅ Successfully ran lint + test for 3 projects (shared, client, server)
  - shared: 65 passed
  - client: 242 passed
  - server: 62 passed
  - **Total: 369 passed, 0 failed**
  - lint: pass (warnings only, pre-existing style)
- **Test count before feature** (`e327521`): client ~209 `it(`; shared 65 + server 62 unchanged
- **Test count after feature** (`HEAD` `d7aa155`): client 242 `it(` (+33)
- **Delta**: +33 client tests (no silent deletions observed); fix commit added assertions only
- **Skipped tests**: none
- **Failures**: none

---

## Fix Plans

None — prior Fix 1 (in-handle highlight assertion) resolved by `d7aa155`.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| ----------- | --------------- | ---------- |
| CGD-01 | ✅ Verified | ✅ Verified |
| CGD-02 | ✅ Verified | ✅ Verified |
| CGD-03 | ✅ Verified | ✅ Verified |
| CGD-04 | ❌ Needs Fix | ✅ Verified (in-handle scale 1.45 + reset) |
| CGD-05 | ✅ Verified | ✅ Verified |
| CGD-06 | ✅ Verified | ✅ Verified |
| CGD-07 | ✅ Verified | ✅ Verified |
| CGD-08 | ✅ Verified | ✅ Verified |
| CGD-09 | ✅ Verified | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 18/18 AC outcomes matched  
**Sensor**: 3/3 mutations killed  
**Gate**: 369 passed, 0 failed  

**What works**: Link gesture create/cancel/invalid, curved preview + flow, valid-target **node + in-handle** highlight, select/delete/invert, reconnect with revert, bidirectional dual-pulse, boot/`__GAME_STATE__`/palette drop; CGD-04 gap closed and sensor-confirmed.

**Issues found**: none

**Next steps**: Merge-ready pending orchestrator/UAT preference; no further fix tasks.
