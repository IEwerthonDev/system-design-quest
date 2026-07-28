# Study Mode — Validation

**Spec:** `.specs/features/study-mode/spec.md`  
**Branch:** `feature/study-mode`  
**Gate:** `npx nx run-many -t lint test` → PASS (shared 125+, server 144, client 419)

## AC evidence

| ID | Evidence |
| -- | -------- |
| SM-01 | `normalize-graph.test.ts` absolute workload + derived readRatio |
| SM-02 | `evaluate-simulation.test.ts` traffic fixtures + 50k RPS hot SQL |
| SM-03 | `analyze-topology.test.ts` MISSING_CACHE/SPOF/MISSING_MQ/CACHE_OFF_PATH |
| SM-04 | `findings-panel.test.ts` |
| SM-05 | `problem-library.test.ts` sandbox CTA; session store sandbox phase |
| SM-06 | `workload-panel.test.ts` |
| SM-07 | `server/src/mentor/mentor.test.ts` |
| SM-08 | `mentor-panel.test.ts` |
| SM-09 | i18n catalogs + STATE AD-031–033; full gate green |

## Discrimination

- Empty canvas mentor → empty guidance
- Uncached 50k RPS → hot + findings
- Traffic-only fixtures unchanged

**Verdict:** PASS (author self-check pending independent Verifier on merge)
