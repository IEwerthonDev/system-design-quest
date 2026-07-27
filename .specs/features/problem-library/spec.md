# Problem Library — Specification

**Parent:** `.specs/features/product/spec.md` (PROD-09, PROD-18, PROD-19)  
**Design:** `.specs/features/problem-library/design.md`  
**Branch:** `feature/problem-library`  
**Depends on:** `ai-judge` (Fase 2) merged em `main`

---

## Problem Statement

Apenas o URL Shortener está disponível; iniciantes não têm progressão estruturada e jogadores experientes não podem escolher outros sistemas. A Fase 3 entrega a biblioteca completa (27 problemas em 3 níveis), rubricas ocultas para o juiz, tela de seleção com filtros e trilha de progresso local.

## Goals

- [ ] 27 problemas jogáveis (7 Easy · 10 Medium · 10 Hard) conforme `docs/PROBLEM-LIBRARY.md`
- [ ] Tela de biblioteca com filtros por nível, tags, tempo estimado e badge "Recomendado"
- [ ] Rubricas ocultas (`JudgeRubric`) incluídas nos prompts do juiz
- [ ] Progresso local por problema (PARTIAL+ com score ≥ 70) e contador por nível
- [ ] Avisos amigáveis (não bloqueantes) ao pular níveis ou speedrun cedo
- [ ] `npx nx run-many -t lint test` passa

## Out of Scope

| Item | Fase |
| ---- | ---- |
| Speedrun timer e ranking | `speedrun` (Fase 4) |
| Persistência em DB / auth | `speedrun` (Fase 4) |
| Modo Guiado além do URL Shortener | Deferred |
| Glossário por problema além do URL Shortener | Stretch — tags globais suficientes |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Definições de problemas | Um arquivo por tier (`easy.ts`, `medium.ts`, `hard.ts`) + `url-shortener.ts` | Manutenível; evita 27 arquivos soltos | y |
| Progresso | `localStorage` (`sdq-progress`) | Consistente com preferences; speedrun usa DB depois | y |
| Biblioteca inicial | Experienced / libraryUnlocked → biblioteca; beginner guiado → URL Shortener direto | PROD-12 + AD-014 | y |
| Rubrica oculta | `expectedComponents`, `criticalPatterns`, `commonMistakes` | Alimenta prompts sem expor ao jogador | y |
| isRecommended | `orderInTrack` nos primeiros da trilha em `PROBLEM-LIBRARY.md` | PROD-18 | y |
| Speedrun na biblioteca | Selecionável na UI; aviso se < 2 Easy concluídos (não bloqueia) | PROD-18 AC4; timer na Fase 4 | y |

**Open questions:** none.

---

## User Stories

### P1: Catálogo de 27 Problemas ⭐ MVP

**User Story**: Como estudante, quero escolher entre 27 problemas reais de system design para praticar.

**Acceptance Criteria**:

1. WHEN `listProblems()` é chamado THEN o sistema SHALL retornar exatamente 27 problemas
2. WHEN contados por dificuldade THEN SHALL haver 7 `easy`, 10 `medium`, 10 `hard`
3. WHEN cada problema é inspecionado THEN SHALL incluir: `id`, `title`, `difficulty`, `description`, `metrics`, `constraints`, `tags`, `suggestedRequirements` (≥3 FR + ≥2 NFR), `estimatedMinutes`, `rubric`, `orderInTrack`
4. WHEN `getProblem(id)` recebe id válido THEN SHALL retornar a definição; id inválido → `undefined`
5. WHEN apenas `url-shortener` THEN `isTutorial` SHALL ser `true`; demais SHALL ser `false` ou omitido

**Independent Test**: `listProblems().length === 27`; filtrar easy inclui `rate-limiter` e `pastebin`.

---

### P1: Rubrica Oculta para Juiz ⭐ MVP

**User Story**: Como sistema, quero rubricas por problema para julgamentos mais precisos.

**Acceptance Criteria**:

1. WHEN o juiz constrói prompt THEN SHALL incluir seção `Hidden rubric` com `expectedComponents`, `criticalPatterns`, `commonMistakes` do problema
2. WHEN rubrica não existe (legado) THEN prompt SHALL prosseguir sem seção rubric
3. WHEN jogador vê briefing/canvas THEN rubrica SHALL NOT ser exposta na UI

**Independent Test**: Prompt de `rate-limiter` contém "token bucket" ou componente esperado da rubrica.

---

### P1: Tela de Biblioteca ⭐ MVP

**User Story**: Como estudante, quero ver e filtrar problemas por dificuldade antes de jogar.

**Acceptance Criteria**:

1. WHEN jogador experiente ou biblioteca desbloqueada acessa app THEN SHALL ver tela de biblioteca antes do jogo
2. WHEN biblioteca é exibida THEN SHALL listar problemas com título, badge de nível (🟢/🟡/🔴), tags, tempo estimado (Study)
3. WHEN jogador clica filtro `easy`|`medium`|`hard`|`all` THEN lista SHALL atualizar client-side (< 200ms)
4. WHEN problema tem `isRecommended` THEN SHALL exibir badge "Recomendado"
5. WHEN jogador seleciona problema THEN SHALL escolher modo Study ou Speedrun e iniciar sessão naquele problema

**Independent Test**: Filtrar Hard → cards incluem `netflix-streaming` e `ticketmaster`.

---

### P2: Trilha e Progresso

**User Story**: Como iniciante, quero ver meu progresso e saber o que vem depois.

**Acceptance Criteria**:

1. WHEN biblioteca é exibida THEN SHALL mostrar contador por nível (ex: "2/7 Easy concluídos")
2. WHEN jogador completa problema com PARTIAL+ (score ≥ 70) em Study THEN SHALL marcar como concluído em `localStorage`
3. WHEN problema concluído THEN card SHALL exibir indicador visual de concluído
4. WHEN Hard selecionado sem nenhum Easy concluído THEN SHALL exibir aviso amigável (não bloqueante)
5. WHEN Speedrun Medium selecionado sem 2 Easy concluídos THEN SHALL exibir aviso (não bloqueante)

**Independent Test**: Completar URL Shortener com PARTIAL → contador Easy incrementa.

---

## Edge Cases

- WHEN `getProblem('unknown')` THEN retorna `undefined`; judge route retorna 400
- WHEN beginner em modo guiado THEN pula biblioteca até tutorial completar
- WHEN tutorial completa THEN `libraryUnlocked` = true e mensagem aponta para biblioteca

---

## Requirement Traceability

| Requirement ID | Story | Status |
| -------------- | ----- | ------ |
| PLIB-01 | P1: Catálogo 27 | Pending |
| PLIB-02 | P1: Rubrica juiz | Pending |
| PLIB-03 | P1: Tela biblioteca | Pending |
| PLIB-04 | P2: Trilha progresso | Pending |
| PLIB-05 | P2: Avisos nível | Pending |

**Coverage:** 5 total, 0 verified

---

## Success Criteria

- [ ] 27 problemas end-to-end (briefing → requisitos → canvas → judge)
- [ ] Filtros por nível funcionando
- [ ] CI verde sem regressões em ai-judge
