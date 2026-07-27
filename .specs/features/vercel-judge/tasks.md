# Tasks: vercel-judge

## Test Coverage Matrix

| Requirement | Test approach | Gate |
| ----------- | ------------- | ---- |
| Mock in production without key | `handle-judge-request` / route unit | `npx nx test server` |
| Valid judge 200 | existing + handler tests | `npx nx test server` |
| Invalid body 400 | existing | `npx nx test server` |
| Pressure reasons hot/warn | shared evaluate-simulation | `npx nx test shared` |
| Reason visible on card | blueprint-canvas test | `npx nx test client` |

## Tasks

### T1: Spec + STATE handoff stub

**Done when:** spec.md present; STATE Handoff points at `vercel-judge` / `feature/vercel-judge`

### T2: Shared handleJudgeRequest + mock-in-production

**Done when:**
- `createJudgeLlmClient` uses mock when no key (incl. production) or `JUDGE_USE_MOCK=true`
- Fastify route delegates to shared handler
- Production without key returns 200 (mock), not 503
- Gate: `npx nx test server`

### T3: Vercel `api/judge.ts` + vercel.json + env docs

**Done when:**
- `api/judge.ts` POST adapter
- SPA rewrite excludes `/api`
- `maxDuration` 60
- `.env.example` uses `LLM_BASE_URL`
- Gate: files present + server tests still pass

### T4: Pressure reasons (shared + UI)

**Done when:**
- `evaluateSimulation` returns `reasons` for warn/hot
- node-card shows `load-reason`; `__GAME_STATE__.pressureReasons`
- Gate: `npx nx test shared` && `npx nx test client`

### T5: Deploy + STATE finalize

**Done when:** Hobby preview redeployed; STATE updated with URL and AD note
