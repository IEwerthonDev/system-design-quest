# Speedrun Specification

## Problem Statement

Jogadores competitivos precisam de um modo com cronômetro e ranking por problema para comparar tempos — mas só quando o design passa no julgamento (AD-016). Study permanece sem pressão de tempo.

## Goals

- [ ] Cronômetro visível em modo Speedrun (briefing → submit)
- [ ] Ranking por `problemId` com top 50, ordenado por tempo ASC
- [ ] Rejeitar FAIL e submissões abaixo de 70 no ranking
- [ ] Nickname anônimo persistido em `localStorage`

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| GitHub OAuth | Fase 4 usa nickname anônimo; OAuth opcional depois |
| Drizzle/Postgres | MVP com store in-memory + JSON file no server |
| Timer em Study | PROD-07 AC1 |
| Ranking global cross-problema | Apenas por categoria (`problemId`) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Persistência leaderboard | In-memory + optional JSON file (`LEADERBOARD_FILE`) | Testável, sem DB setup; alinha `.env.example` defer | y |
| Nickname | 3–20 chars, `[a-zA-Z0-9_-]`, default gerado | PROD design; sem auth | y |
| Timer start | `createSession` (entrada no briefing) | PROD-07 AC2 | y |
| Timer stop | Ao clicar submit (antes do judge) | PROD-07 AC2 | y |
| Desempate | Menor tempo; empate → score maior | PROD-08 AC3 | y |
| Auth GitHub | N/A esta fase | Out of scope | y |

**Open questions:** none.

---

## User Stories

### P1: Modo Speedrun com Timer ⭐ MVP

**User Story**: Como jogador competitivo, quero ver um cronômetro durante o speedrun para medir meu tempo.

**Why P1**: Core do modo speedrun.

**Acceptance Criteria**:

1. WHEN modo Study THEN system SHALL ocultar timer e não registrar tempo no ranking
2. WHEN modo Speedrun e sessão inicia no briefing THEN system SHALL iniciar cronômetro
3. WHEN jogador submete design em Speedrun THEN system SHALL parar cronômetro e expor `elapsedMs` via `__GAME_STATE__`
4. WHEN Study THEN `elapsedMs` SHALL ser null/undefined no game state

**Independent Test**: Speedrun session → timer visible → submit → elapsedMs > 0; Study → no timer element.

---

### P1: Ranking por Problema ⭐ MVP

**User Story**: Como jogador, quero ver leaderboard por problema após speedrun válido.

**Acceptance Criteria**:

1. WHEN GET `/api/leaderboard/:problemId` THEN system SHALL retornar até 50 entradas ordenadas por `elapsedMs` ASC
2. WHEN POST `/api/leaderboard` com veredito PASS ou PARTIAL (score ≥ 70) THEN system SHALL persistir entrada
3. WHEN POST com FAIL ou score < 70 THEN system SHALL retornar 422 e não persistir
4. WHEN dois tempos iguais THEN system SHALL desempatar por score DESC
5. WHEN entrada persistida THEN system SHALL incluir `problemId`, `playerNickname`, `elapsedMs`, `score`, `verdict`, `createdAt`

**Independent Test**: POST FAIL → 422, GET vazio; POST PASS → GET lista entrada.

---

### P2: Nickname Anônimo

**User Story**: Como jogador, quero um nickname para aparecer no ranking sem criar conta.

**Acceptance Criteria**:

1. WHEN primeiro speedrun THEN system SHALL solicitar ou gerar nickname
2. WHEN nickname salvo THEN system SHALL reutilizar em submissões futuras
3. WHEN nickname inválido (<3 ou >20 chars, chars proibidos) THEN system SHALL rejeitar POST com 400

**Independent Test**: Save nickname → POST includes it; invalid → 400.

---

## Edge Cases

- WHEN canvas vazio / FAIL local THEN system SHALL NOT POST leaderboard (client-side guard)
- WHEN POST duplicado mesmo nickname+problema+tempo THEN system SHALL aceitar (múltiplas tentativas válidas)
- WHEN problemId desconhecido THEN GET/POST SHALL retornar 400

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| SPD-01 | P1: Timer Study oculto | Execute | Pending |
| SPD-02 | P1: Timer Speedrun start/stop | Execute | Pending |
| SPD-03 | P1: elapsedMs no game state | Execute | Pending |
| SPD-04 | P1: Ranking GET top 50 | Execute | Pending |
| SPD-05 | P1: Ranking POST qualificação AD-016 | Execute | Pending |
| SPD-06 | P1: Desempate por score | Execute | Pending |
| SPD-07 | P2: Nickname persistido | Execute | Pending |
| SPD-08 | P2: Validação nickname | Execute | Pending |

**Coverage:** 8 total, 0 mapped → 8 pending

---

## Success Criteria

- [ ] Speedrun FAIL nunca aparece no ranking (testes automatizados)
- [ ] Timer determinístico em testes (clock injetável)
- [ ] Gate `npx nx run-many -t lint test` verde
