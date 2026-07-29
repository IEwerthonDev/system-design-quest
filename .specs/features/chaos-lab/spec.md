# Chaos Lab — Specification

**Branch:** `feature/chaos-lab`  
**Depends on:** study-mode (AD-031/032/035), link-validity-sim-realism (AD-034), playground-parity  
**Complexity:** Complex  
**Status:** Confirmed — decisions locked in plan (1A, 2A)  
**ADs:** AD-037 (ephemeral chaos session state)

---

## Problem Statement

Learners can raise traffic and see pressure/findings, but cannot inject Playground-style failures (partition, crash, stampede, surge) or read live SLO-style metrics (RPS, p95/p99, availability, budget burn, hottest). Without a resilience report they cannot practice “does this design survive?” in Sandbox/Practice.

## Goals

- [ ] Quick Chaos (7 events) applies one ephemeral failure modifier at a time
- [ ] Live Metrics panel: RPS, avg/p95/p99, error rate, availability, budget burn, hottest, SLO status, health tip
- [ ] Chaos Lab catalog (infra + network) + Resilience Report SURVIVED/FAILED
- [ ] Mobile-first FABs/drawers; Speedrun excluded; chaos never persists or affects judge

## Out of Scope

| Item | Reason |
| ---- | ------ |
| Speedrun chaos chrome | Ranking fairness (1A) |
| Persist chaos in sessions/KV/graph | Ephemeral (2A) |
| Mermaid view | Separate backlog |
| Discrete-event / real packet sim | AD-034 |
| Judge score from chaos | AD-027 |
| Stacking multiple active failures | 2A one-at-a-time |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Modes | Sandbox + Practice (`study`); not `speedrun` | 1A | y |
| Experiment model | One active event; probes isolated vs baseline; not saved | 2A | y |
| SURVIVED | avail ≥ target AND p99 ≤ latency SLO when parseable; else no `hot` + avail ≥ 99 | Pedagogical | y |
| Live Metrics | Always-on derived; phone collapsed FAB | AD-035 | y |
| Empty graph | Chaos disabled; probe no-op | Safety | y |
| Target node | Selected node, else hottest/`hot`, else first non-client | Playground parity | y |

**Open questions:** none — all resolved.

---

## User Stories

### P1: Failure catalog + modifiers ⭐ MVP

**User Story**: As a learner, I want a typed catalog of chaos events so failures behave deterministically.

**Acceptance Criteria**:

1. WHEN catalog is queried THEN it SHALL expose Quick (7), Infrastructure, and Network events with `id`, `group`, `scope` (`global`|`targeted`)
2. WHEN a modifier is applied for an event THEN it SHALL produce deterministic capacity/latency/error/availability effects
3. WHEN event B is activated WHILE A is active THEN A SHALL be cleared (sole active)

**Independent Test**: Unit tests for each Quick event modifier on a fixture graph.

---

### P1: Live Metrics ⭐ MVP

**User Story**: As a learner, I want live pedagogical metrics and SLO status while designing.

**Acceptance Criteria**:

1. WHEN canvas is open in sandbox/study THEN Live Metrics SHALL show Total RPS, avg latency, p95, p99, error rate, availability, budget burn, hottest component
2. WHEN problem (or workload) has availability/latency targets THEN SLO rows SHALL show met/missed
3. WHEN design is healthy at load THEN tip SHALL suggest raising traffic or opening Quick Chaos; WHEN constrained THEN tip SHALL name hottest/bottleneck
4. WHEN mode is speedrun THEN Live Metrics chrome SHALL NOT mount

**Independent Test**: `deriveLiveMetrics` unit + panel sync via `__GAME_STATE__.liveMetrics`.

---

### P1: Quick Chaos ⭐ MVP

**User Story**: As a learner, I want one-tap failure injection on the canvas.

**Acceptance Criteria**:

1. WHEN I tap a Quick Chaos event THEN that event SHALL become the sole active chaos and pressures/metrics SHALL update
2. WHEN I re-tap the active event or Clear THEN chaos SHALL turn off and baseline pressures SHALL restore
3. WHEN event is targeted and no node selected THEN system SHALL use hottest/`hot` node (or first eligible)
4. WHEN graph has zero nodes THEN Quick Chaos controls SHALL be disabled

**Independent Test**: Activate `instance_crash` → target pressure/capacity effect; clear → bit-identical baseline fixture.

---

### P1: Resilience Report + Chaos Lab ⭐ MVP

**User Story**: As a learner, I want to probe failures and see SURVIVED/FAILED against SLOs.

**Acceptance Criteria**:

1. WHEN I run an event from Quick Chaos or Chaos Lab THEN a report row SHALL append: event name, min availability, p99, SURVIVED|FAILED
2. WHEN probing THEN each event SHALL be evaluated alone against current graph+workload (not stacked with prior active chaos)
3. WHEN I Clear the report THEN the list SHALL empty
4. WHEN Chaos Lab opens on phone THEN catalog SHALL be stacked cards (not a wide table)

**Independent Test**: Probe Traffic Surge on resilient vs fragile fixture → SURVIVED vs FAILED; Clear empties `__GAME_STATE__.resilienceReport`.

---

### P1: Mobile chrome ⭐ MVP

**User Story**: As a phone user, I want Chaos/Metrics without covering the canvas permanently.

**Acceptance Criteria**:

1. WHEN phone/coarse pointer THEN Metrics and Chaos Lab SHALL use FAB + drawer with ≥44px targets and safe-area insets
2. WHEN opening Chaos Lab OR Metrics OR Workload OR Mentor THEN the others SHALL close (mutual exclusion)
3. WHEN Quick Chaos is shown on phone THEN chips SHALL scroll horizontally (≥44px), not a dense multi-row grid that eats the canvas
4. WHEN tips are shown THEN they SHALL use tap/info affordance — not hover-only

**Independent Test**: Client Vitest for FAB open/close exclusivity + min-height styles/testids.

---

### P2: Educational tip

**User Story**: As a learner, I want a short tip about replicas vs writes when inspecting DB nodes.

**Acceptance Criteria**:

1. WHEN tip affordance is shown for SQL/NoSQL THEN copy SHALL explain replicas add read capacity; writes stay on primary

---

## Edge Cases

- WHEN empty graph THEN chaos disabled; probe returns no row (or hint-only, no SURVIVED)
- WHEN target node deleted WHILE chaos active THEN chaos clears or retargets to hottest
- WHEN locale changes THEN chaos/metrics/report labels refresh (jargon English)
- WHEN judge runs THEN request body SHALL omit active chaos

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| CL-01 | Failure catalog + modifiers | Design | Pending |
| CL-02 | evaluateSimulation chaos hook + metrics fields | Design | Pending |
| CL-03 | deriveLiveMetrics + SLO + tip | Design | Pending |
| CL-04 | runResilienceProbe SURVIVED/FAILED | Design | Pending |
| CL-05 | Live Metrics panel + `__GAME_STATE__` | Design | Pending |
| CL-06 | Quick Chaos toolbar | Design | Pending |
| CL-07 | Chaos Lab drawer + catalog + report | Design | Pending |
| CL-08 | Mobile FABs / exclusivity / phone cards | Design | Pending |
| CL-09 | i18n EN/pt-BR + AD-037 + Speedrun guard | Design | Pending |
| CL-10 | P2 replica tip affordance | Design | Pending |

**Coverage:** 10 total, 0 mapped to tasks yet.

## Success Criteria

- [ ] Quick Chaos Instance Crash on single app → availability drop + FAILED probe
- [ ] Traffic Surge on overprovisioned design can SURVIVE
- [ ] Speedrun session has no chaos/metrics chrome
- [ ] Save/load session does not restore active chaos
- [ ] `nx run-many -t lint test` green
