# Judge Realism — Context

**Gathered:** 2026-07-28  
**Spec:** `.specs/features/judge-realism/spec.md` (Confirmed 2026-07-28)  
**Status:** Approved — 2026-07-28

---

## Feature Boundary

Make judging **problem-specific and trustworthy**: the same architecture graph must not pass the wrong problem; configs that matter at scale affect simulation and judge outcomes; feedback includes scale narrative (QPS / storage / fan-out as relevant). Library stays at **27** playable problems; this epic ships **Baseline** gates for all + **Deep** rubrics for a **Core Realism Set (13)**. Does **not** add new game modes, auth, or a new canvas paradigm.

---

## Implementation Decisions

### 1. Mock / no-API-key path (user: **1C**)

- **Hybrid:** every problem has **deterministic structural rules** (must-have / anti-pattern components and topology expectations).
- When `LLM_API_KEY` is present (and `JUDGE_USE_MOCK` is not forcing mock): structural evaluation runs, then **LLM narrative** (dual-judge) enriches feedback and soft scoring — subject to structural hard gates.
- **Kill** the current behavior where URL-shortener golden tiers are applied to **all** problems when the key is missing.

### 2. Configs on the paper icon (user: **2A**)

- Expand configs for components that matter at scale (e.g. cache hit rate, SQL shards, CDN TTL, MQ durability, WS fan-out, LB strategy, and similar).
- Wire configs into **both** simulation pressure and judge scoring/verdict — not judge-only.

### 3. Rollout scope (user: **3A** → **amended on confirm**)

- Library **keeps all 27** challenges (do not delete from catalog).
- Epic ships **Baseline structural** for every problem (kills golden reuse) + **Deep** rubrics for **Core Realism Set (13)**:
  - Easy: all 7
  - Medium: `chat-system`, `news-feed`, `youtube`
  - Hard: `zoom-conference`, `ticketmaster`, `stripe-payments`
- Non-Core Deep expansion → deferred follow-up.

### 4. Trustworthy learning bar (user: **4C**)

- **Hard gate in tests:** a graph that PASSes problem A **MUST FAIL** (or at least not PASS/PARTIAL) when submitted as problem B, for curated cross-problem pairs.
- Judge feedback **must** include a **scale narrative** (QPS, storage, fan-out, or problem-relevant scale dimensions).

### 5. Without `LLM_API_KEY` (agent discretion: **5A**)

- **Structural-only** verdict + blockers from problem rubrics.
- Short bilingual note that rich narrative needs LLM configured.
- No URL-shortener golden-tier reuse; no fake LLM prose for other problems.
- CI remains deterministic and never calls the network.

### 6. Structural vs LLM when both run (agent discretion: **6A**)

- Structural rules can **hard-block** PASS (and create critical blockers) per AD-016.
- LLM **cannot** override a structural hard-fail into PASS.
- LLM owns narrative, soft gaps, and score nuance within structural constraints.

### 7. Config depth in this epic (agent discretion: **7B** within **2A**)

- Ship a shared **scale-critical** config set (cache / CDN / SQL / MQ / WS / LB / and other high-leverage types) wired to sim + judge.
- Other component types keep today’s shallow config until a later polish pass.
- Paper-icon UX stays the entry point; expand fields for the scale-critical set.

### 8. Shipping packs inside the epic (agent discretion: **8B**)

- Work on `feature/judge-realism` with packs: Baseline engine → Core Easy Deep → Core Medium/Hard Deep.
- Merge to `main` can happen per pack once that pack’s gates pass.
- Epic complete when Baseline 27/27 + Deep Core 13/13 + discrimination suite (incl. url-shortener → zoom).

### 9. Scale narrative enforcement (agent discretion: **9A** + structural fallback)

- **With LLM:** missing scale narrative → **cannot reach PASS** (schema / post-check).
- **Without LLM:** structural path emits a **fixed per-problem scale checklist** line (from the rubric), so the learning bar still surfaces scale without inventing LLM text.

### LLM / ops (session)

- OpenRouter configured locally and on Vercel (`LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL=openai/gpt-4o-mini`).
- User accepted **no key rotate** after chat exposure; redeploy production when live judge should leave mock.

---

## Agent's Discretion

- Exact rubric schema and how problem packs are sliced in tasks
- Which cross-problem pairs form the minimum discrimination suite vs full 27×26 matrix (prefer representative + high-confusion pairs, not combinatorial explosion)
- Prompt structure for dual-judge once structural gates exist
- Order of scale-critical config fields and sim formula details (Design)

---

## Declined / Undiscussed Gray Areas → Assumptions

| Topic | Assumption | Rationale |
| ----- | ---------- | --------- |
| Tutorial exception | URL Shortener keeps guided tutorial UX; still uses its own structural rubric (not global golden reuse) | AD-014 + kill root cause |
| Ranking impact | Speedrun / leaderboard still AD-016; structural hard-blocks apply equally | Consistency |
| Locale | Scale narrative and structural messages follow AD-024 (EN / pt-BR) | Existing product rule |

---

## Specific References

- Root cause: mock LLM maps any graph to URL-shortener golden tiers when key missing → videoconference can “pass” with a shortener graph.
- Skills to ground Design: `ddia-systems`, `interview-system-designer`.
- Prior product: AD-016 verdict bands; AD-019 graph configs; AD-020 sim; hybrid judge from `ai-judge` / Hobby.

---

## Deferred Ideas

- Deep anti-patterns for non-Core problems (`judge-realism-depth` follow-up)
- Deep configs for every Tier-3/4 component type beyond the scale-critical set
- Live LLM calls in CI
- Streaming judge debate UX
- Neon / new persistence for judge history
- Separate “judge calibration dashboard” for authors
- Removing challenges from the product library
