# System Design Quest — Product Specification

## Problem Statement

Aprender System Design para entrevistas técnicas é difícil: é abstrato, pouco interativo, e feedback de qualidade é raro. Ferramentas como o [System Design Playground](https://system-design-playground.replit.app/) mostram que desenhar arquiteturas com feedback de IA funciona — mas falta a dimensão **gamificada** (speedrun, ranking), o **levantamento estruturado de requisitos**, e uma experiência **3D imersiva** com fluxo de dados visual.

## Goals

- [ ] Jogador completa um problema de system design (briefing → requisitos → arquitetura 3D → feedback) em modo Study em < 30 min
- [ ] Feedback de IA cobre: funciona/não funciona, gaps de requisitos, melhorias com justificativa
- [ ] Modo Speedrun com ranking por categoria (problema), aceitando apenas soluções corretas
- [ ] Canvas 3D com ≥ 25 tipos de componentes e conexões com animação de fluxo direcional

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Multiplayer colaborativo em tempo real | Complexidade desnecessária para MVP; foco em aprendizado solo |
| Monetização / paywall | Projeto educacional pessoal |
| Mobile nativo | Browser-first; responsive é P2 |
| Geração automática de diagramas por IA | Jogador desenha; IA só julga |
| Simulação de carga real (load test) | Feedback é qualitativo via LLM, não benchmark |
| Editor Mermaid (como no Playground) | Canvas 3D é o diferencial; Mermaid pode ser P3 |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Provedor de IA | OpenAI-compatible API (configurável via env) | Flexível; permite trocar modelo | n |
| Autenticação para ranking | GitHub OAuth (opcional) + nickname anônimo | Ranking precisa de identidade mínima | n |
| Persistência de sessões | SQLite local (dev) / Postgres (prod) | Simples para MVP; nj-mmo usa SQLite | n |
| Assets 3D | CC0 packs (KayKit, Kenney) + primitivos Three.js | AD-004 do nj-mmo | y |
| Primeiro problema do MVP | YouTube Upload + Streaming + Likes/Comments | Pedido explícito do usuário | y |
| Critério "correto" para ranking | Score de consenso dos juízes ≥ 70% E zero blockers críticos | Evita ranking de designs quebrados | n |

**Open questions:** confirmar provedor de IA e auth antes da Fase 2 (ai-judge) e Fase 4 (speedrun).

---

## User Stories

### P1: Briefing do Problema ⭐ MVP

**User Story**: Como estudante, quero ler a descrição completa de um problema (contexto, escala, RPS, usuários, constraints) para entender o que preciso projetar.

**Why P1**: Sem briefing, não há problema a resolver.

**Acceptance Criteria**:

1. WHEN o jogador seleciona um problema THEN o sistema SHALL exibir título, descrição narrativa, métricas de escala (DAU/MAU, RPS de leitura/escrita, storage estimado) e constraints explícitos
2. WHEN o briefing é exibido THEN o sistema SHALL mostrar tags de dificuldade (Easy/Medium/Hard) e domínios técnicos (CDN, fan-out, sharding, etc.)
3. WHEN o jogador clica "Começar" THEN o sistema SHALL avançar para a fase de requisitos

**Independent Test**: Selecionar "YouTube Upload/Stream/Likes" e ver todas as métricas sem avançar de fase.

---

### P1: Levantamento de Requisitos ⭐ MVP

**User Story**: Como estudante, quero listar requisitos funcionais e não-funcionais antes de desenhar, para praticar o ritual de entrevista.

**Why P1**: Diferencial pedagógico central do produto.

**Acceptance Criteria**:

1. WHEN o jogador está na fase de requisitos THEN o sistema SHALL permitir adicionar, editar e remover itens em listas separadas: Funcionais e Não-Funcionais
2. WHEN o jogador adiciona um requisito THEN o sistema SHALL exigir texto não-vazio (mín. 10 caracteres)
3. WHEN o jogador tenta avançar ao canvas com zero requisitos em qualquer lista THEN o sistema SHALL exibir aviso mas permitir prosseguir (modo study não bloqueia)
4. WHEN o jogador avança ao canvas THEN o sistema SHALL persistir os requisitos na sessão atual

**Independent Test**: Adicionar 3 FRs e 2 NFRs, avançar, voltar e ver os itens preservados.

---

### P1: Canvas 3D de Arquitetura ⭐ MVP

**User Story**: Como estudante, quero montar minha arquitetura arrastando ícones 3D e conectando-os com setas animadas.

**Why P1**: Core gameplay.

**Acceptance Criteria**:

1. WHEN o jogador está no canvas THEN o sistema SHALL exibir paleta lateral com categorias de componentes (Client, Edge, Compute, Data, Messaging, Observability)
2. WHEN o jogador arrasta um componente da paleta THEN o sistema SHALL criar uma instância 3D posicionável no plano do canvas (drag no eixo XZ)
3. WHEN o jogador conecta dois componentes THEN o sistema SHALL criar uma aresta com direção configurável (A→B ou bidirecional)
4. WHEN uma conexão direcional existe THEN o sistema SHALL animar um brilho/pulso se movendo na direção da seta em loop contínuo
5. WHEN o jogador seleciona um componente THEN o sistema SHALL permitir renomear label e adicionar nota curta (≤ 200 chars)
6. WHEN o jogador pressiona Delete com componente selecionado THEN o sistema SHALL remover componente e suas conexões
7. WHEN o jogador clica "Submeter" THEN o sistema SHALL serializar o grafo (`ArchitectureGraph` JSON) para julgamento

**Independent Test**: Colocar Client → LB → API → DB, conectar com setas, ver animação de fluxo, submeter.

---

### P1: Julgamento com Feedback Detalhado ⭐ MVP

**User Story**: Como estudante, quero receber feedback estruturado sobre meu design — o que funciona, o que não funciona, o que faltou nos requisitos, e como melhorar.

**Why P1**: Loop de aprendizado; sem isso é só um desenhador.

**Acceptance Criteria**:

1. WHEN o jogador submete um design THEN o sistema SHALL enviar briefing + requisitos + grafo ao serviço de julgamento
2. WHEN o julgamento completa THEN o sistema SHALL exibir veredito: `PASS`, `PARTIAL`, ou `FAIL`
3. WHEN o veredito é exibido THEN o sistema SHALL listar: (a) pontos fortes, (b) problemas críticos, (c) melhorias sugeridas com "como seria melhor" e "por quê"
4. WHEN requisitos foram declarados THEN o sistema SHALL mapear cobertura: requisito coberto / parcialmente coberto / não coberto, com explicação
5. WHEN o julgamento falha (timeout/erro API) THEN o sistema SHALL exibir mensagem amigável e permitir retry

**Independent Test**: Submeter design mínimo (só Client + DB) e receber FAIL com explicação de gaps.

---

### P2: Modo Study vs Speedrun

**User Story**: Como jogador competitivo, quero um modo com timer para speedrun; como estudante, quero modo sem pressão.

**Acceptance Criteria**:

1. WHEN o jogador escolhe modo Study THEN o sistema SHALL ocultar timer e não registrar tempo
2. WHEN o jogador escolhe modo Speedrun THEN o sistema SHALL iniciar cronômetro ao entrar no briefing e parar ao submeter
3. WHEN speedrun termina com veredito PASS ou PARTIAL (≥70%) THEN o sistema SHALL registrar tempo na categoria do problema
4. WHEN speedrun termina com FAIL THEN o sistema SHALL NÃO registrar no ranking

**Independent Test**: Completar speedrun com design ruim → sem entrada no ranking; com design bom → entrada com tempo.

---

### P2: Ranking por Categoria

**User Story**: Como jogador, quero ver leaderboard por problema para competir com outros.

**Acceptance Criteria**:

1. WHEN o jogador acessa ranking de uma categoria THEN o sistema SHALL listar top N (50) tempos válidos ordenados ASC
2. WHEN um tempo é registrado THEN o sistema SHALL associar: problema_id, player_id/nickname, tempo_ms, score, data
3. WHEN dois jogadores empatam no tempo THEN o sistema SHALL desempatar por score mais alto

---

### P2: Biblioteca de Problemas

**User Story**: Como estudante, quero praticar com problemas de sistemas reais (Netflix, Uber, Ticketmaster, etc.).

**Acceptance Criteria**:

1. WHEN o jogador acessa a biblioteca THEN o sistema SHALL listar problemas com filtro por dificuldade e tags
2. WHEN a biblioteca lança THEN o sistema SHALL incluir no mínimo: YouTube (upload/stream/social), URL Shortener, News Feed, Rate Limiter, Uber Geo, Chat, Video Streaming (Netflix), Ticketmaster (ticketing peak)

---

### P3: Tutorial Interativo

**User Story**: Como iniciante, quero um tutorial que ensina os componentes e o fluxo do jogo.

**Acceptance Criteria**:

1. WHEN primeiro acesso THEN o sistema SHALL oferecer tutorial opcional de 5 passos

---

## Edge Cases

- WHEN o jogador submete canvas vazio THEN o sistema SHALL retornar FAIL imediato sem chamar LLM (validação local)
- WHEN conexão cria ciclo THEN o sistema SHALL permitir (ciclos são válidos em alguns designs) mas alertar no feedback
- WHEN API de IA demora > 60s THEN o sistema SHALL mostrar progresso e timeout com retry
- WHEN WebGL não é suportado THEN o sistema SHALL exibir fallback 2D simplificado (P3) ou mensagem de incompatibilidade

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| PROD-01 | P1: Briefing | foundation | Pending |
| PROD-02 | P1: Requisitos | mvp-canvas | Pending |
| PROD-03 | P1: Canvas 3D | mvp-canvas | Pending |
| PROD-04 | P1: Conexões animadas | mvp-canvas | Pending |
| PROD-05 | P1: Julgamento | ai-judge | Pending |
| PROD-06 | P1: Cobertura requisitos | ai-judge | Pending |
| PROD-07 | P2: Modos Study/Speedrun | speedrun | Pending |
| PROD-08 | P2: Ranking | speedrun | Pending |
| PROD-09 | P2: Biblioteca | problem-library | Pending |
| PROD-10 | P3: Tutorial | polish | Pending |

**Coverage:** 10 total, 0 mapped to tasks, 10 unmapped ⚠️

---

## Success Criteria

- [ ] Usuário completa loop briefing → requisitos → canvas → feedback em < 5 min (design trivial) ou < 30 min (design completo)
- [ ] Feedback de IA menciona pelo menos 1 gap de requisito em designs incompletos (teste com golden submissions)
- [ ] Canvas mantém 60 FPS com ≤ 30 componentes e ≤ 50 conexões em hardware médio
- [ ] Speedrun ranking rejeita 100% de submissões FAIL em testes automatizados
