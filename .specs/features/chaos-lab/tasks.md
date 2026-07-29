# Chaos Lab Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.**

**Design**: `.specs/features/chaos-lab/design.md`  
**Status**: Approved → In Progress

---

## Test Coverage Matrix

> Guidelines: `AGENTS.md` — tests from ACs; `__GAME_STATE__` for canvas; no WebGL; deterministic; fast.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Shared resilience domain | unit | 1:1 ACs CL-01–04; edge empty graph | `libs/shared/src/resilience/*.test.ts` | `npx nx test shared` |
| evaluateSimulation chaos path | unit | no-chaos fixtures unchanged; chaos effects | `libs/shared/src/simulation/*.test.ts` | `npx nx test shared` |
| Client UI panels | unit | mount/sync/testid/state hooks | `client/src/ui/*.test.ts` | `npx nx test client` |
| Session wire | unit | speedrun guard; exclusivity; GameState | `client/src/session/*.test.ts` or ui tests | `npx nx test client` |
| i18n keys | unit | en/pt-BR key parity | `client/src/i18n/t.test.ts` | `npx nx test client` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick shared | After shared tasks | `npx nx test shared --skip-nx-cache` |
| Quick client | After UI tasks | `npx nx test client --skip-nx-cache` |
| Full | Phase complete / Verify | `nx run-many -t lint test --skip-nx-cache` |

---

## Execution Plan

### Phase 1: Shared foundation

```
T1 → T2 → T3 → T4
```

### Phase 2: Live Metrics + Quick Chaos UI

```
T5 → T6 → T7
```

### Phase 3: Chaos Lab + wire + mobile

```
T8 → T9 → T10
```

### Phase 4: i18n + AD + P2 tip

```
T11 → T12
```

---

## Task Breakdown

### T1: Failure catalog

**What**: Typed chaos event catalog (quick/infra/network)  
**Where**: `libs/shared/src/resilience/failure-catalog.ts` (+ test)  
**Depends on**: None  
**Requirement**: CL-01  
**Done when**:
- [ ] All Quick 7 + infra/network ids exported
- [ ] `listChaosEvents` / `getChaosEvent` work
- [ ] Gate: `npx nx test shared`
**Tests**: unit  
**Gate**: quick shared  
**Commit**: `feat(chaos-lab): add failure event catalog`

---

### T2: Chaos modifiers

**What**: `resolveChaosEffects(graph, ChaosContext)` pure modifiers  
**Where**: `libs/shared/src/resilience/chaos-modifiers.ts` (+ test)  
**Depends on**: T1  
**Requirement**: CL-01  
**Done when**:
- [ ] Each Quick event has deterministic effects
- [ ] Targeted events resolve target; global ignore target
- [ ] Gate green
**Tests**: unit  
**Gate**: quick shared  
**Commit**: `feat(chaos-lab): add chaos modifier resolver`

---

### T3: evaluateSimulation chaos hook

**What**: Optional chaos arg; extend evaluation with errorRate/availability/percentiles  
**Where**: `libs/shared/src/simulation/evaluate-simulation.ts` (+ test)  
**Depends on**: T2  
**Requirement**: CL-02  
**Done when**:
- [ ] No-chaos path preserves existing pressure fixtures
- [ ] Chaos alters capacity/latency/metrics as designed
- [ ] Exported from `libs/shared/src/index.ts`
**Tests**: unit  
**Gate**: quick shared  
**Commit**: `feat(chaos-lab): hook chaos into evaluateSimulation`

---

### T4: Live metrics + resilience probe

**What**: `deriveLiveMetrics` + `runResilienceProbe`  
**Where**: `libs/shared/src/resilience/derive-live-metrics.ts`, `run-resilience-probe.ts` (+ tests)  
**Depends on**: T3  
**Requirement**: CL-03, CL-04  
**Done when**:
- [ ] Metrics include RPS, latencies, error, avail, budget burn, hottest, tip, SLO
- [ ] Probe SURVIVED/FAILED per spec rule; event-alone
- [ ] Barrel exports
**Tests**: unit  
**Gate**: quick shared  
**Commit**: `feat(chaos-lab): derive live metrics and resilience probes`

---

### T5: GameState chaos fields

**What**: Extend `__GAME_STATE__` with chaos/metrics/report  
**Where**: `client/src/test-hook.ts` (+ test)  
**Depends on**: T4  
**Requirement**: CL-05  
**Done when**:
- [ ] Typed fields default null/[]
- [ ] Tests cover init/patch
**Tests**: unit  
**Gate**: quick client  
**Commit**: `feat(chaos-lab): extend GameState for chaos lab`

---

### T6: Live Metrics panel

**What**: Mount Live Metrics UI + i18n keys used by panel  
**Where**: `client/src/ui/live-metrics-panel.ts` (+ test), catalogs  
**Depends on**: T5  
**Requirement**: CL-05, CL-09  
**Done when**:
- [ ] sync renders metrics; FAB open/close; data-testids
- [ ] Hidden when setVisible(false)
**Tests**: unit  
**Gate**: quick client  
**Commit**: `feat(chaos-lab): add Live Metrics panel`

---

### T7: Quick Chaos toolbar

**What**: Quick Chaos strip with activate/clear  
**Where**: `client/src/ui/quick-chaos-toolbar.ts` (+ test)  
**Depends on**: T5  
**Requirement**: CL-06  
**Done when**:
- [ ] 7 chips; active sole; disabled empty graph; horizontal scroll styles
**Tests**: unit  
**Gate**: quick client  
**Commit**: `feat(chaos-lab): add Quick Chaos toolbar`

---

### T8: Chaos Lab drawer + Resilience Report

**What**: Drawer with catalog + report Clear  
**Where**: `client/src/ui/chaos-lab-panel.ts`, `resilience-report.ts` (+ tests)  
**Depends on**: T6, T7  
**Requirement**: CL-07, CL-08  
**Done when**:
- [ ] FAB/drawer pattern; probe append; Clear; phone card layout CSS
**Tests**: unit  
**Gate**: quick client  
**Commit**: `feat(chaos-lab): add Chaos Lab drawer and resilience report`

---

### T9: Wire phase-navigation

**What**: Mount panels in sandbox/study; re-eval with chaos; exclusivity; speedrun skip  
**Where**: `client/src/session/phase-navigation.ts` (+ test if needed)  
**Depends on**: T8  
**Requirement**: CL-05–09  
**Done when**:
- [ ] Speedrun: no mount
- [ ] Chaos updates pressures/metrics in GameState
- [ ] Opening chaos/metrics/workload/mentor closes others
- [ ] Judge path omits chaos
**Tests**: unit  
**Gate**: quick client  
**Commit**: `feat(chaos-lab): wire chaos lab into session canvas`

---

### T10: Mobile exclusivity + touch targets

**What**: Ensure ≥44px, safe-area FABs, exclusivity tests  
**Where**: panel CSS + `client/src/ui/chaos-lab-mobile.test.ts`  
**Depends on**: T9  
**Requirement**: CL-08  
**Done when**:
- [ ] Tests assert FAB min-height and mutual exclusion with workload/mentor/metrics
**Tests**: unit  
**Gate**: quick client  
**Commit**: `test(chaos-lab): cover mobile FAB exclusivity and targets`

---

### T11: i18n completeness + AD-037

**What**: Full EN/pt-BR keys; STATE.md AD-037 + handoff; roadmap note  
**Where**: catalogs, `.specs/STATE.md`, `docs/ROADMAP.md`  
**Depends on**: T9  
**Requirement**: CL-09  
**Done when**:
- [ ] Key parity test passes
- [ ] AD-037 documented
**Tests**: unit (i18n)  
**Gate**: full  
**Commit**: `docs(chaos-lab): i18n keys and AD-037`

---

### T12: P2 replica tip affordance

**What**: Info tip for SQL/NoSQL replica write-primary teaching  
**Where**: `client/src/blueprint/node-card.ts` or small tip helper (+ test)  
**Depends on**: T9  
**Requirement**: CL-10  
**Done when**:
- [ ] Tip text available via tap/info (not hover-only)
**Tests**: unit  
**Gate**: full  
**Commit**: `feat(chaos-lab): add replica write-primary tip`

---

## Phase Execution Map

```
Phase 1: T1 → T2 → T3 → T4
Phase 2: T5 → T6 → T7
Phase 3: T8 → T9 → T10
Phase 4: T11 → T12
```

## Diagram-Definition Cross-Check

| Task | Depends On | Diagram | Status |
| ---- | ---------- | ------- | ------ |
| T1 | None | — | ✅ |
| T2 | T1 | T1→T2 | ✅ |
| T3 | T2 | T2→T3 | ✅ |
| T4 | T3 | T3→T4 | ✅ |
| T5 | T4 | T4→T5 | ✅ |
| T6 | T5 | T5→T6 | ✅ |
| T7 | T5 | T5→T7 | ✅ |
| T8 | T6,T7 | →T8 | ✅ |
| T9 | T8 | T8→T9 | ✅ |
| T10 | T9 | T9→T10 | ✅ |
| T11 | T9 | T9→T11 | ✅ |
| T12 | T9 | T9→T12 | ✅ |

## Test Co-location Validation

| Task | Layer | Matrix | Task Says | Status |
| ---- | ----- | ------ | --------- | ------ |
| T1–T4 | shared domain | unit | unit | ✅ |
| T5–T10,T12 | client UI | unit | unit | ✅ |
| T11 | i18n/docs | unit + docs | unit | ✅ |
