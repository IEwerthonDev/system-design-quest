# Config Depth — Specification

**Context:** `.specs/features/config-depth/context.md` (Approved 2026-07-28)  
**Branch:** `feature/config-depth`  
**Depends on:** `judge-realism` (AD-027/028), `node-access-roles` (AD-029)  
**Complexity:** Large  
**Status:** Confirmed — agent discretion 1B·2B·3B·4A

---

## Problem Statement

Scale-critical configs (AD-028) cover only cache/CDN/SQL/MQ/WS/LB. Learners cannot express interview-grade knobs (rate limit algorithm, Kafka retention, NoSQL consistency, worker DLQ, etc.), so the AI judge cannot reward detailed designs.

## Goals

- Expand `ComponentConfig` for P1 types + deepen existing kinds
- Split `kafka` config kind from generic `mq`
- Wire configs into simulation pressure + structural `detailBonus` (cap 15) + LLM prompts
- Advanced fields behind toggle (newbie-friendly)
- Preserve AD-016/027: blockers still win; no checkbox-only PASS

## Out of Scope

| Item | Reason |
| ---- | ------ |
| Tier-3 catalog types not in code | Deferred |
| Uncapped detail farming | Cap + blockers |
| Rubric authoring UI | Deferred |

## User Stories

### P1: Expanded configs ⭐

**AC:** WHEN player opens paper-icon on configured types THEN UI exposes basic fields; Advanced toggle reveals advanced fields. WHEN values change THEN `normalizeGraph` clamps and simulation recomputes pressure.

### P1: Detail bonus ⭐

**AC:** WHEN graph has no structural blockers AND deliberate configs/notes THEN `scoreHint` MAY increase by ≤15 (`detailBonus`). WHEN blockers exist THEN detailBonus is 0.

### P1: Judge specialist prompts ⭐

**AC:** WHEN LLM path runs THEN prompts instruct rewarding scale configs + trade-off notes without overriding blockers.

## Requirement IDs

| ID | Story |
| -- | ----- |
| CD-01 | Expanded config kinds + normalize |
| CD-02 | Kafka kind split + mq migration |
| CD-03 | Simulation modifiers |
| CD-04 | detailBonus capped |
| CD-05 | Config popover + Advanced toggle |
| CD-06 | LLM prompt reward detail |
| CD-07 | i18n EN/PT-BR |

## Success Criteria

- [x] Gate `npx nx run-many -t lint test` green
- [x] detailBonus test proves score delta
- [x] Kafka defaults to `kind: 'kafka'`
