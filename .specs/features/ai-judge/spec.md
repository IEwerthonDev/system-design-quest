# AI Judge — Specification

**Parent:** `.specs/features/product/spec.md`  
**Design:** `.specs/features/product/design.md` (parent — feature design TBD)  
**Branch:** `feature/ai-judge`  
**Depends on:** `mvp-canvas` (Fase 1) merged em `main`

---

## Problem Statement

O loop pedagógico está incompleto: o jogador monta arquitetura e submete, mas recebe apenas um placeholder local. Sem feedback de IA, não há aprendizado sobre gaps de design, cobertura de requisitos ou melhorias. A Fase 2 fecha o **MVP pedagógico completo** (briefing → requisitos → canvas → julgamento).

## Goals

- [ ] Submit de design válido dispara `POST /api/judge` e retorna `JudgeResult` estruturado
- [ ] Dual-judge (rigoroso + pragmático) debate e produz consenso — AD-006
- [ ] Veredito `PASS` / `PARTIAL` / `FAIL` e score 0–100 seguem AD-016
- [ ] UI de resultado com forças, problemas, melhorias e cobertura de requisitos declarados
- [ ] Feedback em camadas: resumo simples + detalhes expandíveis — PROD-17
- [ ] Golden test submissions (bom, médio, ruim) validam comportamento sem depender de LLM ao vivo em CI
- [ ] `npx nx run-many -t lint test` passa; testes determinísticos (sem wall-clock sleeps)

## Out of Scope (esta feature)

| Item | Fase |
| ---- | ---- |
| Biblioteca com 27 problemas e rubricas ocultas por problema | `problem-library` (Fase 3) |
| Speedrun / ranking / `POST /api/leaderboard` | `speedrun` (Fase 4) |
| Persistência de submissões em DB | Deferred — sessão é efêmera no client |
| Auth de jogador | `speedrun` (Fase 4) |
| Dicas contextuais no canvas | `mvp-canvas` stretch (PROD-16) |
| Streaming token-a-token do debate para o client | Deferred — progresso por etapas é suficiente |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Provedor LLM | API OpenAI-compatible via env (`LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`) | Flexível; suporta OpenAI, OpenRouter, Ollama com adapter | y |
| LLM em dev/CI | Mock/fixtures determinísticos; chamada real só em dev manual com env | Testes rápidos e estáveis — AD-010 | y |
| Rate limiting | Sem limite em dev; 20 req/IP/hora em produção (`NODE_ENV=production`) | Protege custo sem atrapalhar dev local | y |
| Timeout de julgamento | 60s total; retry manual pelo jogador | Product edge case | y |
| Canvas vazio | FAIL local no client — sem chamar API | AD-016 | y |
| Rubrica oculta por problema | Usar briefing + constraints do URL Shortener apenas; rubricas completas na Fase 3 | Escopo mínimo viável com problema tutorial existente | y |
| Golden tests | 3 grafos fixos + respostas mockadas com vereditos esperados (PASS, PARTIAL, FAIL) | Valida pipeline e AD-016 sem LLM ao vivo | y |
| Loading UX | Indicador por etapa: Analisando → Juiz rigoroso → Juiz pragmático → Consenso | Feedback de progresso sem streaming | y |
| Modo iniciante no feedback | Default ON se `experienceLevel === 'beginner'` no onboarding | PROD-17 + discuss 2026-07-27 | y |

**Open questions:** none — resolvidas em `context.md`.

---

## User Stories

### P1: Endpoint de Julgamento ⭐ MVP

**User Story**: Como estudante, quero que minha arquitetura seja julgada por IA ao submeter, para receber feedback estruturado sobre meu design.

**Why P1**: Core do loop de aprendizado — PROD-05.

**Acceptance Criteria**:

1. WHEN o jogador submete um grafo válido (≥1 nó) THEN o client SHALL enviar `POST /api/judge` com `{ problemId, requirements, graph, mode }`
2. WHEN o server recebe a requisição THEN o server SHALL orquestrar dois juízes LLM (rigoroso e pragmático) e produzir consenso — AD-006
3. WHEN o julgamento completa THEN o server SHALL retornar `JudgeResult` com `verdict`, `score` (0–100), `strengths`, `criticalIssues`, `improvements`, `requirementCoverage`, `judgeDebate`
4. WHEN o score ≥ 80 e zero `criticalIssues` com severidade `blocker` THEN `verdict` SHALL ser `PASS` — AD-016
5. WHEN o score ≥ 70 e zero blockers críticos mas não atinge critério PASS THEN `verdict` SHALL ser `PARTIAL` — AD-016
6. WHEN o score < 70 OU existe blocker crítico THEN `verdict` SHALL ser `FAIL` — AD-016
7. WHEN o grafo tem zero nós THEN o client SHALL retornar FAIL local sem chamar a API — AD-016

**Independent Test**: Submeter grafo Client+DB apenas → API retorna FAIL com `criticalIssues` explicando ausência de camadas intermediárias.

---

### P1: Cobertura de Requisitos Declarados ⭐ MVP

**User Story**: Como estudante, quero saber se minha arquitetura cobre os requisitos que eu listei, para aprender a rastrear requisitos até componentes.

**Why P1**: Diferencial pedagógico — PROD-06.

**Acceptance Criteria**:

1. WHEN requisitos funcionais e/ou não-funcionais foram declarados THEN cada item SHALL aparecer em `requirementCoverage` com status `covered`, `partial`, ou `missing`
2. WHEN um requisito tem status `partial` ou `missing` THEN o item SHALL incluir `explanation` com referência a componentes ou gaps no grafo
3. WHEN zero requisitos foram declarados THEN `requirementCoverage` SHALL ser array vazio e o julgamento SHALL prosseguir normalmente (sem erro)

**Independent Test**: Declarar 2 FRs, submeter design que cobre 1 → ver 1 `covered`, 1 `missing` com explicação.

---

### P1: UI de Resultado com Feedback Estruturado ⭐ MVP

**User Story**: Como estudante, quero ver o veredito e feedback organizado em seções claras, para entender o que funcionou e o que melhorar.

**Why P1**: Sem UI, o resultado JSON não educa — PROD-05.

**Acceptance Criteria**:

1. WHEN o julgamento completa THEN o client SHALL exibir veredito (`PASS` / `PARTIAL` / `FAIL`) e score numérico
2. WHEN o resultado é exibido THEN o client SHALL listar seções: pontos fortes, problemas críticos, melhorias sugeridas (cada item com título + explicação)
3. WHEN melhorias são exibidas THEN cada item SHALL incluir "como melhorar" e "por quê" — campos `howToImprove` e `whyItMatters`
4. WHEN `requirementCoverage` não está vazio THEN o client SHALL exibir tabela/lista de cobertura por requisito
5. WHEN o jogador está na fase `result` THEN o client SHALL permitir voltar ao canvas para iterar o design

**Independent Test**: Após submit bem-sucedido, ver badge de veredito + pelo menos uma seção de feedback renderizada.

---

### P1: Estados de Loading e Erro ⭐ MVP

**User Story**: Como estudante, quero saber que o julgamento está em andamento e poder tentar de novo se falhar, para não achar que o jogo travou.

**Acceptance Criteria**:

1. WHEN a requisição de julgamento está em flight THEN o client SHALL exibir loading state com indicação de progresso por etapa do dual-judge
2. WHEN a API retorna erro 5xx ou timeout (>60s) THEN o client SHALL exibir mensagem amigável em PT-BR e botão "Tentar novamente"
3. WHEN o jogador clica retry THEN o client SHALL reenviar a mesma submissão sem exigir remontar o grafo
4. WHEN a API retorna 429 (rate limit) THEN o client SHALL exibir mensagem informando limite excedido e tempo estimado para retry

**Independent Test**: Simular timeout mock → ver mensagem de erro + retry funcional.

---

### P2: Feedback em Camadas (Iniciante vs Técnico) ⭐ MVP stretch

**User Story**: Como iniciante, quero entender o veredito em linguagem simples antes de mergulhar nos detalhes técnicos.

**Why P2**: PROD-17 — incluído na Fase 2 pois é parte do resultado pedagógico.

**Acceptance Criteria**:

1. WHEN o resultado é exibido THEN o client SHALL mostrar primeiro resumo em 2–3 frases + "próximo passo sugerido"
2. WHEN o jogador expande "Detalhes técnicos" THEN o client SHALL exibir seções completas incluindo debate dos juízes (`judgeDebate`)
3. WHEN toggle "Modo iniciante" está ativo THEN o resumo SHALL usar linguagem simples; detalhes técnicos permanecem disponíveis ao expandir
4. WHEN o jogador escolheu "Sou iniciante" no onboarding THEN toggle "Modo iniciante" SHALL iniciar ativo por default

**Independent Test**: Ver resumo colapsado por default; expandir → ver debate rigoroso/pragmático/consenso.

---

### P2: Golden Test Submissions

**User Story**: Como desenvolvedor, quero testes que validem o pipeline de julgamento com designs conhecidos, para detectar regressões sem custo de API.

**Acceptance Criteria**:

1. WHEN testes rodam em CI THEN o pipeline de julgamento SHALL usar mock LLM com respostas fixture (não chama API externa)
2. WHEN grafo "good" (LB + App + Cache + DB para URL Shortener) é julgado THEN `verdict` SHALL ser `PASS` ou `PARTIAL` com score ≥ 70
3. WHEN grafo "bad" (só Client + DB) é julgado THEN `verdict` SHALL ser `FAIL`
4. WHEN grafo "medium" (App + DB sem cache) é julgado THEN `verdict` SHALL ser `PARTIAL` ou `FAIL` com `criticalIssues` mencionando cache ou escala

**Independent Test**: `npm test` no server valida os 3 fixtures sem `LLM_API_KEY`.

---

## Edge Cases

- WHEN canvas vazio no submit THEN FAIL local imediato sem LLM — AD-016
- WHEN API de IA demora > 60s THEN timeout com retry — product edge case
- WHEN `LLM_API_KEY` ausente no server THEN `POST /api/judge` retorna 503 com mensagem clara (dev: instruir a configurar env)
- WHEN resposta LLM é JSON malformado THEN server tenta reparo 1x; se falhar, retorna 502 com retry sugerido
- WHEN requisitos declarados contêm texto ofensivo THEN juiz processa normalmente (sem moderação extra nesta fase)
- WHEN grafo tem ciclo THEN juiz pode mencionar em feedback mas não bloqueia julgamento

---

## Implicit-Requirement Dimensions

| Dimension | Resolution |
| --------- | ---------- |
| Input validation & bounds | Validar `problemId` conhecido, grafo com schema `ArchitectureGraph`, requirements arrays de strings |
| Failure / partial-failure states | Timeout 60s, retry client, 503 sem API key, 502 JSON parse fail |
| Idempotency / retry | Re-submit idempotente (nova chamada LLM); client guarda último payload para retry |
| Auth boundaries & rate limits | Sem auth; rate limit 20/IP/hora in-memory |
| Concurrency / ordering | Juízes rigoroso e pragmático podem rodar em paralelo; consenso após ambos |
| Data lifecycle / expiry | Sem persistência; resultado vive na sessão client |
| Observability | Log estruturado no server (request id, latency, verdict) — sem PII |
| External-dependency failure | Circuit breaker deferred; fallback = erro amigável + retry |
| State-transition integrity | Submit só na fase canvas; sucesso avança para result com `JudgeResult` na sessão |

---

## Requirement Traceability

| ID | Story | Phase | Status |
| -- | ----- | ----- | ------ |
| JUDGE-01 | P1: Endpoint | Execute T5 | Done |
| JUDGE-02 | P1: Dual-judge orchestration | Execute T4 | Done |
| JUDGE-03 | P1: Veredito AD-016 | Execute T1 | Done |
| JUDGE-04 | P1: Cobertura requisitos | Execute T4 | Done |
| JUDGE-05 | P1: UI resultado | Design | Pending |
| JUDGE-06 | P1: Loading/erro/retry | Design | Pending |
| JUDGE-07 | P2: Feedback em camadas | Design | Pending |
| JUDGE-08 | P2: Golden tests | Design | Pending |
| JUDGE-09 | P1: Rate limiting | Execute T5 | Done |
| JUDGE-10 | P1: Tipos shared `JudgeResult` | Execute T1 | Done |

**Parent mapping:** JUDGE-01..06 → PROD-05; JUDGE-04 → PROD-06; JUDGE-07 → PROD-17

**Coverage:** 10 requirements, 2 done (T1)

---

## Success Criteria

- [ ] Design ruim (Client + DB) → FAIL com explicação clara de gaps
- [ ] Design bom (LB + App + Cache + DB) → PASS ou PARTIAL ≥ 70 com melhorias construtivas
- [ ] Cobertura de requisitos reflete lista declarada pelo jogador
- [ ] CI verde sem `LLM_API_KEY` (mocks/fixtures)
- [ ] Loading visível durante julgamento; retry funciona após erro simulado
