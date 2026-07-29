# Requirement Coverage from Graph — Specification

**Branch:** `feature/requirement-coverage`  
**Depends on:** ai-judge, judge-realism (AD-027), study-mode (AD-031)  
**Complexity:** Medium  
**Status:** Confirmed — user approved full scope (coverage engine + FeedbackItem coercion)  
**ADs:** AD-036

---

## Problem Statement

The "Cobertura de requisitos" table never reflects the player's diagram. On the LLM path, `buildRequirementCoverage` only accepts an LLM coverage item when its `requirement` string matches the declared requirement **byte for byte**; the live model returns paraphrases (and even returns `strengths`/`criticalIssues` as plain strings instead of `FeedbackItem` objects), so every requirement falls back to `missing`. On the mock/structural path the opposite happens: zero blockers marks **every** requirement `covered`. Reproduced in production: a URL-shortener graph with all Baseline must-haves scored 85/100 `PASS` with `structuralCodes: []` while all six requirements showed "Faltando".

Result: the learner cannot tell which requirement their architecture actually satisfies, and the table teaches nothing.

## Goals

- [ ] Coverage status derived **deterministically from the graph** for every declared requirement
- [ ] LLM may refine or downgrade coverage, never invent `covered`
- [ ] Live-LLM string feedback items no longer break the result payload (titles rendered, severity preserved)
- [ ] Existing judge verdict/score behavior (AD-016, AD-027) unchanged

## Out of Scope

| Item | Reason |
| ---- | ------ |
| Changing scores / verdict thresholds | AD-016 stays as is; this is coverage reporting only |
| Per-problem hand-written coverage rules for all 27 problems | Capability rules are problem-agnostic; per-problem tuning deferred |
| New component types | Coverage uses today's catalog |
| Requirement text editing UX | Client-side checklist unchanged |
| LLM prompt rewrite for verbatim echo | Superseded by deterministic base — prompt stays |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Coverage source of truth | Deterministic graph analysis (`analyzeRequirementCoverage`) | Structural-first, same spirit as AD-027 | y |
| Requirement → capability mapping | Keyword classification, accent/case-insensitive, PT-BR + EN | Requirements are free text from the checklist | y |
| Unclassifiable requirement | `partial` + explanation saying it could not be verified structurally | Honest; avoids false `missing` and false `covered` | y (agent default) |
| LLM merge policy | Match by normalized text; LLM may only **downgrade** status (`covered`→`partial`→`missing`) | Prevents LLM from inventing coverage (JR-02) | y |
| Structural-only path | Uses the same engine (no more all-covered / all-missing) | One behavior on both paths | y |
| Live-LLM string items | Coerced to `FeedbackItem` with the string as `title` + `explanation`, empty `howToImprove`/`whyItMatters`, no severity | Strings carry no severity, so they cannot fake a blocker | y |
| Locale | Explanations bilingual EN / pt-BR (AD-024) | Existing rule | y |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Coverage reflects my diagram ⭐ MVP

**User Story**: As a learner, I want each declared requirement marked covered/partial/missing based on what I actually drew, so I learn which architecture decision satisfies which requirement.

**Why P1**: The table is the main teaching surface of the judge result and is currently always wrong.

**Acceptance Criteria**:

1. WHEN a graph has a client→app→store write path THEN a requirement classified as write capability SHALL be `covered`.
2. WHEN a graph reaches a store on a client path with cache/CDN before it THEN a read/redirect requirement SHALL be `covered`; WHEN the store is reached with no cache on that path THEN it SHALL be `partial`.
3. WHEN no persistent store is reachable from a client THEN write and read requirements SHALL be `missing`.
4. WHEN a requirement text matches no known capability THEN status SHALL be `partial` with an explanation stating it was not verifiable from the graph.
5. WHEN locale is `en` or `pt-BR` THEN explanations SHALL be in that locale.

**Independent Test**: Run the engine over the URL-shortener golden `good` graph (all six suggested requirements `covered`/`partial`, none `missing`) and over an empty graph (`missing`).

---

### P1: Non-functional capabilities graded by configuration ⭐ MVP

**User Story**: As a learner, I want latency/throughput/availability requirements graded from replicas, cache hit rate, and DB topology so scale configs matter.

**Acceptance Criteria**:

1. WHEN a cache or CDN sits on the read path with `hitRate ≥ 80` THEN a latency requirement SHALL be `covered`; WHEN a cache exists off the read path or with `hitRate < 80` THEN `partial`; WHEN absent THEN `missing`.
2. WHEN load balancing exists AND app replicas ≥ 2 AND a cache/CDN exists THEN a throughput requirement SHALL be `covered`; WHEN only part holds THEN `partial`; WHEN none THEN `missing`.
3. WHEN load balancer, app, and store are all redundant (replicas ≥ 2, or store `replicationFactor ≥ 2` / a `replica` topology role) THEN an availability requirement SHALL be `covered`; WHEN at least one is redundant THEN `partial`; WHEN none THEN `missing`.
4. WHEN a uniqueness/collision requirement is declared AND a store exists with hash partitioning, a partition key, or notes naming a code strategy (base62, hash, uuid, snowflake, kgs) THEN `covered`; WHEN only a store exists THEN `partial`.

**Independent Test**: Same graph with `hitRate: 95` vs `hitRate: 50`, and `replicas: 1` vs `5`, yields different statuses.

---

### P1: LLM cannot fake coverage ⭐ MVP

**User Story**: As the product owner, I want the LLM to only downgrade coverage so judgments stay trustworthy.

**Acceptance Criteria**:

1. WHEN the LLM returns a coverage item for a requirement with a **worse** status than the graph analysis THEN the result SHALL use the LLM status and explanation.
2. WHEN the LLM returns a **better** status than the graph analysis THEN the result SHALL keep the graph status.
3. WHEN the LLM requirement text differs only by case, accents, punctuation, or surrounding whitespace THEN it SHALL still match the declared requirement.
4. WHEN the LLM returns no coverage array THEN the result SHALL still contain one entry per declared requirement from the graph analysis.

**Independent Test**: `buildRequirementCoverage` with stub LLM partials (downgrade, upgrade, accent-variant text, empty).

---

### P1: Live-LLM string feedback no longer breaks the payload ⭐ MVP

**User Story**: As a player, I want feedback cards to always render a title, even when the model answers with plain strings.

**Acceptance Criteria**:

1. WHEN an LLM list field contains strings THEN each SHALL become a `FeedbackItem` whose `title` and `explanation` are that string, with empty `howToImprove`/`whyItMatters` and no `severity`.
2. WHEN an LLM item is an object missing fields THEN missing string fields SHALL default to `''` and `severity`/`relatedComponents` SHALL be preserved when valid.
3. WHEN an LLM item is neither string nor object (null, number) THEN it SHALL be dropped.
4. WHEN a coerced string item is present THEN it SHALL NOT count as a blocker for AD-016 verdict rules.

**Independent Test**: `normalizeJudgePartialResult` with mixed string/object/null lists.

---

## Edge Cases

- WHEN the graph is empty THEN every requirement SHALL be `missing` (no crash).
- WHEN there are no declared requirements THEN coverage SHALL be `[]`.
- WHEN the same requirement text is declared twice THEN one entry per declaration SHALL be returned.
- WHEN a store is present but unreachable from any client THEN write/read requirements SHALL NOT be `covered`.
- WHEN a graph has no client node THEN reachability SHALL fall back to component presence rather than reporting everything missing.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| RC-01 | P1: Coverage reflects diagram (paths, statuses, fallback) | Tasks | Pending |
| RC-02 | P1: NFR capabilities from configs (latency, throughput, availability, uniqueness) | Tasks | Pending |
| RC-03 | P1: LLM downgrade-only merge + normalized matching | Tasks | Pending |
| RC-04 | P1: FeedbackItem coercion for live-LLM strings | Tasks | Pending |
| RC-05 | Edge cases (empty graph, no requirements, no client, duplicates) | Tasks | Pending |

**Coverage:** 5 total, mapped in tasks.md

---

## Success Criteria

- [ ] Production probe of the URL-shortener graph shows the six requirements as `covered`/`partial` with graph-specific explanations, not six `missing`
- [ ] Empty graph still reports `missing` for every requirement
- [ ] `nx run-many -t lint test` green; Verifier PASS; shipped to production
