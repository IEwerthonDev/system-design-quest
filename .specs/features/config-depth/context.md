# Config Depth — Context

**Status:** Approved (agent discretion) — 2026-07-28  
**Decisions locked:** 1B · 2B · 3B · 4A

## Feature boundary

Expand paper-icon configs beyond judge-realism AD-028 so designs can express interview-grade detail. Configs affect simulation + structural score (detail bonus capped) + LLM prompts. Does **not** add Tier-3 catalog types, new game modes, or auth changes.

## Locked decisions

| # | Choice | Meaning |
| - | ------ | ------- |
| 1 | **B** | P1 new types + deepen existing scale-critical configs |
| 2 | **B** | Structural penalties + capped detail bonus for deliberate configs/notes |
| 3 | **B** | Split `kafka` config kind (retention + RF) from generic `mq` |
| 4 | **A** | Advanced fields behind toggle; basics always visible |

## Deferred

- Catalog Tier-3 types not in code (`transcoder`, `geospatial`, …)
- Authoring UI for rubrics
- Uncapped checkbox farming (bonus hard-capped; blockers still win)
