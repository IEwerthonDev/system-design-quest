# Connection Intent — Specification

**Parent:** `.specs/features/blueprint-2d-canvas/spec.md` (BP-01 edge labels), `.specs/features/playground-parity/spec.md`  
**Branch:** `feature/playground-parity`  
**Depends on:** playground-parity Verify PASS + Voltar hotfix (`11d8dc8`)  
**Complexity:** Medium  
**Context:** `.specs/features/connection-intent/context.md`  
**Reference UX:** System Design Playground — pill label on edge + **CONNECTION INTENT** popover (screenshot 2026-07-27)

---

## Problem Statement

Arestas do canvas blueprint guardam `label?: string` e sempre nascem como `REQ`, mas o jogador **não consegue** escolher o significado da conexão nem ver um label legível estilo Playground. O estado `selectedEdgeId` existe no `__GAME_STATE__`, porém **não há** click-to-select na aresta nem menu de intent. Sem isso, o diagrama não comunica REQ vs CACHE vs DB (origin fallback) e a paridade visual com o Playground fica incompleta — inclusive em mobile.

## Goals

- [ ] Label da aresta renderiza como **pill** legível no meio do path SVG
- [ ] Selecionar uma aresta abre popover **CONNECTION INTENT** (REQ / DB default / DB origin fallback / CACHE)
- [ ] Default heurístico por destino ao criar aresta; correção via menu
- [ ] Menu + seleção de aresta usáveis em viewport ≤375px (touch)
- [ ] Testável via Vitest + `__GAME_STATE__` (sem WebGL)
- [ ] Preview deploy na Vercel Hobby (grátis) após Execute

## Out of Scope

| Item | Reason |
| ---- | ------ |
| Intent afetando motor de simulação (`edgeReadWeight`) | Continua heurística por `from`/`to` types (AD-020) |
| Free-text label arbitrário no popover | Catálogo curado; backlog |
| Campo `intent` separado no schema | Reusar `label` string |
| Pill durante linking (CI-04) | Discuss: só P1 pill estático |
| Mobile overhaul completo do canvas | Só intent + hit targets |
| Chaos / Mermaid / novos tipos de nó | Fora do pedido |
| Mudança de juiz / sessions API | Já em playground-parity |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Catálogo P1 | **REQ**, **DB** (DEFAULT), **DB** (ORIGIN FALLBACK), **CACHE** | Discuss | **y** |
| Serialização DEFAULT vs ORIGIN FALLBACK | Ambos → `label: "DB"`; diferença só no menu (role/descrição) | Discuss | **y** |
| Pill short codes | `REQ` \| `DB` \| `CACHE` | Discuss | **y** |
| Default ao criar | Heurística por destino: cache/cdn→`CACHE`; sql/nosql/object/search→`DB`; else→`REQ` | Discuss `2+A` | **y** |
| Correção de heurística | Jogador usa CONNECTION INTENT | Discuss | **y** |
| Preview linking | Fora do MVP | Discuss | **y** |
| Abrir menu | Click/tap stroke/pill → select + open; Escape / tap canvas fecha | Pedido | **y** |
| Estilo do label | Pill centrado no path | Screenshot | **y** |
| Mobile | Popover viewport-safe ≤375px; touch hit targets na aresta | Pedido 2026-07-27 | **y** |
| Simulação | Intent **não** altera pressão/latência | AD-020 | **y** |
| Delete aresta | Delete/Backspace com edge selecionada remove aresta | Gap UX | **y** |
| Idioma do menu | Inglês técnico (`CONNECTION INTENT`, roles) | AD-011 + screenshot | **y** |
| Deploy | Vercel Hobby preview via MCP após Execute | Pedido | **y** |

**Open questions:** none — Discuss closed in `context.md`.

---

## User Stories

### P1: Pill label na aresta ⭐ MVP

**User Story:** Como jogador, quero ver o label da conexão como um pill no meio da linha, para ler REQ/DB/CACHE de relance como no Playground.

**Why P1:** Pedido explícito (screenshot); base visual do intent.

**Acceptance Criteria:**

1. WHEN uma aresta tem `label` não-vazio THEN o layer SVG SHALL renderizar um pill (`[data-testid="edge-label"]`) com o texto do label curto no ponto médio do path
2. WHEN `label` está ausente ou vazio THEN o sistema SHALL **não** renderizar pill
3. WHEN a aresta está selecionada THEN o path e/ou pill SHALL indicar seleção (destaque visual distinto do idle)
4. WHEN o grafo atualiza o `label` THEN o pill SHALL refletir o novo texto sem remount manual do canvas

**Independent Test:** `connectForTest(..., 'DB')` → DOM contém pill com texto `DB`; mudar label via API de teste → pill atualiza.

**Req IDs:** CI-01

---

### P1: Selecionar aresta + menu CONNECTION INTENT ⭐ MVP

**User Story:** Como jogador, quero tocar/clicar numa conexão e escolher o intent, para documentar o papel da aresta no design.

**Why P1:** Pedido explícito; hoje não há UI de edição.

**Acceptance Criteria:**

1. WHEN o jogador clica/toca no path (ou pill) de uma aresta THEN o sistema SHALL setar `selectedEdgeId`, limpar seleção de nó / fechar config popover de nó, e abrir o popover **CONNECTION INTENT**
2. WHEN o popover está aberto THEN SHALL exibir título `CONNECTION INTENT` e a role atual (`DEFAULT` | `ORIGIN FALLBACK` | `REQUEST` | `CACHE` lookup) no header
3. WHEN o menu lista intents THEN SHALL incluir pelo menos: DB+DEFAULT, DB+ORIGIN FALLBACK, REQ+REQUEST, CACHE — cada um com short code + role + descrição curta
4. WHEN o jogador escolhe DB DEFAULT ou DB ORIGIN FALLBACK THEN o sistema SHALL setar `label: "DB"` (ambos); para REQ → `"REQ"`; para CACHE → `"CACHE"`; republicar `__GAME_STATE__`
5. WHEN o jogador pressiona Escape ou clica/toca no fundo do canvas THEN o popover SHALL fechar e a seleção de aresta MAY limpar
6. WHEN Delete/Backspace e há `selectedEdgeId` (foco não em input) THEN o sistema SHALL remover essa aresta do grafo e limpar seleção

**Independent Test:** Connect two nodes → activate edge → `[data-testid="connection-intent"]` visível → escolher opção → `getGraph().edges[0].label` atualiza.

**Req IDs:** CI-02

---

### P1: Default heurístico + CACHE no create ⭐ MVP

**User Story:** Como jogador, quero que novas conexões já nasçam com um label sensato (CACHE/DB/REQ), para menos cliques.

**Why P1:** Discuss confirmou heurística no MVP + CACHE no catálogo.

**Acceptance Criteria:**

1. WHEN uma aresta é criada e o destino é `cache_redis` ou `cdn` THEN o `label` inicial SHALL ser `CACHE`
2. WHEN o destino é `sql_db`, `nosql_db`, `object_storage` ou `search_engine` THEN o `label` inicial SHALL ser `DB`
3. WHEN o destino é qualquer outro tipo THEN o `label` inicial SHALL ser `REQ`
4. WHEN o catálogo do menu é renderizado THEN SHALL incluir opção **CACHE** com descrição de lookup/hit-path

**Independent Test:** Connect app→cache → label `CACHE`; app→sql → `DB`; client→lb → `REQ`.

**Req IDs:** CI-03

---

### P1: Mobile / touch viewport-safe ⭐ MVP

**User Story:** Como jogador no celular, quero abrir e usar o CONNECTION INTENT sem UI cortada, para configurar arestas em qualquer dispositivo.

**Why P1:** Pedido explícito (2026-07-27).

**Acceptance Criteria:**

1. WHEN a viewport tem largura ≤375px e o popover está aberto THEN todas as opções do catálogo SHALL ser alcançáveis (scroll interno se necessário); nenhum clip destrutivo fora da safe area
2. WHEN o jogador usa touch (pointer) no stroke/pill THEN o sistema SHALL selecionar a aresta e abrir o menu (mesmo comportamento do click)
3. WHEN o popover abriria fora da viewport THEN o sistema SHALL reposicionar (ex. bottom sheet / clamp) para permanecer utilizável

**Independent Test:** JSDOM/viewport mock 375×667 → open intent → container bounds within viewport; pointer event on edge path abre menu.

**Req IDs:** CI-05

---

### P2 (deferred): Preview do label durante linking

**User Story:** Como jogador, quero ver o pill do label enquanto arrasto a conexão.

**Why deferred:** Discuss — só pill estático no MVP.

**Acceptance Criteria:** (backlog — CI-04)

1. WHEN linking ativo THEN preview path + pill `[data-testid="edge-label-preview"]` com label pendente
2. WHEN linking cancela/completa THEN preview pill some

**Req IDs:** CI-04

---

## Edge Cases

- WHEN clique/tap na aresta sob um card THEN hit-test da stroke/pill SHALL ter prioridade razoável
- WHEN duas arestas cruzam THEN o hit-test do topo vence
- WHEN label legado custom (ex. `HTTPS`) THEN pill mostra o texto; menu sem opção ativa + header `CUSTOM`
- WHEN self-loop / duplicate connect é rejeitado THEN nenhum intent UI muda

---

## Implicit-requirement dimensions (Medium sweep)

| Dimension | Resolution |
| --------- | ---------- |
| Input validation & bounds | Catálogo fechado; short codes `REQ`\|`DB`\|`CACHE` |
| Failure / partial-failure | N/A — UI local |
| Idempotency / retry | N/A |
| Auth / rate limits | N/A (deploy Hobby = conta Vercel do usuário) |
| Concurrency / ordering | Single-threaded DOM |
| Data lifecycle | Label no `ArchitectureGraph`; persiste com sessions |
| Observability | `__GAME_STATE__.selectedEdgeId` + `edges[].label` |
| External-dependency failure | N/A no runtime do intent; deploy falha → reportar URL/erro MCP |
| State-transition integrity | idle ↔ edgeSelected; abrir nó fecha intent e vice-versa |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| CI-01 | P1: Pill label | Tasks | Mapped T2 |
| CI-02 | P1: CONNECTION INTENT menu | Tasks | Mapped T1,T3–T5 |
| CI-03 | P1: Heuristic default + CACHE | Tasks | Mapped T1,T4 |
| CI-05 | P1: Mobile / touch | Tasks | Mapped T3,T4 |
| CI-04 | P2 deferred: linking preview | — | Deferred |

**Coverage:** 4 P1 → T1–T5; Deploy → T6–T7; CI-04 deferred

---

## Success Criteria

- [ ] Screenshot-parity: pill + menu CONNECTION INTENT (DB/REQ/CACHE + origin fallback row)
- [ ] Heurística de create + correção via menu
- [ ] Usável em ≤375px width
- [ ] Gate `npx nx run-many -t lint test` PASS após Execute
- [ ] Preview URL Vercel Hobby disponível após deploy MCP
- [ ] Sem regressão em packet animation / Bezier (PP-04)

---

## Current codebase map (Specify research)

| Área | Estado hoje |
| ---- | ----------- |
| Schema | `ConnectionEdge.label?: string` — sem enum de intent |
| Create edge | Sempre `label: 'REQ'` (`blueprint-canvas.ts`) |
| Render | SVG `<text>` plano em `svg-edges.ts` — **não** pill |
| Linking preview | Path tracejado `edge-preview` — **sem** label |
| Seleção | `selectedEdgeId` no state; **sem** click handler na aresta |
| Popover | Só `config-popover` de nó; **sem** connection-intent |
| Sim | Ignora `label`; usa `edgeReadWeight(fromType, toType)` |
| Deploy | Sem `.vercel/` link; CLI não autenticada localmente |
| Blueprint assumption | “labels editáveis no popover” — **nunca implementado** |
