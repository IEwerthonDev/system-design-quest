# Vercel AI Judge + Pressure Reasons

**Slug:** `vercel-judge`  
**Status:** Execute  
**Branch:** `feature/vercel-judge`

## Problem

Hobby preview serves only the static Vite client. Submit for judging POSTs `/api/judge`, which has no serverless handler — progress UI is simulated, then the request fails. Separately, BOTTLENECK/QUEUEING labels lack a short educational reason for beginners (AD-013).

## Goals

- [ ] Same-origin `POST /api/judge` works on Vercel Hobby (static client + serverless function)
- [ ] Hybrid LLM: real dual-judge when `LLM_API_KEY` set; deterministic mock when missing (including production)
- [ ] Running simulation shows PT-BR reason under BOTTLENECK/QUEUEING

## Out of Scope

| Item | Why |
| ---- | --- |
| Sessions / leaderboard on Hobby | Need durable store; deferred |
| Durable rate-limit (KV) | Soft in-memory OK for preview |
| Wrapping full Fastify on Vercel | Thin handler only |

## Requirements

### P1: Serverless judge on Hobby

1. WHEN the client POSTs `/api/judge` on the Vercel deployment THEN the system SHALL return a `JudgeResult` JSON (not SPA HTML)
2. WHEN `LLM_API_KEY` is unset (any `NODE_ENV`) THEN the system SHALL use the mock LLM and return 200 for valid payloads
3. WHEN `LLM_API_KEY` is set and `JUDGE_USE_MOCK` is not `true` THEN the system SHALL use the real OpenAI-compatible client
4. WHEN `JUDGE_USE_MOCK=true` THEN the system SHALL use mock even if a key is present
5. WHEN the request body is invalid THEN the system SHALL return 400 with a message
6. SPA rewrites SHALL NOT capture `/api/*`

### P1: Pressure reasons

1. WHEN simulation is running and pressure is `hot` THEN the card SHALL show BOTTLENECK plus a non-empty PT-BR reason
2. WHEN simulation is running and pressure is `warn` THEN the card SHALL show QUEUEING plus a non-empty PT-BR reason
3. WHEN pressure is `ok` or simulation is stopped THEN the reason SHALL be hidden
4. Reasons SHALL be deterministic from `evaluateSimulation` (not LLM)

## Assumptions

- Hobby `maxDuration` 60s matches client abort
- In-memory rate limit remains best-effort across isolates
