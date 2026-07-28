# Study Mode + Simulation Realism — Specification

**Branch:** `feature/study-mode`  
**Depends on:** blueprint-2d-canvas (AD-020), config-depth (AD-030), hobby-platform (AD-025)  
**Complexity:** Complex  
**Status:** Confirmed — decisions locked in plan (no discuss)  
**ADs:** AD-031 (sim v2 + findings), AD-032 (sandbox Study Mode), AD-033 (mentor API)

---

## Problem Statement

The educational simulation uses abstract `traffic` 1–5 and does not detect SPOFs, misplaced caches, or missing queues. “Study” today means problem practice without a timer — there is no freeform sandbox with absolute workload knobs or an on-demand AI mentor. Learners cannot experiment like architects or get senior feedback without submitting a problem judge.

## Goals

- [ ] Workload-aware, path-propagating simulation (sim v2) with absolute RPS metrics
- [ ] Deterministic topology findings (SPOF, missing cache/MQ, bottlenecks, etc.)
- [ ] Freeform **Study Mode** (`sandbox`) with workload panel — no problem required
- [ ] On-demand AI mentor (5 actions) in sandbox only
- [ ] Preserve problem Practice (`study`) / Speedrun behavior and existing Vitest fixtures

## Out of Scope

| Item | Reason |
| ---- | ------ |
| Discrete-event / queueing-theory simulator | Browser + Vitest constraints |
| Chaos failure injection UI | Deferred |
| Replacing structural judge with sim scores | AD-027 intact |
| Mentor auto-fire on graph edits | Cost control |
| New component catalog types | Deferred |

## Assumptions

| Topic | Assumption |
| ----- | ---------- |
| Mode id | `GameMode` += `'sandbox'`; UI EN “Study Mode” / PT “Modo Estudo” |
| Problem no-timer | Mode stays `study`; copy → Practice / Praticar |
| Sentinel problem | `problemId === '__sandbox__'` for sessions |
| Absolute unset | When workload absolute fields absent, `BASE_RPS × traffic` preserves AD-020 fixtures |
| Mentor auth | Guest OK; IP rate limit like judge |
| Locale | EN \| pt-BR (AD-024) |

## User Stories

### P1: Workload schema ⭐

**AC:** WHEN graph simulation includes absolute fields (`rps`, `readRps`, `writeRps`, …) THEN `normalizeGraph` clamps them. WHEN absolute fields unset THEN `traffic`/`readRatio` alone drive load as before.

### P1: Path-aware simulation ⭐

**AC:** WHEN simulation runs THEN load propagates from client nodes along edges; CACHE/CDN attenuate downstream reads; edge labels REQ/CACHE/DB influence read/write weight. WHEN pressure ≥1 THEN node is `hot`.

### P1: Topology findings ⭐

**AC:** WHEN `analyzeTopology(graph, evaluation)` runs THEN it returns coded findings (`SPOF`, `MISSING_CACHE`, `MISSING_MQ`, `NO_LB`, `SINGLE_PRIMARY`, `CACHE_OFF_PATH`, `CONSISTENCY_RISK`, `BOTTLENECK`, `OVERPROVISION`) with bilingual reasons when conditions match.

### P1: Sandbox Study Mode ⭐

**AC:** WHEN player clicks Study Mode on library THEN session starts in `sandbox` with empty canvas, no briefing/requirements gate, no timer, no leaderboard. WHEN workload panel changes THEN `graph.simulation` updates and re-evaluates.

### P1: AI Mentor ⭐

**AC:** WHEN player clicks one of five mentor actions THEN client POSTs `/api/mentor` with action + graph + findings. WHEN no LLM key THEN mock mentor replies from findings. WHEN LLM present THEN single focused prompt returns senior-style feedback.

### P2: Findings UI

**AC:** WHEN findings exist and sim running THEN findings panel lists them; hot nodes still show BOTTLENECK badges.

### P2: i18n

**AC:** WHEN locale is en or pt-BR THEN Study Mode CTA, workload labels, mentor buttons, and finding strings localize (jargon stays English).

## Requirement IDs

| ID | Story |
| -- | ----- |
| SM-01 | SimulationSettings workload fields + normalize |
| SM-02 | Path-aware evaluateSimulation + intent weights |
| SM-03 | analyzeTopology findings |
| SM-04 | Findings panel + wire into canvas |
| SM-05 | GameMode sandbox + session/library CTA |
| SM-06 | Workload panel UI |
| SM-07 | Mentor API (Fastify + Vercel) + mock |
| SM-08 | Mentor chrome buttons + client |
| SM-09 | i18n + STATE/ADs + back-compat gates |

## Success Criteria

- [ ] 50k RPS read-heavy + single uncached SQL → `hot` + `MISSING_CACHE` and/or `SPOF`
- [ ] Cache on path + replicas → pressure improves
- [ ] Mentor bottlenecks action returns grounded feedback (LLM or mock)
- [ ] Problem study/speedrun gates still green
- [ ] Production deploy serves Study Mode + `/api/mentor`
