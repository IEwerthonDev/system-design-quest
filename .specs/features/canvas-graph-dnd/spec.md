# Canvas Graph DnD — Specification

**Parent:** `.specs/features/product/spec.md` (PROD-03, PROD-04)  
**Context:** `.specs/features/canvas-graph-dnd/context.md`  
**Branch:** `feature/canvas-graph-dnd`  
**Depends on:** `mvp-canvas` + `polish` merged (`main`)  
**AD:** AD-008 (fluxo animado), AD-004 (`ArchitectureGraph`), AD-010 (test hooks)

---

## Problem Statement

O canvas já tem paleta, instâncias 3D, `EdgeManager` e shader de fluxo, mas a criação de ligações não entrega a UX de grafo que o jogador espera (Obsidian/Whimsical): handles, preview curvo com luz no sentido do gesto, e edição completa de arestas. Sem isso, montar arquitetura continua opaco para iniciantes (AD-013).

## Goals

- [ ] Jogador liga componentes arrastando handle de saída → entrada, com preview curvo e luz direcional
- [ ] Jogador seleciona, apaga, inverte e religa arestas sem recriar o grafo do zero
- [ ] Bidirecional via painel com dual-pulse no tubo
- [ ] Estado serializado em `ArchitectureGraph`; testes via Vitest + `__GAME_STATE__` (sem WebGL)

## Out of Scope

| Item | Reason |
| ---- | ------ |
| Novos tipos de componente / Tier 3–4 | Catálogo separado |
| Mudanças no juiz LLM / rubrica | `ai-judge` |
| Export PNG / fallback 2D | Backlog polish |
| Esc / Shift+drag como gestos de ligação | Deferred no context |
| Partículas além do brilho no tubo | Deferred; AD-008 tubo é o visual |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Drop no corpo do nó (não só no handle in) completa a ligação no handle in mais próximo | Aceitar drop no nó → snap ao handle in | Facilita alvo; highlight cobre nó+in | y (discuss) |
| Par ordenado duplicado A→B rejeitado | Sem segunda aresta A→B; cursor proibido | `EdgeManager.hasOrderedPair` | y |
| Ciclos permitidos | Permitir A→B→A / ciclos | Product edge case existente | y |
| Self-loop | Rejeitar (mesmo nó) | Inválido + cursor proibido | y |
| Esc não cancela gesto | Só soltar vazio / clique fora | Discuss área 1 | y |
| Testes de luz/preview | Assert estado de interação + flags de animação em `__GAME_STATE__` / objetos de teste; sem pixel assert | AD-010 | y |

**Open questions:** none — all resolved or logged above.

---

## User Stories

### P1: Ligar com handles (Obsidian) ⭐ MVP

**User Story:** Como jogador, quero arrastar do handle de saída de um componente até o handle de entrada de outro para criar uma ligação direcionada, para montar o fluxo de dados como num grafo visual.

**Why P1:** É o núcleo da feature; sem isso não há paridade Obsidian.

**Acceptance Criteria:**

1. WHEN o ponteiro faz hover em um componente THEN o sistema SHALL exibir handles de **entrada** e **saída** distintos nesse componente
2. WHEN o jogador inicia drag no handle de **saída** THEN o sistema SHALL entrar em modo de ligação (não mover o componente)
3. WHEN o jogador solta sobre um handle de **entrada** (ou corpo) de outro componente válido THEN o sistema SHALL criar aresta `from=A, to=B, direction=forward` e sincronizar `ArchitectureGraph`
4. WHEN o jogador solta no vazio OU clica fora durante o gesto THEN o sistema SHALL cancelar sem criar aresta
5. WHEN o alvo é o mesmo nó OU o par ordenado A→B já existe THEN o sistema SHALL mostrar cursor proibido e SHALL NOT criar aresta

**Independent Test:** Dois nós no canvas → hover → drag out→in → grafo tem 1 edge A→B; soltar vazio → 0 edges novas.

---

### P1: Preview curvo + luz no gesto ⭐ MVP

**User Story:** Como jogador, quero ver uma curva com luz fluindo no sentido do arraste enquanto ligo, para entender a direção antes de soltar.

**Why P1:** Requisito explícito do produto (luz no sentido da ligação).

**Acceptance Criteria:**

1. WHEN o modo de ligação está ativo THEN o sistema SHALL desenhar preview em **curva suave** da origem ao ponteiro
2. WHEN o preview está ativo THEN o sistema SHALL animar brilho/pulso no preview no sentido origem→ponteiro
3. WHEN um alvo válido está sob o cursor THEN o sistema SHALL destacar o nó **e** o handle de entrada
4. WHEN o modo de ligação está ativo THEN o sistema SHALL exibir handles do nó sob o cursor mesmo sem hover prévio
5. WHEN a aresta é criada THEN o sistema SHALL substituir o preview por aresta permanente com fluxo animado A→B (AD-008)

**Independent Test:** Durante drag de ligação, estado expõe `linking=true` + preview ativo; após drop, preview some e edge permanente anima forward.

---

### P1: Editar arestas ⭐ MVP

**User Story:** Como jogador, quero selecionar, apagar, inverter e religar pontas de arestas, para corrigir o diagrama sem recomeçar.

**Why P1:** Edição é parte do fluxo Obsidian/Whimsical pedido.

**Acceptance Criteria:**

1. WHEN o jogador clica na linha de uma aresta THEN o sistema SHALL selecionar essa aresta (e exibir controles no painel de propriedades)
2. WHEN uma aresta está selecionada e o jogador pressiona Delete ou Backspace THEN o sistema SHALL remover a aresta do grafo
3. WHEN uma aresta está selecionada e o jogador aciona “apagar” no painel THEN o sistema SHALL remover a aresta
4. WHEN o jogador aciona “inverter” no painel THEN o sistema SHALL trocar `from`/`to` e a animação de luz SHALL inverter imediatamente
5. WHEN o jogador arrasta a ponta de uma aresta selecionada (ou focada) até outro nó válido THEN o sistema SHALL atualizar o endpoint correspondente sem exigir apagar+recriar

**Independent Test:** Criar A→B → clicar linha → Delete remove; inverter vira B→A com fluxo invertido; arrastar ponta de B para C vira A→C.

---

### P2: Bidirecional dual-pulse

**User Story:** Como jogador, quero marcar uma aresta como bidirecional no painel e ver dois pulsos opostos, para modelar fluxos nos dois sentidos.

**Why P2:** Já existe no modelo (`direction: bidirectional`); completa o painel sem bloquear o MVP de ligação.

**Acceptance Criteria:**

1. WHEN uma aresta está selecionada THEN o painel SHALL oferecer ação para tornar/voltar bidirecional
2. WHEN `direction=bidirectional` THEN o sistema SHALL animar **dois** pulsos em sentidos opostos na mesma curva
3. WHEN o jogador volta para forward THEN o sistema SHALL animar um único pulso no sentido `from`→`to`

**Independent Test:** Toggle bidirecional no painel → estado da edge + flag de animação dual; toggle off → single forward.

---

## Edge Cases

- WHEN drop durante ligação sobre o próprio nó THEN sistema SHALL rejeitar (cursor proibido)
- WHEN A→B já existe e o jogador tenta de novo THEN sistema SHALL rejeitar
- WHEN B→A existe e o jogador cria A→B THEN sistema SHALL permitir (dois sentidos como arestas distintas) — a menos que o usuário use bidirecional numa só aresta
- WHEN componente é deletado THEN sistema SHALL remover arestas incidentes (comportamento existente)
- WHEN religar ponta para alvo inválido THEN sistema SHALL reverter ao endpoint anterior (sem aresta órfã)
- WHEN camera orbit/pan e modo ligação THEN drag de handle SHALL NOT orbitar a câmera até o gesto terminar

---

## Implicit-requirement dimensions (Medium+)

| Dimension | Resolution |
| --------- | ---------- |
| Input validation & bounds | Self-loop e duplicata A→B rejeitados; drop inválido sem mutação |
| State-transition integrity | Idle ↔ linking ↔ selected-edge; cancel limpa preview; connect limpa pending |
| Concurrency / ordering | Um gesto de ligação por vez; move de corpo desabilitado durante linking |
| Failure / partial-failure | Cancel e drop inválido = no-op no grafo |
| Data lifecycle | Edges vivem no `ArchitectureGraph` serializado com a sessão |
| Idempotency / retry | N/A — gesto UI local |
| Auth / rate limits | N/A |
| Observability | `__GAME_STATE__` expõe selection, linking, edges |
| External-dependency failure | N/A — sem rede |

Remaining dimensions N/A for this client-only interaction scope.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| CGD-01 | P1: Handles + create edge | Tasks | In Tasks |
| CGD-02 | P1: Cancel / invalid target | Tasks | In Tasks |
| CGD-03 | P1: Preview curve + light | Tasks | In Tasks |
| CGD-04 | P1: Valid-target highlight | Tasks | In Tasks |
| CGD-05 | P1: Select + delete edge | Tasks | In Tasks |
| CGD-06 | P1: Invert direction | Tasks | In Tasks |
| CGD-07 | P1: Reconnect endpoint | Tasks | In Tasks |
| CGD-08 | P2: Bidirectional dual-pulse | Tasks | In Tasks |
| CGD-09 | Wiring: scene interaction + graph sync | Tasks | In Tasks |

**Coverage:** 9 total, mapped to T1–T11 in tasks.md

---

## Success Criteria

- [ ] Demo: Client → LB → API → DB só com handles + preview luminoso, sem “modo conectar” oculto
- [ ] Jogador corrige uma aresta errada (inverter / religar / Delete) em < 10 s
- [ ] `ArchitectureGraph` após edições bate com o que se vê no canvas (via `__GAME_STATE__`)
- [ ] Gate: unit tests da feature passam; sem asserts WebGL de pixel
