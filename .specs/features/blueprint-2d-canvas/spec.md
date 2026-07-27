# Blueprint 2D Canvas — Specification

**Parent:** `.specs/features/product/spec.md` (PROD-03, PROD-04)  
**Context:** `.specs/features/blueprint-2d-canvas/context.md`  
**Branch:** `feature/blueprint-2d-canvas`  
**Depends on:** `main` (fases 0–4 + canvas-graph-dnd)  
**AD:** AD-018 (DOM+SVG blueprint), AD-019 (graph schema), AD-020 (sim educativa); supersede AD-002, AD-008, AD-009

---

## Problem Statement

O canvas de sessão é isométrico 3D (Three.js), enquanto o produto de referência ([System Design Playground](https://system-design-playground.replit.app/)) e a visão do usuário são um **blueprint 2D**: cards com replicas, popovers de config tipada, implementation notes, e controles de simulação (traffic / speed / reads vs writes) com feedback educativo de pressão. Sem essa paridade, o diferencial pedagógico (configurar hit rate/shards e ver gargalos) não existe.

## Goals

- [ ] Sessão de design usa canvas 2D blueprint (DOM nodes + SVG edges), sem Three.js no path de jogo
- [ ] Todo nó tem replicas `−` / `N reps` / `+`; Cache/CDN/SQL têm configs tipadas; todos têm implementation notes
- [ ] Header com Start + Speed + Traffic + Reads vs Writes; simulação educativa mostra pressão `ok|warn|hot`
- [ ] `ArchitectureGraph` serializa replicas, config, notes, simulation; juiz recebe esses campos
- [ ] Testes via Vitest + `__GAME_STATE__` — sem WebGL

## Out of Scope

| Item | Reason |
| ---- | ------ |
| Chaos tab / Mermaid view | Playground extras; backlog |
| Configs tipadas para tipos além de cache/CDN/SQL | MVP 2A; resto = reps + notes |
| Simulação server-side / LLM | AD-020 client determinístico |
| Remover `component-lab` / GLBs do repo | Orphans ok; limpeza opcional no fim |
| Mudança de rubrica de problemas | Só enriquecer prompt com novos campos |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Simulação educativa (1B) | Motor shared + animação client | Discuss | y |
| Configs tipadas (2A) | Só `cache_redis`, `cdn`, `sql_db` | Discuss + prints | y |
| Replicas em todos os nós | min 1, default 1, UI +/− | Prints | y |
| Speed | Só multiplica animação visual; não muda pressão | AD-020 | y |
| `note` → `implementationNotes` | Migrar; aceitar `note` legado na leitura | Compat | y |
| Position | `{ x, y }` (z omitido ou 0) | 2D | y |
| Edge labels | Visíveis no canvas; editáveis no popover/edge select | Prints | y |

**Open questions:** none.

---

## User Stories

### P1: Canvas blueprint 2D ⭐ MVP

**User Story:** Como jogador, quero montar a arquitetura num canvas 2D estilo blueprint com cards e conexões SVG, para desenhar como no System Design Playground.

**Acceptance Criteria:**

1. WHEN a fase canvas abre THEN o sistema SHALL renderizar um grid blueprint 2D (DOM+SVG), sem WebGL no path de jogo
2. WHEN o jogador arrasta um tipo da paleta para o canvas THEN o sistema SHALL criar um node card na posição do drop e sincronizar `ArchitectureGraph`
3. WHEN o jogador arrasta o corpo de um card THEN o sistema SHALL mover o nó e atualizar `position.{x,y}`
4. WHEN o jogador liga out→in handles THEN o sistema SHALL criar aresta SVG com label opcional e sincronizar o grafo
5. WHEN pan/zoom são usados THEN o sistema SHALL transformar o world container sem quebrar hit-testing dos cards

**Independent Test:** Place 2 nodes via palette → connect → `__GAME_STATE__.graph` tem 2 nodes + 1 edge; sem import Three.js no bootstrap de sessão.

**Req IDs:** BP-01

---

### P1: Replicas em todos os nós ⭐ MVP

**User Story:** Como jogador, quero ajustar replicas (+/−) em cada card, para expressar escala (ex. App Server ×15).

**Acceptance Criteria:**

1. WHEN um nó é criado THEN o sistema SHALL definir `replicas` = 1
2. WHEN o jogador clica `+` no footer do card THEN o sistema SHALL incrementar `replicas` (≥1) e atualizar o grafo
3. WHEN o jogador clica `−` THEN o sistema SHALL decrementar sem ir abaixo de 1
4. WHEN `replicas` > 1 em compute (ex. app_server) THEN o card MAY mostrar badge `xN` no label

**Independent Test:** Place node → click + três vezes → `replicas === 4`; − até 1 permanece 1.

**Req IDs:** BP-02

---

### P1: Config popover tipado + implementation notes ⭐ MVP

**User Story:** Como jogador, quero configurar Cache/CDN/SQL e escrever implementation notes em qualquer nó, para o juiz ler decisões de design.

**Acceptance Criteria:**

1. WHEN o jogador seleciona um nó THEN o sistema SHALL abrir popover ancorado com descrição do tipo + Implementation Notes + close
2. WHEN o tipo é `cache_redis` ou `cdn` THEN o popover SHALL exibir slider Hit Rate (0–100, default 90 cache / 99 CDN)
3. WHEN o tipo é `sql_db` THEN o popover SHALL exibir Shard Count, Partitioning Strategy, Partition Key (opcional), Key Skew %
4. WHEN o jogador edita notes/config THEN o sistema SHALL persistir em `implementationNotes` / `config` no grafo
5. WHEN o popover está aberto THEN o sistema SHALL mostrar o aviso de que o juiz lê as notes

**Independent Test:** Select cache → set hitRate 95 → notes "cache-aside" → graph.node.config.hitRate === 95 && implementationNotes set.

**Req IDs:** BP-03

---

### P1: Controles de simulação no header ⭐ MVP

**User Story:** Como jogador, quero Start, Speed, Traffic e Reads vs Writes no header, para controlar a simulação educativa.

**Acceptance Criteria:**

1. WHEN a fase canvas está ativa THEN o header SHALL mostrar capsule com Start, Speed, Traffic, Reads vs Writes
2. WHEN o jogador ajusta sliders THEN o sistema SHALL atualizar `graph.simulation` (`speed`, `traffic`, `readRatio`)
3. WHEN o jogador clica Start THEN `simulation.running` SHALL ser true e pacotes/animação SHALL iniciar
4. WHEN o jogador clica Stop (mesmo botão toggle) THEN `running` SHALL ser false e animação SHALL parar
5. WHEN `readRatio` ≥ 70 THEN a UI SHALL indicar modo read-heavy (texto auxiliar)

**Independent Test:** Set traffic=5, readRatio=90, Start → `__GAME_STATE__.graph.simulation.running === true`.

**Req IDs:** BP-04

---

### P1: Motor de pressão educativa ⭐ MVP

**User Story:** Como jogador, quero ver pressão `ok|warn|hot` nos nós quando a simulação roda, para aprender onde a arquitetura falha sob carga.

**Acceptance Criteria:**

1. WHEN `simulation.running` é true THEN o sistema SHALL calcular pressão por nó a partir de traffic, readRatio, replicas e configs (AD-020)
2. WHEN load/capacity ≥ 1.0 THEN o nó SHALL exibir pressão `hot`; ≥ 0.7 `warn`; senão `ok`
3. WHEN cache hitRate alto THEN load efetiva no DB a jusante SHALL diminuir
4. WHEN sql shardCount sobe THEN capacidade do SQL SHALL aumentar; keySkew alto SHALL reduzir capacidade efetiva
5. WHEN Speed muda THEN apenas a taxa de animação visual SHALL mudar (pressão inalterada para mesmos inputs)

**Independent Test:** Fixture URL Shortener: 1 app rep, cache hitRate 10, traffic alto → sql_db pressure `hot`; hitRate 95 → sql pressure melhora.

**Req IDs:** BP-05

---

### P1: PROBLEM drawer + chrome ⭐ MVP

**User Story:** Como jogador, quero abrir o painel PROBLEM na sessão de canvas e ver o título da sessão no header.

**Acceptance Criteria:**

1. WHEN a fase canvas está ativa THEN um controle PROBLEM SHALL permitir abrir/fechar drawer com briefing do problema atual
2. WHEN o drawer está aberto THEN SHALL mostrar título, descrição e constraints/requisitos-chave do problema
3. WHEN a sessão está no canvas THEN o header SHALL mostrar o título do problema (ex. Design Session: …)

**Independent Test:** Open PROBLEM → drawer visible com título do URL Shortener; close → hidden.

**Req IDs:** BP-06

---

### P1: Juiz consome schema enriquecido ⭐ MVP

**User Story:** Como jogador, quero que o juiz veja replicas, configs, notes e simulation ao pontuar.

**Acceptance Criteria:**

1. WHEN `formatGraph` monta o prompt THEN SHALL incluir por nó: type, label, replicas, config (se houver), implementationNotes
2. WHEN simulation existe THEN o prompt SHALL incluir speed, traffic, readRatio
3. WHEN grafo legado sem novos campos é submetido THEN o sistema SHALL aplicar defaults (replicas=1, simulation defaults) sem crash

**Independent Test:** Unit em prompts — graph com notes/hitRate aparece no string do prompt.

**Req IDs:** BP-07

---

## Edge Cases

- Replica − em 1 → permanece 1
- Hit rate / skew / shards fora do range → clamp no set
- Grafo vazio no submit → FAIL local (AD-016) inalterado
- Edge self-loop / duplicate → rejeitado (comportamento canvas-graph-dnd)
- Nós sem config tipada → só notes + reps

## Requirement Traceability

| ID | Story | Priority | Status |
| -- | ------ | -------- | ------ |
| BP-01 | Canvas blueprint 2D | P1 | Pending |
| BP-02 | Replicas | P1 | Pending |
| BP-03 | Config popover | P1 | Pending |
| BP-04 | Sim controls | P1 | Pending |
| BP-05 | Pressure engine | P1 | Pending |
| BP-06 | PROBLEM drawer | P1 | Pending |
| BP-07 | Judge prompt | P1 | Pending |
