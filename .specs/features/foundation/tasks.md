# Foundation — Tasks

**Spec:** `.specs/features/foundation/spec.md`  
**Design:** inline (scaffold — sem design doc separado)  
**Branch:** `feature/foundation`

---

## Test Coverage Matrix

> Generated from project guidelines — confirm before Execute. Guidelines found: `AGENTS.md` (pending), TLC spec-driven defaults applied.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Shared (validation, types) | unit | All branches; 1:1 to spec ACs | `libs/shared/src/**/*.test.ts` | `npx nx test shared` |
| Client (session, hooks) | unit | Spec ACs via `__GAME_STATE__` | `client/src/**/*.test.ts` | `npx nx test client` |
| Server (health) | unit | Happy + error paths | `server/src/**/*.test.ts` | `npx nx test server` |
| Canvas renderer | unit (mocked THREE) | Graph serialize/deserialize | `client/src/scene/**/*.test.ts` | `npx nx test client` |

**Gate command:** `npx nx run-many -t lint test`

---

## Phase 0 Tasks

### T1: Init Nx monorepo

**Files:**
- Create: `package.json`, `nx.json`, `tsconfig.base.json`
- Create: `client/project.json`, `server/project.json`, `libs/shared/project.json`

**Req:** FND-01

- [ ] Criar workspace Nx com apps client/server e lib shared
- [ ] Configurar scripts: `dev`, `build`, `test`, `lint`
- [ ] Commit: `feat(foundation): init nx monorepo`

---

### T2: Shared types and validation

**Files:**
- Create: `libs/shared/src/schema/architecture-graph.ts`
- Create: `libs/shared/src/schema/component-types.ts`
- Create: `libs/shared/src/validation/validate-graph.ts`
- Test: `libs/shared/src/validation/validate-graph.test.ts`

**Interfaces:**
- Produces: `ArchitectureGraph`, `ComponentNode`, `ConnectionEdge`, `ComponentType`
- Produces: `validateGraph(graph): ValidationResult`

**Req:** FND-03

- [ ] Definir tipos base do grafo de arquitetura
- [ ] Implementar `validateGraph` (mínimo: nodes não-vazio, IDs únicos, edges referenciam nodes existentes)
- [ ] Testes unitários cobrindo grafo válido, vazio, edge órfã
- [ ] Commit: `feat(shared): architecture graph types and validation`

---

### T3: Fastify server with health check

**Files:**
- Create: `server/src/main.ts`
- Create: `server/src/routes/health.ts`
- Test: `server/src/routes/health.test.ts`

**Interfaces:**
- Produces: `GET /api/health → { status: 'ok', version: string }`

**Req:** FND-04

- [ ] Server Fastify na porta 3000
- [ ] Health check endpoint
- [ ] Teste de integração do endpoint
- [ ] Commit: `feat(server): health check endpoint`

---

### T4: Three.js canvas renderer (empty scene)

**Files:**
- Create: `client/index.html`
- Create: `client/src/main.ts`
- Create: `client/src/scene/canvas-renderer.ts`
- Create: `client/vite.config.ts`

**Interfaces:**
- Produces: `createCanvasRenderer(canvas): CanvasRenderer`
- Produces: `startRenderLoop(renderer): () => void`

**Req:** FND-02

- [ ] Canvas full-screen com grid no plano XZ
- [ ] Câmera isométrica + OrbitControls (zoom/pan, sem rotação livre excessiva)
- [ ] Render loop 60 FPS
- [ ] Commit: `feat(client): empty 3d canvas with isometric camera`

---

### T5: Test hook (`__GAME_STATE__`)

**Files:**
- Create: `client/src/test-hook.ts`
- Test: `client/src/test-hook.test.ts`

**Interfaces:**
- Produces: `window.__GAME_STATE__ = { graph, phase, mode }`

**Req:** FND-06

- [ ] Hook expõe estado serializável
- [ ] Teste em jsdom verifica presença e shape
- [ ] Commit: `feat(client): test hook for game state`

---

### T6: Dev orchestration

**Files:**
- Modify: `package.json` (scripts)
- Create: `client/vite.config.ts` (proxy `/api` → server:3000)

**Req:** FND-01

- [ ] `npm run dev` inicia client + server em paralelo (nx run-many)
- [ ] Proxy API no Vite dev server
- [ ] Commit: `feat(foundation): dev orchestration with api proxy`

---

### T7: Vitest + ESLint config

**Files:**
- Create: `vitest.workspace.ts`
- Create: `eslint.config.mjs`
- Create: test configs per project

**Req:** FND-05

- [ ] Vitest configurado para shared, client (jsdom), server
- [ ] ESLint + Prettier
- [ ] `npx nx run-many -t lint test` passa
- [ ] Commit: `feat(foundation): vitest and eslint setup`

---

### T8: CI + docs

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `README.md`
- Create: `AGENTS.md`
- Create: `.gitignore`
- Create: `.env.example`

**Req:** FND-07, FND-08

- [ ] GitHub Actions: install → lint → test
- [ ] README com setup, dev, e link para specs
- [ ] AGENTS.md com regras de spec-driven dev
- [ ] Commit: `feat(foundation): ci pipeline and project docs`

---

## Dependencies

```
T1 → T2, T3, T4
T2 → T5
T4 → T5
T3, T4 → T6
T2, T3, T4, T5 → T7
T7 → T8
```

## Verification (post-T8)

- [ ] `npm install && npm run dev` — canvas visível
- [ ] `npx nx run-many -t lint test` — all green
- [ ] CI passa no GitHub
- [ ] Verifier sub-agent roda contra spec FND-*
