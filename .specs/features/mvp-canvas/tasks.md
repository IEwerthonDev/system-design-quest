# MVP Canvas — Tasks

**Spec:** `.specs/features/mvp-canvas/spec.md`  
**Design:** `.specs/features/product/design.md` (inline — sem design doc separado)  
**Branch:** `feature/mvp-canvas`  
**Depends on:** `foundation` merged em `main`

---

## Execution Protocol (MANDATORY)

Implementar com skill `tlc-spec-driven`: 1 commit atômico por task, gate antes de marcar done, Verifier após T22.

---

## Test Coverage Matrix

> Generated from project guidelines — confirm before Execute. Guidelines found: `AGENTS.md`, `foundation/tasks.md` (AD-010).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Shared (problems, catalog) | unit | 1:1 to spec ACs | `libs/shared/src/**/*.test.ts` | `npx nx test shared` |
| Client session / guided / UI logic | unit | Spec ACs via `__GAME_STATE__` | `client/src/**/*.test.ts` | `npx nx test client` |
| Client scene (graph serialize) | unit (mocked THREE) | Serialize/deserialize + validation | `client/src/scene/**/*.test.ts` | `npx nx test client` |
| Canvas renderer / shaders | none | Manual + `__GAME_STATE__` indirect | — | build gate |

## Gate Check Commands

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | After T1–T8 (1a) | `npx nx test shared client` |
| Quick | After T9–T14 (1b) | `npx nx test shared client` |
| Full | After T15–T22 (1c) + phase done | `npx nx run-many -t lint test` |

---

## Sub-phase 1a — Canvas Jogável

**Marco testável:** abrir app → arrastar componentes → conectar com animação → Submeter → validação local (grafo não-vazio).

```
T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8
```

### T1: Core component catalog (Tier 1 — 15 tipos)

**Files:**
- Create: `libs/shared/src/catalog/component-catalog.ts`
- Create: `libs/shared/src/catalog/mvp-tier-1.ts`
- Test: `libs/shared/src/catalog/component-catalog.test.ts`

**Req:** PROD-03 (parcial), AD-017 Tier 1

**15 tipos:** `client_web`, `client_mobile`, `dns`, `cdn`, `load_balancer`, `api_gateway`, `app_server`, `cache_redis`, `sql_db`, `rate_limiter`, `object_storage`, `message_queue`, `worker`, `monitoring`, `auth_service`

- [x] `ComponentType` union + metadata (categoria, label, descrição, quando usar)
- [x] `getComponentsForTier(1)` retorna 15 tipos
- [x] Testes: shape, categorias, IDs únicos
- [x] Commit: `feat(shared): tier-1 component catalog (15 types)`

---

### T2: Session store + phase machine

**Files:**
- Create: `client/src/session/session-store.ts`
- Create: `client/src/session/phase-machine.ts`
- Test: `client/src/session/session-store.test.ts`

**Req:** PROD-03 (parcial)

- [x] `createSession(problemId, mode)` com fases: `briefing | requirements | canvas | result`
- [x] `advancePhase`, `setGraph`, `getGraph`
- [x] Expõe via `window.__GAME_STATE__`
- [x] Commit: `feat(client): session store and phase machine`

---

### T3: Palette UI + drag-to-canvas

**Files:**
- Create: `client/src/ui/palette.ts`
- Test: `client/src/ui/palette.test.ts`

**Req:** PROD-03

- [x] Paleta lateral agrupada por categoria (Client, Edge, Traffic, Compute, Data, Messaging, Observability)
- [x] Drag da paleta dispara evento `palette:drop` com `ComponentType`
- [x] Commit: `feat(client): component palette with categories`

---

### T4: 3D component instances (primitives) + XZ drag

**Files:**
- Create: `client/src/scene/component-instance.ts`
- Create: `client/src/scene/component-manager.ts`
- Test: `client/src/scene/component-manager.test.ts`

**Req:** PROD-03

- [x] Primitivo Three.js colorido por categoria + label flutuante
- [x] `addComponent(type, position)` + drag no plano XZ (raycast)
- [x] Commit: `feat(client): 3d component instances with xz drag`

---

### T5: Selection, label edit, note, delete

**Files:**
- Create: `client/src/scene/selection.ts`
- Create: `client/src/ui/properties-panel.ts`
- Test: `client/src/scene/selection.test.ts`

**Req:** PROD-03

- [x] Click seleciona; painel permite renomear label e nota (≤200 chars)
- [x] Delete remove componente + conexões
- [x] Commit: `feat(client): component selection and properties`

---

### T6: Edge creation (forward / bidirectional)

**Files:**
- Create: `client/src/scene/edge-manager.ts`
- Test: `client/src/scene/edge-manager.test.ts`

**Req:** PROD-04 (parcial)

- [x] Conectar dois componentes → `ConnectionEdge` com direção configurável
- [x] Commit: `feat(client): directed edge connections`

---

### T7: Flow edge shader animation

**Files:**
- Create: `client/src/scene/edges/flow-edge.ts`
- Create: `client/src/scene/edges/flow-edge.frag` (ou inline shader)

**Req:** PROD-04

- [x] `TubeGeometry` + shader com `uTime`; banda luminosa na direção da seta
- [x] Bidirecional: duas bandas opostas
- [x] Commit: `feat(client): animated flow edge shader`

---

### T8: Graph serialization + local submit validation

**Files:**
- Create: `client/src/scene/graph-serializer.ts`
- Modify: `client/src/ui/submit-panel.ts`
- Test: `client/src/scene/graph-serializer.test.ts`

**Req:** PROD-03, AD-016 (validação local)

- [x] `serializeGraph()` → `ArchitectureGraph` JSON
- [x] Submit com grafo vazio → FAIL local ("Adicione pelo menos um componente")
- [x] Submit válido → avança fase `result` com placeholder (sem IA)
- [x] Commit: `feat(client): graph serialization and local submit validation`

**Checkpoint 1a:** `npm run dev` → montar Client→LB→App→DB → ver animação → submit.

---

## Sub-phase 1b — Fluxo de Fases

**Marco testável:** URL Shortener briefing → requisitos com sugestões → canvas → submit.

```
T9 → T10 → T11 → T12 → T13 → T14
```

### T9: URL Shortener problem definition

**Files:**
- Create: `libs/shared/src/problems/url-shortener.ts`
- Create: `libs/shared/src/problems/index.ts`
- Test: `libs/shared/src/problems/url-shortener.test.ts`

**Req:** PROD-01

- [x] `Problem` com briefing, métricas, constraints, dificuldade `easy`, sugestões FR/NFR
- [x] Commit: `feat(shared): url shortener problem definition`

---

### T10: Briefing panel UI

**Files:**
- Create: `client/src/ui/briefing-panel.ts`
- Test: `client/src/ui/briefing-panel.test.ts`

**Req:** PROD-01

- [x] Exibe título, narrativa, métricas, tags, badge Easy
- [x] Botão "Começar" avança para requisitos
- [x] Commit: `feat(client): briefing panel`

---

### T11: Requirements panel (FR / NFR)

**Files:**
- Create: `client/src/ui/requirements-panel.ts`
- Test: `client/src/ui/requirements-panel.test.ts`

**Req:** PROD-02

- [x] Listas separadas FR/NFR: add, edit, remove
- [x] Texto mínimo 10 chars; aviso se vazio ao avançar (não bloqueia)
- [x] Commit: `feat(client): requirements panel`

---

### T12: Phase navigation wiring

**Files:**
- Modify: `client/src/main.ts`, `client/src/session/phase-machine.ts`
- Test: `client/src/session/phase-navigation.test.ts`

**Req:** PROD-01, PROD-02

- [x] Fluxo: briefing → requirements → canvas → result
- [x] Voltar preserva estado
- [x] Commit: `feat(client): phase navigation wiring`

---

### T13: Requirement suggestion cards

**Files:**
- Create: `client/src/ui/requirement-suggestions.ts`
- Test: `client/src/ui/requirement-suggestions.test.ts`

**Req:** PROD-15

- [x] ≥3 FR + ≥2 NFR clicáveis por problema; editáveis após adicionar
- [x] Commit: `feat(client): requirement suggestion cards`

---

### T14: Requirements persistence in session

**Files:**
- Modify: `client/src/session/session-store.ts`
- Test: `client/src/session/requirements-persistence.test.ts`

**Req:** PROD-02

- [x] Requisitos persistem ao navegar entre fases; expostos em `__GAME_STATE__`
- [x] Commit: `feat(client): requirements session persistence`

**Checkpoint 1b:** fluxo completo URL Shortener até submit local.

---

## Sub-phase 1c — Newbie-Friendly

**Marco testável:** primeira visita → onboarding → tutorial guiado → tooltips → glossário → 25 tipos na paleta.

```
T15 → T16 → T17 → T18 → T19 → T20 → T21 → T22
```

### T15: First-visit onboarding (3 telas)

**Files:**
- Create: `client/src/ui/onboarding.ts`
- Create: `client/src/storage/preferences.ts`
- Test: `client/src/ui/onboarding.test.ts`

**Req:** PROD-11

- [x] 3 telas: o que é SD, fluxo do jogo, iniciante vs experiente
- [x] "Pular" persiste preferência; não exibe novamente
- [x] "Sou iniciante" → inicia modo guiado URL Shortener
- [x] Commit: `feat(client): first-visit onboarding`

---

### T16: Guided mode engine + step highlights

**Files:**
- Create: `client/src/guided/guided-mode.ts`
- Create: `client/src/guided/guided-overlay.ts`
- Test: `client/src/guided/guided-mode.test.ts`

**Req:** PROD-12

- [x] Highlights sequenciais: briefing → requisitos → componentes → conexão → submit
- [x] Ordem sugerida: Client → LB → App → Cache → DB
- [x] Hints não bloqueiam; ignorar hint permitido
- [x] Conclusão desbloqueia biblioteca (placeholder até Fase 3)
- [x] Commit: `feat(client): guided mode tutorial`

---

### T17: Component palette tooltips

**Files:**
- Modify: `client/src/ui/palette.ts`
- Create: `client/src/ui/glossary.ts` (tooltip helpers)
- Test: `client/src/ui/glossary.test.ts`

**Req:** PROD-13

- [x] Hover em componente: nome, descrição ≤2 frases, "quando usar"
- [x] Commit: `feat(client): component palette tooltips`

---

### T18: Briefing metric explanations (?)

**Files:**
- Modify: `client/src/ui/briefing-panel.ts`
- Test: `client/src/ui/briefing-panel.test.ts`

**Req:** PROD-14

- [x] Ícone `?` em cada métrica → explicação em linguagem simples
- [x] Commit: `feat(client): briefing metric explanations`

---

### T19: Glossary panel (atalho G)

**Files:**
- Modify: `client/src/ui/glossary.ts`
- Test: `client/src/ui/glossary.test.ts`

**Req:** PROD-13

- [x] Atalho `G` abre painel com termos do problema atual
- [x] Commit: `feat(client): glossary panel`

---

### T20: Expand catalog to Tier 2 (25 tipos)

**Files:**
- Create: `libs/shared/src/catalog/mvp-tier-2.ts`
- Modify: `libs/shared/src/catalog/component-catalog.ts`
- Test: `libs/shared/src/catalog/component-catalog.test.ts`

**Req:** PROD-03, AD-017 Tier 2

**+10 tipos:** `microservice`, `nosql_db`, `kafka`, `pub_sub`, `search_engine`, `waf`, `reverse_proxy`, `logging`, `notification`, `serverless`

- [x] `getComponentsForTier(2)` retorna 25 tipos
- [x] Commit: `feat(shared): expand component catalog to 25 types`

---

### T21: component-lab.html

**Files:**
- Create: `client/component-lab.html`
- Modify: `client/vite.config.ts`

**Req:** AD-009

- [x] Página isolada para preview de primitivos por tipo
- [x] Commit: `feat(client): component lab page`

---

### T22: Contextual hints panel (stretch — PROD-16)

**Files:**
- Create: `client/src/ui/hints-panel.ts`
- Test: `client/src/ui/hints-panel.test.ts`

**Req:** PROD-16 (P2 — não bloqueia merge se omitido)

- [x] 2–3 dicas baseadas no problema + estado do grafo
- [x] Marcar dica resolvida ao adicionar componente relevante
- [x] Commit: `feat(client): contextual hints panel`

**Checkpoint 1c:** onboarding → tutorial guiado completo em <15 min (teste manual).

---

## Dependencies

```
foundation merged
  └── 1a: T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8
        └── 1b: T9 → T10 → T11 → T12 → T13 → T14
              └── 1c: T15 → T16 → T17 → T18 → T19 → T20 → T21 → T22
```

## Phase Execution Map

```
Foundation (Fase 0)
       │
       ▼
┌──────────────────────────────────────────────────┐
│ 1a (T1–T8)   Canvas jogável + submit local       │
├──────────────────────────────────────────────────┤
│ 1b (T9–T14)  Briefing + requisitos + fases       │
├──────────────────────────────────────────────────┤
│ 1c (T15–T22) Onboarding + guiado + 25 tipos      │
└──────────────────────────────────────────────────┘
       │
       ▼
   ai-judge (Fase 2) — loop pedagógico completo
```

## Verification (post-T22)

- [x] `npx nx run-many -t lint test` — all green (155 tests, 0 errors)
- [ ] Checkpoint 1a, 1b, 1c passam manualmente (WebGL UAT — ver `validation.md`)
- [x] Verifier standalone pass contra PROD-01–04, 11–16
- [x] `validation.md` com PASS (2 gaps Phase 3 documentados)

## Estimativa de sessões

| Sub-phase | Tasks | Sessões (~7 tasks/sessão) |
| --------- | ----- | ------------------------- |
| 1a | 8 | 1–2 |
| 1b | 6 | 1 |
| 1c | 8 | 1–2 |
| **Total** | **22** | **3–4 sessões** após foundation |
