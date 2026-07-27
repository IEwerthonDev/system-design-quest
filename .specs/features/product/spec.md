# System Design Quest — Product Specification

## Problem Statement

Aprender System Design para entrevistas técnicas é difícil: é abstrato, pouco interativo, e feedback de qualidade é raro. Ferramentas como o [System Design Playground](https://system-design-playground.replit.app/) mostram que desenhar arquiteturas com feedback de IA funciona — mas iniciantes **travam** ao chegar no canvas sem tutorial ([análise do site](https://www.youtube.com/watch?v=nvZch2Z7eMM)). Falta a dimensão **gamificada** (speedrun, ranking), o **levantamento estruturado de requisitos**, experiência **3D imersiva**, e sobretudo um design **newbie-friendly** com guia passo a passo.

## Goals

- [ ] Jogador completa um problema de system design (briefing → requisitos → arquitetura 3D → feedback) em modo Study em < 30 min
- [ ] Feedback de IA cobre: funciona/não funciona, gaps de requisitos, melhorias com justificativa
- [ ] Modo Speedrun com ranking por categoria (problema), aceitando apenas soluções corretas
- [ ] Canvas 3D com ≥ 25 tipos de componentes e conexões com animação de fluxo direcional
- [ ] ≥ 70% dos iniciantes completam o tutorial guiado (URL Shortener) sem abandonar
- [ ] Toda métrica do briefing e todo componente da paleta têm explicação acessível em 1 clique

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
| Primeiro problema do MVP | URL Shortener como **tutorial guiado**; YouTube como 2º problema Hard | Newbie-friendly (vídeo nvZch2Z7eMM) + pedido original do usuário | y |
| Tom do feedback para iniciantes | Resumo em linguagem simples + seção técnica expandível | Evita desânimo de feedback excessivamente técnico | y |
| Critério "correto" para ranking | Score de consenso dos juízes ≥ 70% E zero blockers críticos | Evita ranking de designs quebrados | n |

**Open questions:** confirmar provedor de IA e auth antes da Fase 2 (ai-judge) e Fase 4 (speedrun).

---

## User Stories

### P1: Onboarding de Primeira Visita ⭐ MVP

**User Story**: Como iniciante, quero entender o que é o jogo e como funciona antes de começar, para não me sentir perdido.

**Why P1**: Crítica central do [vídeo de análise](https://www.youtube.com/watch?v=nvZch2Z7eMM) — usuários travam sem orientação inicial.

**Acceptance Criteria**:

1. WHEN o jogador acessa o jogo pela primeira vez THEN o sistema SHALL exibir onboarding de 3 telas (o que é SD, fluxo do jogo, escolha iniciante vs experiente)
2. WHEN o jogador escolhe "Sou iniciante" THEN o sistema SHALL iniciar Modo Guiado no problema URL Shortener
3. WHEN o jogador escolhe "Já sei o básico" THEN o sistema SHALL ir à home com biblioteca completa
4. WHEN o jogador clica "Pular" no onboarding THEN o sistema SHALL registrar preferência e não exibir novamente (com opção em configurações para rever)

**Independent Test**: Primeira visita → onboarding → escolher iniciante → cair no tutorial URL Shortener.

---

### P1: Modo Guiado (Tutorial URL Shortener) ⭐ MVP

**User Story**: Como iniciante, quero um tutorial passo a passo que me mostra o que fazer em cada fase, para aprender fazendo sem travar.

**Why P1**: Lucas Montano reconhece que "muita gente vai chegar e vai travar" sem tutorial ([fonte](https://www.youtube.com/watch?v=16IYx0CekVc)).

**Acceptance Criteria**:

1. WHEN o Modo Guiado está ativo THEN o sistema SHALL exibir highlights sequenciais indicando a próxima ação (briefing → requisitos → componente → conexão → submit)
2. WHEN o jogador está no canvas guiado THEN o sistema SHALL sugerir ordem mínima: Client → Load Balancer → App Server → Cache → Database
3. WHEN o jogador precisa conectar componentes THEN o sistema SHALL exibir tooltip com direção sugerida (ex: "Conecte Client → Load Balancer via HTTPS")
4. WHEN o jogador completa o tutorial THEN o sistema SHALL exibir mensagem de conclusão e desbloquear biblioteca completa em Modo Livre
5. WHEN o jogador ignora um hint THEN o sistema SHALL permitir continuar sem bloquear (hints não são gates)

**Independent Test**: Completar URL Shortener guiado do zero ao submit em < 15 min.

---

### P1: Tooltips e Glossário ⭐ MVP

**User Story**: Como iniciante, quero saber o que cada componente e métrica significa sem sair do jogo.

**Acceptance Criteria**:

1. WHEN o jogador passa o mouse sobre um componente na paleta THEN o sistema SHALL exibir tooltip com: nome, descrição (≤ 2 frases), "quando usar"
2. WHEN o jogador clica no ícone `?` em uma métrica do briefing THEN o sistema SHALL exibir explicação em linguagem simples (ex: "RPS = requisições por segundo — quantas vezes o sistema é chamado a cada segundo")
3. WHEN o jogador pressiona atalho `G` THEN o sistema SHALL abrir painel Glossário com termos do problema atual

**Independent Test**: Hover em Load Balancer → ver tooltip; clicar `?` em RPS → ver explicação.

---

### P1: Requisitos Assistidos ⭐ MVP

**User Story**: Como iniciante, quero exemplos de bons requisitos para aprender o formato antes de escrever os meus.

**Acceptance Criteria**:

1. WHEN o jogador está na fase de requisitos THEN o sistema SHALL exibir cards de sugestão clicáveis (≥ 3 FR + ≥ 2 NFR por problema)
2. WHEN o jogador clica em uma sugestão THEN o sistema SHALL adicionar o texto à lista correspondente (editável após adicionar)
3. WHEN o Modo Guiado está ativo THEN o sistema SHALL pré-selecionar sugestões mínimas e pedir confirmação/edição

**Independent Test**: Clicar 3 sugestões FR → lista populada → editar uma → texto atualizado.

---

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

### P2: Dicas Contextuais no Canvas

**User Story**: Como estudante em Modo Study, quero dicas que me orientem sem entregar a resposta pronta.

**Acceptance Criteria**:

1. WHEN o jogador está no canvas em Modo Study THEN o sistema SHALL exibir painel "Dicas" com 2–3 sugestões baseadas no problema e no estado atual do grafo
2. WHEN o jogador adiciona um componente que resolve uma dica THEN o sistema SHALL marcar a dica como resolvida
3. WHEN o Modo Guiado está ativo THEN as dicas SHALL ser mais prescritivas; em Modo Livre, mais genéricas

---

### P2: Feedback em Camadas

**User Story**: Como iniciante, quero entender o veredito em linguagem simples antes de mergulhar nos detalhes técnicos.

**Acceptance Criteria**:

1. WHEN o resultado é exibido THEN o sistema SHALL mostrar primeiro: resumo em 2–3 frases + "próximo passo sugerido"
2. WHEN o jogador expande "Detalhes técnicos" THEN o sistema SHALL exibir seções completas (forças, problemas, melhorias, debate dos juízes)
3. WHEN o jogador ativa toggle "Modo iniciante" no feedback THEN o sistema SHALL usar analogias e evitar jargão não explicado

---

### P2: Trilha de Progressão

**User Story**: Como iniciante, quero saber por qual problema começar e qual vem depois.

**Acceptance Criteria**:

1. WHEN o jogador acessa a biblioteca THEN o sistema SHALL exibir ordem recomendada por nível (Easy → Medium → Hard) com badge "Recomendado"
2. WHEN um problema Hard é selecionado sem ter completado nenhum Easy THEN o sistema SHALL exibir aviso amigável (não bloqueante)
3. WHEN o jogador completa um problema com PARTIAL+ em Study THEN o sistema SHALL marcar como concluído na trilha e atualizar contador por nível
4. WHEN o jogador tenta speedrun em nível Medium sem 2 Easy concluídos THEN o sistema SHALL exibir aviso (Study recomendado primeiro)

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

### P2: Biblioteca de Problemas por Nível

**User Story**: Como estudante, quero escolher problemas por dificuldade (Fácil, Médio, Difícil) e ver uma trilha recomendada.

**Why P2**: Progressão estruturada evita que iniciantes caiam em problemas Hard de cara.

**Acceptance Criteria**:

1. WHEN o jogador acessa a biblioteca THEN o sistema SHALL exibir problemas agrupados ou filtráveis por nível: `easy` (🟢 Fácil), `medium` (🟡 Médio), `hard` (🔴 Difícil)
2. WHEN a biblioteca lança THEN o sistema SHALL incluir no mínimo **7 Easy, 10 Medium, 10 Hard** (ver `docs/PROBLEM-LIBRARY.md`)
3. WHEN um problema é listado THEN o sistema SHALL exibir: título, nível, tags, tempo estimado, badge "Recomendado" na trilha
4. WHEN o jogador filtra por nível THEN o sistema SHALL atualizar a lista em < 200ms (client-side)
5. WHEN o jogador completa um problema THEN o sistema SHALL marcar progresso por nível (ex: "3/7 Easy concluídos")

**Problemas obrigatórios no launch (pedido do usuário + curadoria):**

| Nível | Problemas destacados |
| ----- | -------------------- |
| Easy | URL Shortener, Rate Limiter, Pastebin |
| Medium | YouTube, Uber, Chat, News Feed, Instagram |
| Hard | Netflix, Ticketmaster, Stripe Payments, Google Maps |

**Independent Test**: Filtrar por Hard → ver Netflix e Ticketmaster; filtrar por Easy → ver URL Shortener com badge Tutorial.

---

### P3: Tutorial Interativo (rever onboarding)

**User Story**: Como jogador que pulou o onboarding, quero poder refazer o tutorial a qualquer momento.

**Acceptance Criteria**:

1. WHEN o jogador acessa Configurações THEN o sistema SHALL oferecer "Refazer tutorial" e "Rever onboarding"

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
| PROD-09 | P2: Biblioteca por nível | problem-library | Pending |
| PROD-10 | P3: Rever tutorial | polish | Pending |
| PROD-11 | P1: Onboarding | mvp-canvas | Pending |
| PROD-12 | P1: Modo Guiado | mvp-canvas | Pending |
| PROD-13 | P1: Tooltips/glossário | mvp-canvas | Pending |
| PROD-14 | P1: Métricas explicadas | mvp-canvas | Pending |
| PROD-15 | P1: Requisitos assistidos | mvp-canvas | Pending |
| PROD-16 | P2: Dicas no canvas | mvp-canvas | Pending |
| PROD-17 | P2: Feedback em camadas | ai-judge | Pending |
| PROD-18 | P2: Trilha de progressão | problem-library | Pending |
| PROD-19 | P2: Filtros e badges de nível | problem-library | Pending |

**Coverage:** 19 total, 0 mapped to tasks, 19 unmapped ⚠️

---

## Success Criteria

- [ ] Usuário completa loop briefing → requisitos → canvas → feedback em < 5 min (design trivial) ou < 30 min (design completo)
- [ ] Feedback de IA menciona pelo menos 1 gap de requisito em designs incompletos (teste com golden submissions)
- [ ] Canvas mantém 60 FPS com ≤ 30 componentes e ≤ 50 conexões em hardware médio
- [ ] Speedrun ranking rejeita 100% de submissões FAIL em testes automatizados
- [ ] ≥ 70% dos novos usuários completam tutorial URL Shortener guiado sem abandonar
