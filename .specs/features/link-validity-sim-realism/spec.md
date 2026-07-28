# Link Validity + Sim Realism Specification

## Problem Statement

Players connect components without live visual feedback and without guidance on whether a link is pedagogically sound. Simulation findings for bottlenecks/queueing stay too coarse vs interview-realistic patterns (async decoupling, primary write concentration, hot partitions), and several connection/findings bugs block core canvas flows.

## Goals

- [ ] Live dashed preview follows the pointer while linking; color encodes validity (ok / warn / invalid)
- [ ] Component-type pair rules teach sensible topologies without blocking creative sandbox play for warn pairs
- [ ] Bottleneck/queueing findings closer to interview + DDIA teaching (async MQ, primary writes, hot partition, warn→QUEUE_BACKLOG)
- [ ] Fix P0 connection bugs: tap-to-connect, preview wiring, findings without Start

## Out of Scope

| Item | Reason |
| ---- | ------ |
| Discrete-event / Little’s-law queue simulator | AD-031 / study-mode out-of-scope |
| Full locale sweep of all session chrome | Separate i18n pass |
| Blocking all warn edges | Warn must remain creatable (teach, don’t punish) |
| 3D canvas parity | Blueprint is the play surface (AD-018) |

## User Stories

### P1 — Live link preview with validity color

**As a** player drawing edges, **I want** a visible line from the source handle to the cursor/target **so that** I know the connection is armed and whether the target makes sense.

**Acceptance Criteria:**

1. WHEN linking is armed and the pointer moves THEN the canvas SHALL show a dashed preview path from the source out-anchor toward the pointer (or hovered node in-anchor).
2. WHEN the hovered/target node is a valid ok pair THEN the preview stroke SHALL use the accent/ok color.
3. WHEN the hovered/target node is a warn pair THEN the preview stroke SHALL use warning yellow (`SDQ_COLORS.warning`).
4. WHEN the hovered/target is invalid (self, duplicate ordered pair, or pair rule `invalid`) THEN the preview stroke SHALL use danger red (`SDQ_COLORS.danger`) and completing the link SHALL be rejected.
5. WHEN linking is cancelled (Esc / clear) THEN the preview SHALL disappear.
6. WHEN `sync()` re-renders edges THEN any active preview SHALL remain visible (not wiped without re-apply).

### P1 — Pair compatibility rules

**As a** learner, **I want** nonsense links marked red and questionable shortcuts marked yellow **so that** I learn realistic topologies.

**Acceptance Criteria:**

7. WHEN assessing `fromType → toType` THEN the shared helper SHALL return `{ status: 'ok' \| 'warn' \| 'invalid', reasonPt, reasonEn }`.
8. WHEN status is `invalid` THEN link completion SHALL fail (same as self-loop / duplicate).
9. WHEN status is `warn` and the edge is created THEN the committed edge stroke SHALL remain warning yellow until selected (selected still uses accent).
10. WHEN status is `ok` THEN committed edge stroke SHALL use the default edge stroke.
11. Pair rules SHALL cover at least: client→DB direct = warn; DB→client = invalid; client→client = invalid; monitoring/logging as source to non-observability = warn; MQ→client = invalid; same-type loops that are not HA peer patterns = warn.

### P1 — Connection flow bugfixes

**Acceptance Criteria:**

12. WHEN linking is armed and the player taps/clicks a different node THEN the link SHALL complete (tap-to-connect), without starting a drag on that node.
13. WHEN linking is armed THEN a background pan gesture SHALL NOT clear `linkingFrom` (only Esc or successful/failed complete on invalid cancel policy: Esc + explicit cancel + completing invalid keeps armed until Esc or valid complete — **Assumption:** invalid complete attempt leaves linking armed; Esc/background cancel button clears).
14. WHEN an edge is selected on coarse pointer / mobile sheet THEN the connection-intent UI SHALL expose a Delete control that removes the edge.

### P1 — Sim / findings realism (DDIA + interview)

**Acceptance Criteria:**

15. WHEN absolute workload is active and the graph has `compute → MQ/kafka/pub_sub` THEN direct `compute → sql/nosql` write load SHALL be reduced by ~50% (async decoupling teaching).
16. WHEN SQL/NoSQL nodes have `topologyRole=primary` vs `replica` THEN write fraction SHALL concentrate on primary/standalone; replicas SHALL prefer read load.
17. WHEN SQL `keySkew ≥ 40` and pressure is `hot` THEN `analyzeTopology` SHALL emit `HOT_PARTITION` (major).
18. WHEN simulation pressure is `warn` THEN `analyzeTopology` SHALL emit `QUEUE_BACKLOG` (major) for those nodes (interview “queueing” signal).
19. WHEN mentor action is `bottlenecks` THEN mock path SHALL include both `BOTTLENECK` and `QUEUE_BACKLOG` findings.
20. Findings SHALL be computed from the current graph even when simulation is not running (structural findings always; pressure-based findings when an evaluation is available — **Assumption:** when not running, still call `evaluateSimulation` for pressure findings so mentor works without Start).
21. WHEN the graph changes (nodes/edges/replicas/config) on canvas THEN findings SHALL refresh.

### P2 — Small correctness

**Acceptance Criteria:**

22. WHEN an edge is deleted THEN `clearDbIntentRole(edgeId)` SHALL run.
23. WHEN hydrating a design session that has `judgeResult` THEN active session SHALL restore that result.

## Assumptions & Open Questions

| Assumption | Rationale |
| ---------- | --------- |
| Invalid pairs cannot be created; warn pairs can | Matches “não for possível” vs “não fizer sentido” |
| Background pan does not cancel linking | Fixes mobile miss-tap cancel |
| Evaluate sim even when not running for findings | Mentor + findings useful in Study Mode |
| ~50% write relief on async MQ path | Pedagogical, not queue-theory exact |
| Skip full i18n / session reopen UX beyond judge hydrate | Keep feature shippable |

## Implicit dimensions (Medium)

| Dimension | Resolution |
| --------- | ---------- |
| Input validation | Pair assessor pure function; graph still validates orphans |
| State transitions | Linking armed → preview → complete/cancel |
| Remaining | N/A for this scope (no auth, payments, external deps beyond mentor mock) |

## Success Criteria

- Vitest covers pair assessor, preview color statuses, tap-to-connect, async write relief, HOT_PARTITION + QUEUE_BACKLOG, mentor bottlenecks include queue backlog
- Manual: arm link → see line → hover invalid (red, no create) → warn (yellow, create) → ok
- Gate: `nx run-many -t lint test` green
