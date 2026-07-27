# Playground Parity — Specification

**Parent:** `.specs/features/product/spec.md`, `.specs/features/blueprint-2d-canvas/spec.md`  
**Branch:** `feature/playground-parity`  
**Depends on:** `main` @ `4b8c87a` (blueprint-2d-canvas merged)  
**Complexity:** Large / Complex  
**AD touch:** AD-016 (verdict→session status), AD-018 (SVG edges curve), AD-020 (sim caps + labels); progress storage pattern in `client/src/storage/`

---

## Problem Statement

O canvas blueprint 2D já existe, mas ainda falta a paridade visual e de fluxo com o [System Design Playground](https://system-design-playground.replit.app/): labels **BOTTLENECK** / **QUEUEING**, barra de ms por nó, caps de Speed/Traffic em 5×, conexões curvas bem legíveis, juiz na lateral, modal de aprovação/reprovação que não estoura a viewport, e um dashboard de sessões (Approved / Rejected / In Progress) com persistência do grafo após confirmar ou voltar. Sem isso, a sessão parece incompleta frente ao produto de referência e o jogador perde o histórico do que desenhou.

## Goals

- [ ] Simulação sob carga mostra labels BOTTLENECK (vermelho) / QUEUEING (amarelo) + barra ms verde/amarelo/vermelho por nó
- [ ] Speed e Traffic capped em **1–5×**; painel **Dicas** removido do canvas
- [ ] Arestas SVG entre componentes usam estilo **curvo** (Bezier) claramente visível
- [ ] Juiz abre como **sidebar direita**; modal approve/reject cabe na viewport (incl. mobile)
- [ ] Confirmar salva grafo + status approved/rejected/**partial** via API; Voltar salva **in_progress**
- [ ] Dashboard de histórico com filtros Approved / Rejected / **Partial** / In Progress (cap 50 / nickname)

## Out of Scope

| Item | Reason |
| ---- | ------ |
| Chaos tab / Mermaid view | Prints do Playground; pedido não inclui — backlog |
| Simulação server-side / LLM de pressão | Continua AD-020 client determinístico |
| Mudança da rubrica AD-016 (PASS/PARTIAL/FAIL thresholds) | Só mapeamento para status de sessão |
| Auth obrigatória / contas multi-device sync | Depende de Discuss (persistência); se local → sem login |
| Reintroduzir canvas 3D / Three.js no path de jogo | AD-018 |
| Novos tipos de componente / configs tipadas extras | Blueprint já cobriu MVP |
| Leaderboard / nickname changes | Já em `speedrun` |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Persistência de sessões | **API + durable JSON file** (`SessionStore`; InMemory em testes) — Approach A | Discuss 1B + Design | **y** |
| Auth | **Nickname-only** (padrão speedrun); sem contas | Discuss | **y** |
| PASS/PARTIAL/FAIL → status | PASS→`approved`; FAIL→`rejected`; PARTIAL→**`partial`**; Voltar→`in_progress` | Discuss “3 Partial” = status próprio | **y** |
| Retenção | Cap **50** sessões / nickname; evict oldest `updatedAt` | Discuss | **y** |
| Chaos / Mermaid | Fora de escopo | Pedido não inclui | y |
| Labels BOTTLENECK/QUEUEING | `hot` → BOTTLENECK (red); `warn` → QUEUEING (yellow); `ok` → sem label de carga | Paridade Playground + motor `PressureLevel` existente | y (pedido) |
| Barra ms | Estimativa **educativa** derivada da pressão/carga (não latência real); cores green/yellow/red = ok/warn/hot | Pedagógico; testável | y (pedido) |
| Speed/Traffic max | Clamp UI + `normalizeGraph` para **1–5** (hoje 1–10) | Pedido explícito | y |
| Remover Dicas | Desmontar `hints-panel` do canvas Study; não deletar conteúdo de produto forever (pode voltar em feature futura) | Pedido | y |
| Edge curve | Cubic/quadratic Bezier SVG obrigatório (já há path `C`); reforçar estilo se necessário — **não** straight line | Pedido + AD-018 | y |
| Judge layout | Right sidebar overlay/dock; não full-page modal único | Pedido | y |
| Modal overflow | max-height + scroll interno; safe viewport padding; works ≤375px width | Pedido | y |

**Open questions:** none — Discuss closed in `context.md`. Confirm context → Design.

**Context:** `.specs/features/playground-parity/context.md`

---

## User Stories

### P1: Labels BOTTLENECK / QUEUEING + barra ms ⭐ MVP

**User Story:** Como jogador, quero ver BOTTLENECK (vermelho) e QUEUEING (amarelo) nos cards sob carga, com barra de ms colorida, para entender gargalos como no Playground.

**Why P1:** Feedback visual central da simulação educativa; pedido explícito.

**Acceptance Criteria:**

1. WHEN a simulação está `running` e a pressão do nó é `hot` THEN o card SHALL exibir label **BOTTLENECK** em estilo vermelho
2. WHEN a simulação está `running` e a pressão do nó é `warn` THEN o card SHALL exibir label **QUEUEING** em estilo amarelo
3. WHEN a simulação está `running` e a pressão do nó é `ok` THEN o card SHALL **não** exibir BOTTLENECK nem QUEUEING
4. WHEN a simulação está `running` THEN cada nó SHALL mostrar uma barra de ms com cor verde (`ok`) / amarela (`warn`) / vermelha (`hot`)
5. WHEN a simulação **não** está `running` THEN labels BOTTLENECK/QUEUEING e a barra ms SHALL estar ocultas (ou em estado neutro sem cor de alerta)
6. WHEN `__GAME_STATE__` é inspecionado com sim running THEN o sistema SHALL expor pressões (e, se modelado, ms educativos) por `nodeId` de forma testável

**Independent Test:** Fixture SQL hot (low hitRate + high traffic) → Start → card SQL tem BOTTLENECK + barra vermelha; cache ok → sem label de carga + barra verde.

**Req IDs:** PP-01

---

### P1: Speed + Traffic max 5× ⭐ MVP

**User Story:** Como jogador, quero Speed e Traffic no máximo 5×, para controles alinhados ao Playground.

**Why P1:** Pedido explícito; hoje clamp é 10.

**Acceptance Criteria:**

1. WHEN o jogador move o slider Speed THEN o valor SHALL ficar no intervalo **1–5** (inclusive)
2. WHEN o jogador move o slider Traffic THEN o valor SHALL ficar no intervalo **1–5** (inclusive)
3. WHEN `normalizeGraph` recebe `simulation.speed` ou `traffic` > 5 THEN o valor normalizado SHALL ser clampado a 5
4. WHEN Speed muda THEN a pressão dos nós SHALL permanecer inalterada (só animação — AD-020)

**Independent Test:** Set speed=5, traffic=5 via UI; inject speed=9 via graph → normalize → 5; pressures equal at speed 1 vs 5.

**Req IDs:** PP-02

---

### P1: Remover painel Dicas do canvas ⭐ MVP

**User Story:** Como jogador, quero o canvas sem o painel "Dicas", para a área de desenho ficar limpa como no Playground.

**Why P1:** Pedido explícito; reduz clutter.

**Acceptance Criteria:**

1. WHEN a fase canvas está ativa (Study ou Speedrun) THEN o DOM SHALL **não** conter `[data-testid="hints-panel"]`
2. WHEN o jogador usa paleta, sim e popovers THEN o fluxo de desenho SHALL continuar funcionando sem o painel Dicas

**Independent Test:** Abrir sessão Study → `querySelector('[data-testid="hints-panel"]') === null`.

**Req IDs:** PP-03

---

### P1: Conexões curvas entre componentes ⭐ MVP

**User Story:** Como jogador, quero linhas de conexão **curvas** entre componentes, para o diagrama ler como o Playground (não retas).

**Why P1:** Pedido explícito neste Specify; reforça AD-018.

**Acceptance Criteria:**

1. WHEN existem ≥1 arestas no canvas THEN cada aresta renderizada SHALL usar path SVG com curva Bezier (`C` ou `Q`), não segmento `L` reto único
2. WHEN o jogador cria uma nova conexão THEN a aresta preview/final SHALL usar o mesmo estilo curvo
3. WHEN pacotes animam com sim running THEN os pacotes SHALL seguir o path curvo da aresta

**Independent Test:** Connect A→B → path `d` contém `C` ou `Q`; sem path só `M … L …`.

**Req IDs:** PP-04

---

### P1: Juiz em sidebar direita + modal responsivo ⭐ MVP

**User Story:** Como jogador, quero o resultado do juiz na lateral direita e um modal de aprovação/reprovação que caiba na tela, para revisar feedback sem perder o canvas e sem overflow.

**Why P1:** Pedido explícito; UX quebrada hoje se modal estoura viewport.

**Acceptance Criteria:**

1. WHEN o julgamento conclui (ou o jogador abre o resultado) THEN o painel do juiz SHALL aparecer como **sidebar à direita** (não como página única que substitui todo o layout sem lateral)
2. WHEN o modal/dialogo de aprovação ou reprovação é exibido THEN o container SHALL respeitar a viewport (`max-height` ≤ 100dvh com scroll interno) sem overflow cortando ações primárias
3. WHEN a viewport tem largura ≤ 375px THEN sidebar e modal SHALL permanecer usáveis (ações Confirmar / Voltar visíveis sem scroll horizontal da página)
4. WHEN o jogador fecha a sidebar do juiz (se aplicável) THEN o canvas SHALL permanecer intacto

**Independent Test:** Mount result/judge chrome → `data-testid` sidebar right; modal height ≤ viewport em fixture 375×667.

**Req IDs:** PP-05

---

### P1: Salvar sessão no Confirmar / Voltar ⭐ MVP

**User Story:** Como jogador, quero que Confirmar salve o desenho com status aprovado/reprovado e Voltar salve em progresso, para não perder o trabalho.

**Why P1:** Núcleo do histórico; pedido explícito.

**Acceptance Criteria:**

1. WHEN o jogador confirma após o juízo THEN o sistema SHALL persistir via **API** um registro contendo: `id`, `problemId`, `playerNickname`, `graph`, `status` ∈ {`approved`,`rejected`,`partial`}, `judgeResult` (ou score/verdict), `updatedAt`
2. WHEN o veredito é `PASS` THEN `status` SHALL ser `approved`
3. WHEN o veredito é `FAIL` THEN `status` SHALL ser `rejected`
4. WHEN o veredito é `PARTIAL` THEN `status` SHALL ser `partial`
5. WHEN o jogador escolhe **Voltar** (sair sem confirmar o resultado final) THEN o sistema SHALL upsert a sessão com `status` = `in_progress` e o grafo atual
6. WHEN uma sessão já existe para o mesmo `id` THEN Voltar/Confirmar SHALL **atualizar** o registro (idempotente por id), não criar duplicata
7. WHEN o nickname já tem 50 sessões e um upsert cria uma nova THEN o sistema SHALL evict a mais antiga por `updatedAt` até ≤50
8. WHEN a persistência falha (rede/5xx/validação) THEN o sistema SHALL informar o jogador e **não** fingir sucesso

**Independent Test:** Confirm PASS → API `approved`; PARTIAL → `partial`; Voltar → `in_progress`; 51ª sessão → oldest evicted.

**Req IDs:** PP-06

---

### P1: Dashboard de histórico de sessões ⭐ MVP

**User Story:** Como jogador, quero uma página/dashboard com sessões Approved / Rejected / In Progress, para retomar ou revisar desenhos como no Playground.

**Why P1:** Fecha o loop do pedido; prints de referência.

**Acceptance Criteria:**

1. WHEN o jogador abre o dashboard de sessões THEN o sistema SHALL listar sessões da API filtráveis/agrupadas por **Approved**, **Rejected**, **Partial** e **In Progress**
2. WHEN não há sessões em um status THEN a seção/filtro SHALL mostrar empty state claro (não erro)
3. WHEN o jogador seleciona uma sessão THEN o sistema SHALL permitir reabrir o grafo salvo (view/retomar canvas com graph hidratado)
4. WHEN uma sessão tem juízo THEN o card/linha SHALL mostrar: problema, status, `updatedAt`, score/veredito; nickname visível no contexto da lista
5. WHEN o dashboard carrega THEN a fonte de dados SHALL ser a API de sessões (PP-06), filtrada pelo nickname ativo

**Independent Test:** Seed approved + rejected + partial + in_progress → 4 buckets; abrir in_progress → `__GAME_STATE__.graph` hidrata.

**Req IDs:** PP-07

---

### P2: Reabrir e re-submeter sessão

**User Story:** Como jogador, quero retomar uma sessão In Progress e re-submeter ao juiz, para iterar no design.

**Why P2:** Natural após dashboard; pode ser mínimo em P1 (só hidratar) e completar fluxo aqui.

**Acceptance Criteria:**

1. WHEN o jogador reabre `in_progress` THEN a sessão ativa SHALL carregar graph + requirements (se salvos) e fase canvas (ou última fase salva)
2. WHEN o jogador re-submete e confirma THEN o status SHALL transicionar de `in_progress` → `approved`|`rejected`|`partial` no mesmo `id`

**Independent Test:** Seed in_progress → reopen → submit → confirm → status approved/rejected/partial same id.

**Req IDs:** PP-08

---

## Edge Cases

- WHEN Speed/Traffic no grafo legado são > 5 THEN normalize SHALL clamp sem crash
- WHEN sim running e grafo vazio THEN nenhum label/barra ms é exigido (zero nodes)
- WHEN juízo retorna PARTIAL THEN `status` SHALL ser `partial` (nunca colapsar para approved/rejected nesta feature)
- WHEN storage está corrompido / JSON inválido THEN o dashboard SHALL tratar como lista vazia ou recuperar o que for válido, sem quebrar boot
- WHEN o jogador confirma duas vezes rapidamente THEN apenas um registro por `id` (última escrita vence)
- WHEN viewport é baixa (altura < 500px) THEN modal SHALL scrollar conteúdo interno mantendo botões de ação acessíveis
- WHEN aresta tem from≈to (nós muito próximos) THEN o path curvo SHALL permanecer válido (sem NaN)

---

## Implicit-Requirement Dimensions

| Dimension | Resolution |
| --------- | ---------- |
| Input validation & bounds | Speed/Traffic 1–5; session payload = valid ArchitectureGraph; status enum fechado |
| Failure / partial-failure | Persist fail → mensagem UI; boot com store corrompido → degrade graceful |
| Idempotency / retry / dedup | Upsert por `session.id`; Confirmar/Voltar não duplicam |
| Auth boundaries & rate limits | Nickname-only; rate limit / validation no Design |
| Concurrency / ordering | API upsert last-write-wins por `id`; sem multi-tab sync obrigatório |
| Data lifecycle / expiry | Cap 50 / nickname; eviction oldest `updatedAt`; sem TTL |
| Observability | `__GAME_STATE__` + testids; sem telemetria nova obrigatória |
| External-dependency failure | API timeout/5xx → mensagem UI; sem fingir sucesso |
| State-transition integrity | Confirmar: `in_progress`→`approved`\|`rejected`\|`partial`; Voltar escreve `in_progress`; reopen/edit (P2) para voltar a editar |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| PP-01 | P1: Labels + ms bar | Tasks | In Tasks |
| PP-02 | P1: Speed/Traffic max 5× | Tasks | In Tasks |
| PP-03 | P1: Remover Dicas | Tasks | In Tasks |
| PP-04 | P1: Conexões curvas | Tasks | In Tasks |
| PP-05 | P1: Judge sidebar + modal | Tasks | In Tasks |
| PP-06 | P1: Save confirm/back | Tasks | In Tasks |
| PP-07 | P1: Session dashboard | Tasks | In Tasks |
| PP-08 | P2: Reabrir / re-submit | Tasks | In Tasks |

**Coverage:** 8 total, 0 mapped to tasks, 8 unmapped ⚠️ (esperado pré-Tasks)

---

## Success Criteria

- [ ] Paridade visual Playground nos nós sob carga (labels + ms) e caps 5×
- [ ] Canvas sem Dicas; edges curvas verificáveis em teste
- [ ] Juiz lateral + modal sem overflow em mobile fixture
- [ ] Sessões persistem nos 3 status e aparecem no dashboard
- [ ] Gate: `npx nx run-many -t lint test` PASS
- [ ] Verifier PASS com evidence-or-zero

---

## References

- Playground: https://system-design-playground.replit.app/
- STATE Handoff pedido (2026-07-27)
- Existing: `evaluateSimulation` pressures; `svg-edges.curvePath`; `hints-panel`; `result-panel`; `client/src/storage/progress.ts` pattern
