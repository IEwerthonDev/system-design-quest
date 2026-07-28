# Judge Realism — Specification

**Parent:** `.specs/features/product/spec.md`  
**Context:** `.specs/features/judge-realism/context.md` (Approved 2026-07-28)  
**Branch:** `feature/judge-realism` (create at Execute)  
**Depends on:** `ai-judge`, `problem-library`, `blueprint-2d-canvas` (merged)  
**Complexity:** Complex — hybrid structural+LLM judging, tiered rubrics (Core deep + Baseline for rest), scale configs ↔ sim+judge  
**Skills for Design:** `ddia-systems`, `interview-system-designer`  
**Status:** Confirmed — 2026-07-28 (amended: keep 27 in library; deep rubrics for Core set only)

---

## Problem Statement

Today the hybrid judge falls back to **URL Shortener golden tiers for every problem** when `LLM_API_KEY` is missing (and mock fixtures otherwise ignore problem identity). A shortener-shaped graph can “pass” Videoconferência (`zoom-conference`) or other library problems — breaking trust. Paper-icon configs are shallow (mostly cache/CDN hit rate + SQL shards) and barely change pass/fail. Learners need **problem-specific structural gates**, **scale narrative**, and **configs that matter at scale** wired into simulation and judgment.

## Goals

- [ ] Same architecture graph that PASSes problem A **must not** PASS/PARTIAL on a curated wrong problem B (discrimination suite)
- [ ] Library stays at **27** playable problems (nothing removed from catalog)
- [ ] Every problem has at least a **Baseline** structural gate (must-haves from `expectedComponents` + scale checklist line) — kills golden reuse everywhere
- [ ] **Core Realism Set (~13)** gets deep rubrics (anti-patterns, richer scale, config-sensitive rules)
- [ ] Without LLM key: structural-only verdict; with key: structural hard-gates + dual-LLM narrative
- [ ] Judge feedback always includes **scale narrative** (or fixed scale checklist when structural-only)
- [ ] Scale-critical component configs (paper icon) affect **simulation pressure** and **judge score/verdict**
- [ ] AD-016 verdict bands preserved; LLM cannot override structural blockers into PASS
- [ ] `npx nx run-many -t lint test` passes; CI never calls live LLM

## Out of Scope

| Item | Reason |
| ---- | ------ |
| Removing challenges from the product library | Keep AD-015 catalog; reduce *deep-rubric* load, not playable content |
| Deep anti-patterns / multi-dimension scale for non-Core problems | Follow-up epic `judge-realism-depth` (or pack expansion) |
| Deep configs for every Tier-3/4 component beyond the scale-critical set | Deferred polish (context §7B / Deferred Ideas) |
| Live LLM calls in CI | AD-010 + context 5A — deterministic gates only |
| Streaming token-a-token judge debate | Existing step progress is enough |
| New auth / rate-limit redesign | Keep existing Hobby judge limits |
| Neon / new judge history store | Deferred |
| New canvas paradigm or game modes | Feature boundary |
| Changing AD-016 numeric thresholds | Product invariant |
| Authoring UI / calibration dashboard for rubrics | Deferred Ideas |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Mock / hybrid model | **1C** structural rules per problem + LLM narrative when key present | Discuss | y |
| Configs | **2A** expand scale-critical knobs; wire sim + judge | Discuss | y |
| Config depth this epic | **7B** shared scale-critical set (cache/CDN/SQL/MQ/WS/LB + high-leverage peers); others stay shallow | Agent discretion | y |
| Rollout | **Amended 3A:** library stays 27; epic ships **Baseline for all 27** + **Deep for Core Realism Set**; **8B** packs (Baseline engine → Core Easy → Core Medium/Hard) | User confirm 2026-07-28 + agent judgment | y |
| Core Realism Set | `url-shortener`, `rate-limiter`, `pastebin`, `unique-id-gen`, `distributed-cache`, `notification-system`, `key-value-store`, `chat-system`, `news-feed`, `youtube`, `zoom-conference`, `ticketmaster`, `stripe-payments` (13) | Covers tutorial + high-confusion + Hard trust demos without shallow 27-deep | y |
| Trust bar | **4C** cross-problem hard gate in tests + scale narrative required | Discuss | y |
| No API key | **5A** structural-only + short “configure LLM” note; bilingual AD-024 | Agent | y |
| Structural vs LLM | **6A** structural can hard-block PASS; LLM cannot override | Agent | y |
| Scale narrative | **9A** missing scale section → cannot PASS when LLM path; structural-only emits fixed per-problem scale checklist | Agent | y |
| Discrimination suite size | Representative + high-confusion pairs (not full 27×26); **must** include `url-shortener` good graph vs `zoom-conference` (and ≥1 other Hard/Medium mismatch) | Agent discretion — Design picks exact pairs | y (assumption) |
| Existing `rubric.expectedComponents` | Structural engine **extends** problem rubrics (must-have, anti-patterns, scale checklist, optional topology hints) — not throw away catalog fields | Grounded in `libs/shared` problems | y (assumption) |
| URL Shortener tutorial | Keeps guided UX; uses **its own** structural rubric (golden tiers only as fixtures for that problem, not globally) | AD-014 + kill root cause | y |
| Ranking / leaderboard | Still AD-016; structural blockers apply equally to Study and Speedrun submits | Consistency | y |
| LLM provider | Unchanged OpenAI-compatible env; OpenRouter already configured for prod/preview/dev | Session ops | y |
| Redeploy | Production picks up live LLM only after redeploy with env | Ops note, not product AC | y |

**Open questions:** none — all resolved in context or logged as assumptions above.

---

## Implicit-Requirement Dimensions

| Dimension | Resolution |
| --------- | ---------- |
| Input validation & bounds | Invalid/unknown `problemId` → existing API error behavior; graph normalized via `normalizeGraph` before structural eval; config fields clamped to documented ranges |
| Failure / partial-failure states | LLM timeout/5xx → existing client retry UX; structural result still computed first so fallback can return structural-only if Design chooses soft-degrade — **Assumption:** on LLM failure after structural pass path, return structural-enriched FAIL/PARTIAL with note “LLM unavailable”, never invent URL-shortener golden text |
| Idempotency / retry / duplicate | Judge remains request-scoped; retries safe (no durable side effect beyond existing session/LB rules) — N/A new semantics |
| Auth boundaries & rate limits | Unchanged AD-025/026 Hobby judge limits — N/A redesign |
| Concurrency / ordering | Single request dual-judge as today; structural eval is pure sync before LLM — N/A new races |
| Data lifecycle / expiry | Rubrics live in shared problem definitions (code), not KV TTL — N/A |
| Observability | Structural blockers include stable machine-readable codes (e.g. `missing_component`, `wrong_problem_fit`) for tests; no new metrics platform required |
| External-dependency failure | No key / mock force → structural-only; LLM down → see failure assumption above; CI never depends on network |
| State-transition integrity | Verdict still AD-016; structural blockers force FAIL (or block PASS/PARTIAL); scale-missing post-check blocks PASS only |

---

## User Stories

### P1: Problem-Specific Structural Rubrics ⭐ MVP

**User Story**: As a learner, I want judgment to use rules for **this** problem’s must-haves and anti-patterns, so a design that fits another product cannot falsely pass.

**Why P1**: Kills the root cause of untrustworthy learning.

**Acceptance Criteria**:

1. WHEN `POST /api/judge` runs for any library `problemId` THEN the server SHALL evaluate a **deterministic structural rubric** bound to that problem (must-have components and/or anti-patterns derived from the problem definition).
2. WHEN `LLM_API_KEY` is absent OR `JUDGE_USE_MOCK=true` THEN the server SHALL **not** map the submission to URL Shortener golden tiers for any `problemId` other than fixtures explicitly scoped to `url-shortener`.
3. WHEN structural evaluation finds a critical gap (missing must-have or hit anti-pattern marked blocker) THEN the result SHALL include at least one `criticalIssues` entry with severity `blocker` and the final verdict SHALL obey AD-016 (blockers preclude PASS/PARTIAL).
4. WHEN any library `problemId` is judged THEN it SHALL have at least **Baseline** structural coverage: ≥1 must-have from that problem’s `expectedComponents` (or explicit rubric must-haves) and ≥1 scale checklist line usable without LLM.
5. WHEN a problem is in the **Core Realism Set** THEN its rubric SHALL additionally include domain anti-patterns and richer scale (Easy/Medium ≥1 dimension detail; Hard ≥2) as specified in Design.
6. WHEN locale is `en` or `pt-BR` THEN structural issue messages and scale checklist lines SHALL be available in that locale (jargon may stay English per AD-024).

**Independent Test**: Submit a Client+DB+Cache URL-shortener-shaped graph as `zoom-conference` without LLM → FAIL with blocker citing missing media/signaling (or equivalent rubric), not shortener golden PASS.

---

### P1: Cross-Problem Discrimination Gate ⭐ MVP

**User Story**: As a product owner, I want automated tests that prove a good graph for problem A fails on problem B, so regressions cannot reintroduce fake passes.

**Why P1**: Trust bar 4C — hard gate in tests.

**Acceptance Criteria**:

1. WHEN the discrimination suite runs in CI THEN for each curated pair `(graphGoodForA, problemB)` the judge path under test SHALL yield verdict `FAIL` (or at minimum not `PASS` and not `PARTIAL`).
2. WHEN the suite includes the canonical mismatch THEN a graph that PASSes (or is the known-good fixture for) `url-shortener` SHALL FAIL when judged as `zoom-conference`.
3. WHEN the suite runs THEN it SHALL use the deterministic structural path (mock / no live LLM) so results are stable.
4. WHEN Design finalizes pairs THEN the suite SHALL cover ≥1 Easy→Hard, ≥1 Medium→different-Medium-or-Hard, and the url-shortener→zoom pair (minimum 3 pairs).

**Independent Test**: `nx`/Vitest discrimination file fails the build if shortener-good graph PARTIAL/PASSes on `zoom-conference`.

---

### P1: Hybrid LLM Narrative with Hard Gates ⭐ MVP

**User Story**: As a learner with LLM configured, I want rich dual-judge feedback that still cannot contradict structural truth, so I get depth without false confidence.

**Why P1**: 1C + 6A; production has OpenRouter key.

**Acceptance Criteria**:

1. WHEN `LLM_API_KEY` is set and mock is not forced THEN the server SHALL run structural evaluation **before** (or as a hard merge constraint on) dual-LLM consensus.
2. WHEN structural evaluation produced a blocker THEN the final verdict SHALL NOT be `PASS` or `PARTIAL`, even if the LLM text would suggest otherwise.
3. WHEN structural evaluation produced no blockers and LLM completes THEN the response SHALL include dual-judge narrative fields as today (`strengths`, `criticalIssues`, `improvements`, `judgeDebate`, `requirementCoverage`) enriched with problem-specific context.
4. WHEN LLM is not used THEN the response SHALL include a short bilingual note that richer narrative requires LLM configuration, plus structural strengths/issues/scale checklist (no fabricated shortener debate for other problems).

**Independent Test**: Force mock client that returns PASS JSON while structural blockers exist → API still returns FAIL with blockers.

---

### P1: Scale Narrative Bar ⭐ MVP

**User Story**: As a learner, I want every judgment to address scale (QPS, storage, fan-out, or problem-relevant dimensions), so I practice interview-grade thinking.

**Why P1**: Trust bar 4C / 9A.

**Acceptance Criteria**:

1. WHEN the LLM judge path returns a result claiming PASS THEN the payload SHALL include a non-empty **scale narrative** section (dedicated field or clearly identified block in improvements/debate — Design locks schema) covering at least one problem-relevant scale dimension from the problem’s scale checklist.
2. WHEN that scale narrative is missing or empty AFTER LLM consensus THEN the server SHALL downgrade so verdict **cannot be PASS** (PARTIAL or FAIL per AD-016 + Design rule).
3. WHEN structural-only path runs THEN the result SHALL include the problem’s **fixed scale checklist** lines (not free-form LLM prose).
4. WHEN problem difficulty is Hard **and** the problem is in the Core Realism Set THEN the scale checklist SHALL mention ≥2 distinct dimensions (e.g. QPS + consistency/fan-out/storage as relevant).

**Independent Test**: Stub LLM PASS without scale block → final verdict ≠ PASS; structural-only `youtube` includes scale checklist mentioning upload/CDN or equivalent.

---

### P2: Scale-Critical Configs (Paper Icon) → Sim + Judge

**User Story**: As a learner, I want meaningful knobs on components that matter at scale so changing hit rate, shards, TTL, durability, or fan-out visibly changes simulation and judgment.

**Why P2**: 2A / 7B — builds on trustworthy verdicts; still required for epic complete.

**Acceptance Criteria**:

1. WHEN the player opens the paper-icon config UI on a scale-critical component type THEN the UI SHALL expose the expanded fields for that type (beyond today’s shallow set where applicable).
2. WHEN scale-critical config values change THEN client-side simulation SHALL recompute pressure (`ok` \| `warn` \| `hot`) using those values (deterministic; Vitest-covered).
3. WHEN the graph is submitted to the judge THEN scale-critical configs SHALL be included in structural and/or LLM evaluation inputs and SHALL be able to create blockers or score penalties when clearly inadequate for the problem’s stated scale (e.g. cache hitRate too low for read-heavy Easy/Medium, shardCount=1 where rubric requires sharding).
4. WHEN a component type is **not** in the scale-critical set THEN it MAY keep current shallow/default config behavior.
5. WHEN config values are out of range THEN `normalizeGraph` (or equivalent) SHALL clamp to documented bounds before sim/judge.

**Independent Test**: Same topology for `url-shortener` with hitRate 10 vs 95 → different sim pressure and different judge score or issue set under structural path.

---

### P2: Rubric Packs — Baseline Library + Core Deep

**User Story**: As a curriculum designer, I want every catalog problem to stop false-passing, while deep interview rigor concentrates on a Core set so quality stays high.

**Why P2**: Amended 3A — 27 playable; deep work on 13; Baseline on the rest.

**Acceptance Criteria**:

1. WHEN the Baseline engine ships THEN all **27** problems SHALL fail the golden-reuse path and enforce must-have + scale checklist (JR Baseline).
2. WHEN the Core Easy pack ships THEN all **7 Easy** Core problems SHALL have **Deep** rubrics (anti-patterns + config-sensitive rules where applicable).
3. WHEN the Core Medium/Hard pack ships THEN the remaining Core ids (`chat-system`, `news-feed`, `youtube`, `zoom-conference`, `ticketmaster`, `stripe-payments`) SHALL have **Deep** rubrics; Hard Core entries SHALL meet ≥2 scale dimensions.
4. WHEN any pack merges THEN that pack’s discrimination + structural tests SHALL pass in CI before claiming the pack done.
5. WHEN the epic is marked complete THEN: Baseline 27/27 + Deep 13/13 Core + discrimination suite includes P1 minimum pairs; non-Core Deep expansion is explicitly out of scope.

**Independent Test**: Catalog test: 27 problems expose Baseline fields; 13 Core ids expose Deep fields; shortener-good vs zoom still FAIL.

---

### P3: Hard-Problem Depth Signals

**User Story**: As an advanced learner, I want Hard problems to flag deeper distributed-systems gaps (consistency, durability, coordination), so feedback matches senior interview expectations.

**Why P3**: Nice-to-have depth; DDIA-informed without blocking MVP trust bar.

**Acceptance Criteria**:

1. WHEN judging a Hard problem structurally THEN anti-patterns MAY include domain-specific blockers (e.g. payments without idempotency cue, lock service without fencing/lease cue) as defined per problem in Design.
2. WHEN LLM path runs on Hard THEN prompts SHALL instruct judges to discuss at least one consistency/durability/coordination trade-off relevant to that problem.

**Independent Test**: `stripe-payments` graph missing idempotency/ledger signal → structural blocker or explicit critical issue under structural path.

---

## Edge Cases

- WHEN `problemId` is valid but graph is empty → client local FAIL (unchanged); no API / no golden mapping.
- WHEN graph has nodes but zero edges → structural eval still runs; may FAIL for problems requiring connected data path.
- WHEN player submits correct components with absurd configs (hitRate 0, shardCount 1 on sharded Hard) → sim shows hot/warn; judge SHALL surface config inadequacy.
- WHEN `JUDGE_USE_MOCK=true` despite key present → structural-only (or structural + deterministic fixtures), never live LLM.
- WHEN LLM returns malformed JSON → existing repair/retry; after failure, structural-enriched response without fake golden tiers.
- WHEN locale switches mid-session → judge request uses current locale for narrative/structural strings.
- WHEN Speedrun submits → same structural+scale rules; leaderboard eligibility unchanged (AD-016).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| JR-01 | P1: Structural rubrics — per-problem eval | Design | Pending |
| JR-02 | P1: Structural rubrics — no cross-problem golden reuse | Design | Pending |
| JR-03 | P1: Structural rubrics — blockers → AD-016 | Design | Pending |
| JR-04 | P1: Structural — Baseline all 27 + scale checklist | Design | Pending |
| JR-05 | P1: Structural rubrics — bilingual messages | Design | Pending |
| JR-06 | P1: Discrimination suite — curated pairs FAIL | Design | Pending |
| JR-07 | P1: Discrimination — url-shortener vs zoom-conference | Design | Pending |
| JR-08 | P1: Discrimination — deterministic CI path | Design | Pending |
| JR-09 | P1: Discrimination — minimum pair coverage | Design | Pending |
| JR-10 | P1: Hybrid — structural before/constrains LLM | Design | Pending |
| JR-11 | P1: Hybrid — LLM cannot override blockers | Design | Pending |
| JR-12 | P1: Hybrid — rich narrative when LLM OK | Design | Pending |
| JR-13 | P1: Hybrid — structural-only note without key | Design | Pending |
| JR-14 | P1: Scale — LLM PASS requires scale narrative | Design | Pending |
| JR-15 | P1: Scale — missing narrative blocks PASS | Design | Pending |
| JR-16 | P1: Scale — structural checklist without LLM | Design | Pending |
| JR-17 | P1: Scale — Hard ≥2 dimensions | Design | Pending |
| JR-18 | P2: Config UI scale-critical fields | Design | Pending |
| JR-19 | P2: Config → simulation pressure | Design | Pending |
| JR-20 | P2: Config → judge score/blockers | Design | Pending |
| JR-21 | P2: Non-critical types stay shallow | Design | Pending |
| JR-22 | P2: Config clamp/normalize | Design | Pending |
| JR-23 | P2: Baseline engine — 27/27 no golden reuse | Design | Pending |
| JR-24 | P2: Core Easy pack — 7/7 Deep | Design | Pending |
| JR-25 | P2: Core Medium/Hard pack — 6/6 Deep | Design | Pending |
| JR-26 | P2: Pack CI gates | Design | Pending |
| JR-27 | P2: Epic complete = Baseline 27 + Deep Core 13 + suite | Design | Pending |
| JR-28 | P3: Hard anti-pattern depth (Core Hard) | Design | Pending |
| JR-29 | P3: Hard LLM trade-off prompt (Core Hard) | Design | Pending |
| JR-30 | P1: Structural — Deep rubric schema for Core set | Design | Pending |

**Coverage:** 30 total, 0 mapped to tasks, 30 unmapped ⚠️ (expected pre-Tasks)

---

## Success Criteria

- [ ] Canonical bug gone: shortener-good graph does **not** PASS/PARTIAL on `zoom-conference` (structural CI)
- [ ] Library still lists **27** problems; **Baseline** on all; **Deep** on Core 13
- [ ] With OpenRouter key on deployed judge: dual-LLM narrative appears; without key: structural-only, no false golden reuse
- [ ] Changing scale-critical configs changes sim pressure and judge outcome in tests
- [ ] Missing scale narrative cannot yield PASS on LLM path
- [ ] Quality gate `npx nx run-many -t lint test` green; no live LLM in CI

---

## Test Coverage Matrix (spec → tests)

| Acceptance criterion theme | Spec IDs | Test approach |
| -------------------------- | -------- | ------------- |
| No golden reuse | JR-02 | Unit: mock path + non-shortener problemId |
| Structural blockers | JR-01, JR-03 | Unit: structural engine fixtures |
| Discrimination | JR-06–JR-09 | Unit/integration: curated pairs |
| LLM cannot override | JR-10–JR-11 | Unit: stub LLM PASS + structural blocker |
| Scale narrative | JR-14–JR-17 | Unit: post-check + structural checklist |
| Configs ↔ sim/judge | JR-18–JR-22 | Unit: normalize + evaluateSimulation + structural |
| Pack coverage | JR-23–JR-27 | Catalog/rubric presence tests |
| Hard depth | JR-28–JR-29 | Unit fixtures per Hard id |

WebGL/canvas rendering is **not** asserted; use graph JSON + `window.__GAME_STATE__` only if UI config panel needs DOM hooks.
