# Chaos Lab Context

**Gathered:** 2026-07-29  
**Spec:** `.specs/features/chaos-lab/spec.md`  
**Status:** Ready for design

---

## Feature Boundary

Deliver Playground-parity Chaos Lab: Quick Chaos (7), Live Metrics + SLOs, full failure catalog, Resilience Report — in Sandbox and Practice only; ephemeral one-at-a-time experiments; mobile FAB/drawer UX. No Mermaid, no Speedrun, no persistence, no discrete-event sim.

---

## Implementation Decisions

### Modes & persistence (locked 1A / 2A)

- Available in `sandbox` and `study` (Practice); hidden in `speedrun`
- One active chaos event; activating another clears the previous
- Resilience probes always evaluate event alone vs current graph+workload (ignore UI-active chaos when probing)
- Chaos state lives in client session memory / `__GAME_STATE__` only — never in `ArchitectureGraph` or KV sessions

### Live Metrics

- Pedagogical derivation from `evaluateSimulation` pressures + ingress RPS + chaos error/availability modifiers
- Phone: collapsed by default behind FAB; desktop: collapsible panel (top-right, below/near findings)
- Health tip bilingual; industry jargon (RPS, p99, SLO) stays English

### Quick Chaos vs Chaos Lab

- Quick Chaos = 7 shortcut chips on canvas (CPU Spike, Network Partition, High Latency, Connection Flap, Instance Crash, Cache Stampede, Traffic Surge)
- Chaos Lab drawer = Infrastructure + Network catalog + Resilience Report + Clear
- Running Quick or Lab event appends a report row (probe), and may also set active chaos for live canvas pressure (Quick always sets active; Lab “run” = probe + set active)

### Targeting

- Targeted events use: selected node → else hottest by pressure ratio → else first non-client node
- Global events (Traffic Surge, AZ/DC-style) ignore target

### Mobile

- Metrics FAB + Chaos FAB in thumb zone with safe-area; mutual exclusion with Workload/Mentor/palette
- Quick Chaos: horizontal scroll chips ≥44px
- Report: stacked cards on phone; table OK on desktop ≥769px
- Tips: info button / tap — no hover-only

### SURVIVED rule

- `SURVIVED` iff `minAvailability >= availabilityTarget` AND `p99Ms <= latencyTargetMs` (when latency target known)
- Availability target: problem NFR parse → else `simulation.targetAvailability` → else 99.9
- Latency target: parse problem NFR p99/ms → else 200ms pedagogical default for probe
- If both unknown: FAILED when any node `hot` OR availability < 99

### Agent's Discretion

- Exact numeric formulas for errorRate/availability/budget burn
- FAB vertical stacking offsets relative to Workload/Mentor
- Iconography (simple CSS/SVG, no new asset pipeline)

### Declined / Undiscussed → Assumptions

- All plan defaults accepted with 1A/2A

---

## Specific References

- Screenshots: Quick Chaos strip, Live Metrics panel, Chaos tab Resilience Report + Infrastructure/Network cards, SQL replica tip
- Inspiration: https://system-design-playground.replit.app

---

## Deferred Ideas

- Mermaid view (separate feature)
- Persisted chaos experiments / history across sessions
- Speedrun chaos challenges
