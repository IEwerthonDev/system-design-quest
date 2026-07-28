# Link Validity + Sim Realism — Tasks

## Execution Plan

### Phase A — Shared pair rules
- [ ] **T1** Pair assessor `assessConnectionPair` + tests  
  Files: `libs/shared/src/validation/connection-pair.ts`, `*.test.ts`, `libs/shared/src/index.ts`, FindingCode unused  
  Verify: vitest shared connection-pair  
  Commit: `feat(shared): assess connection pair ok/warn/invalid`

### Phase B — Canvas UX
- [ ] **T2** Preview color API + sync-safe preview; wire pointermove; tap-to-connect; pan-safe linking  
  Files: `client/src/blueprint/svg-edges.ts`, `blueprint-canvas.ts`, tests  
  Verify: vitest blueprint preview + tap connect  
  Commit: `feat(canvas): live link preview with validity colors`

- [ ] **T3** Warn edge stroke on committed edges + mobile delete in intent popover + clearDbIntentRole  
  Files: `svg-edges.ts`, `connection-intent-popover.ts`, `blueprint-canvas.ts`, tests  
  Verify: vitest edge warn stroke + delete control  
  Commit: `feat(canvas): warn edge style and touch delete`

### Phase C — Sim realism
- [ ] **T4** Async MQ write relief + primary/replica load split + HOT_PARTITION + QUEUE_BACKLOG  
  Files: `evaluate-simulation.ts`, `analyze-topology.ts`, `architecture-graph.ts`, tests  
  Verify: vitest sim + topology  
  Commit: `feat(sim): async decoupling, primary writes, queue backlog findings`

- [ ] **T5** Findings always (even when stopped) + refresh on graph change + mentor bottlenecks include QUEUE_BACKLOG  
  Files: `phase-navigation.ts`, `mentor-service.ts`, tests  
  Verify: vitest phase-nav + mentor  
  Commit: `fix(findings): always-on topology + mentor queue backlog`

### Phase D — Session hydrate + ship docs
- [ ] **T6** Hydrate judgeResult from design session  
  Files: `session-store.ts`, test  
  Verify: vitest session-store  
  Commit: `fix(sessions): restore judgeResult on hydrate`

- [ ] **T7** STATE.md handoff + AD-034  
  Files: `.specs/STATE.md`  
  Verify: docs only  
  Commit: `docs(STATE): AD-034 link validity + sim realism`

## Test Coverage Matrix

| AC | Test |
| -- | ---- |
| 1–6 | svg-edges / blueprint-canvas preview |
| 7–11 | connection-pair.test.ts |
| 12–14 | blueprint-canvas tap + popover delete |
| 15–18 | evaluate-simulation + analyze-topology |
| 19–21 | mentor-service + phase-navigation |
| 22–23 | blueprint clearDb + session-store |

## Gate

```bash
nx run-many -t lint test
```
