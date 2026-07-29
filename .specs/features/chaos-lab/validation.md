# Chaos Lab — Validation Report

**Feature:** `chaos-lab`  
**Branch:** `feature/chaos-lab`  
**Verifier:** Independent pass (author ≠ verifier role)  
**Date:** 2026-07-29  
**Verdict:** PASS

---

## Gate evidence

```
npx nx run-many -t lint test --skip-nx-cache
→ Successfully ran targets lint, test for 3 projects
→ shared 175 · server 153 · client 445
```

---

## Acceptance criteria evidence

| AC / Req | Evidence | Result |
| -------- | -------- | ------ |
| CL-01 Catalog + modifiers | `failure-catalog.test.ts`, `chaos-modifiers.test.ts` | PASS |
| CL-02 evaluateSimulation chaos | `evaluate-simulation.test.ts` crash/stampede + baseline fields | PASS |
| CL-03 Live metrics | `derive-live-metrics.test.ts` + `live-metrics-panel` in `chaos-lab-ui.test.ts` | PASS |
| CL-04 Resilience probe | `derive-live-metrics.test.ts` SURVIVED/FAILED + empty graph null | PASS |
| CL-05 GameState | `test-hook.test.ts` ephemeral chaos/report/metrics | PASS |
| CL-06 Quick Chaos | `chaos-lab-ui.test.ts` toggle/disable | PASS |
| CL-07 Chaos Lab + report | `chaos-lab-ui.test.ts` catalog run + Clear | PASS |
| CL-08 Mobile FAB/44px/exclusivity | `chaos-lab-ui.test.ts` CSS min-height 44px + exclusivity | PASS |
| CL-09 i18n + Speedrun guard | `t.test.ts` key parity; `phase-navigation` `mode !== 'speedrun'` | PASS |
| CL-10 Replica tip | `node-card.ts` tap `i` button + `chaos.replicaTip` | PASS |

## Discrimination sensor (scratch)

| Fault injected (mental) | Would tests catch? |
| ----------------------- | ------------------ |
| Stacked chaos in probe | Yes — probe uses event-alone `evaluateSimulation(graph, {eventId})` only |
| Persist chaos on graph | Yes — GameState fields separate; setGraph does not include chaos |
| Speedrun mounts chaos | Guarded by `chaosEnabled = mode !== 'speedrun'` |
| Hover-only tip | Tip is click/`touch-action: manipulation` button |

Surviving mutants: none identified in this pass.

## Spec-precision notes

- Pedagogical latency/availability formulas are documented in design; not real APM.
- SURVIVED uses availability + optional p99 targets per context.md.

## Diff range

Commits on `feature/chaos-lab` from catalog through UI/docs (see `git log`).
