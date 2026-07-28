# Node Access Roles — Specification

**Branch:** `feature/node-access-roles`  
**Complexity:** Medium  
**Depends on:** `blueprint-2d-canvas`, `judge-realism`, AD-024  
**Status:** Confirmed by agent defaults (user: “decida você / pode iniciar”)

---

## Problem Statement

Players cannot tell the AI Judge whether a database is for **reads**, **writes**, or **both**. CQRS / primary–replica intent stays invisible. Locale also fails to refresh canvas/config chrome when switched mid-session.

## Goals

- [ ] SQL + NoSQL nodes expose `accessPattern`: `read` | `write` | `read_write`
- [ ] Same nodes expose peer `topologyRole`: `primary` | `replica` | `standalone`
- [ ] Config popover + canvas badge show the choice; judge prompt receives it in graph JSON
- [ ] Locale change refreshes library **and** canvas/config/palette chrome (AD-024)

## Out of Scope

| Item | Reason |
| ---- | ------ |
| New component types | Reuse sql_db / nosql_db |
| Deep sim pressure from accessPattern | Follow-up; judge narrative is enough for MVP |
| Translating industry component type names | AD-024 jargon stays English |

## Assumptions

| Decision | Default | Rationale |
| -------- | ------- | --------- |
| Access enum | `read` \| `write` \| `read_write` | User request |
| Default access | `read_write` | Backward compatible |
| Peer knob | `topologyRole`: primary \| replica \| standalone | Same fidelity as R/W; CQRS companion |
| NoSQL | New `nosql_db` config kind with same two fields | Tier-2 type had no config |
| Locale | `setLocale` dispatches `sdq:localechange`; canvas/config/palette listen | “TODO o sistema, até no desenho” |

## User Stories

### P1 — DB access pattern
As a player, I set a DB to leitura / escrita / ambos so the judge scores CQRS-aware designs.

### P1 — Topology role
As a player, I mark primary vs replica so the judge sees replication intent.

### P1 — Locale on canvas
As a player, switching EN/PT-BR updates config labels, badges, and palette chrome without remounting the whole app.

## Acceptance Criteria

1. WHEN a `sql_db` or `nosql_db` node is configured THEN `config.accessPattern` SHALL be one of `read` \| `write` \| `read_write` (default `read_write` via normalize).
2. WHEN the same node is configured THEN `config.topologyRole` SHALL be one of `primary` \| `replica` \| `standalone` (default `primary`).
3. WHEN the player opens the paper config popover on those nodes THEN they SHALL see localized selects for access + topology and changes SHALL persist on the graph.
4. WHEN accessPattern ≠ `read_write` OR topologyRole ≠ `primary` THEN the canvas node SHALL show a localized badge reflecting the choice.
5. WHEN the graph is submitted to `/api/judge` THEN `formatGraph` SHALL include the new config fields (existing JSON serialization).
6. WHEN locale changes via `setLocale` THEN listeners SHALL receive `sdq:localechange` and config/palette/canvas chrome strings SHALL update from catalogs.
7. WHEN a legacy graph lacks the new fields THEN `normalizeGraph` SHALL fill defaults without error.

## Gate

`npx nx run-many -t lint test`
