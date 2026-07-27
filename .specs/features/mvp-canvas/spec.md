# MVP Canvas — Specification

**Parent:** `.specs/features/product/spec.md`  
**Design:** `.specs/features/product/design.md` (confirmed)  
**Branch:** `feature/mvp-canvas`  
**Depends on:** `foundation` (Fase 0) merged

---

## Problem Statement

Após o scaffold (canvas vazio + tipos), precisamos de um loop jogável no browser: o jogador lê um briefing, levanta requisitos, monta arquitetura 3D e submete — com validação local. A experiência newbie-friendly (onboarding, tutorial guiado, tooltips) fecha o diferencial pedagógico **antes** do juiz IA (Fase 2).

## Goals

- [ ] Jogador monta grafo 3D com ≥15 componentes e submete (marco **1a**)
- [ ] Jogador percorre briefing → requisitos → canvas no URL Shortener (marco **1b**)
- [ ] Iniciante completa onboarding + tutorial guiado + submit (marco **1c**)
- [ ] Paleta com **25 tipos** ao final da feature (AD-017 Tier 2)
- [ ] `npm test` passa via `window.__GAME_STATE__` — sem depender de WebGL

## Out of Scope (esta feature)

| Item | Fase |
| ---- | ---- |
| Julgamento IA (`POST /api/judge`) | `ai-judge` (Fase 2) |
| Biblioteca com 27 problemas | `problem-library` (Fase 3) |
| Speedrun / ranking | `speedrun` (Fase 4) |
| GLB icons (substituir primitivos) | `polish` (Fase 5) |

> **MVP pedagógico completo** (feedback IA) = `mvp-canvas` + `ai-judge`. Esta feature entrega o loop até submit com validação local.

---

## Sub-phases (marcos testáveis)

| Marco | Branch tag | Entrega testável | Req IDs |
| ----- | ---------- | ---------------- | ------- |
| **1a** | após T8 | Canvas jogável: paleta 15 tipos, drag, conexões animadas, submit local | PROD-03, PROD-04 |
| **1b** | após T14 | Fluxo de fases: briefing URL Shortener → requisitos → canvas → submit | PROD-01, PROD-02, PROD-15 |
| **1c** | após T22 | Newbie-friendly: onboarding, modo guiado, tooltips, glossário, 25 tipos | PROD-11, PROD-12, PROD-13, PROD-14, PROD-16 |

---

## User Stories (scoped)

Stories herdadas do product spec — apenas o escopo desta feature:

### P1: Canvas 3D de Arquitetura (1a)

Ver ACs em `product/spec.md` — Canvas 3D. Componentes Tier 1 (15) na paleta.

### P1: Briefing + Requisitos (1b)

Ver ACs — Briefing do Problema, Levantamento de Requisitos, Requisitos Assistidos.

### P1: Newbie Experience (1c)

Ver ACs — Onboarding, Modo Guiado, Tooltips e Glossário.

### P2: Dicas Contextuais (1c, stretch)

Ver ACs — Dicas no canvas (PROD-16). Implementar se sobrar capacidade na 1c; não bloqueia merge.

---

## Edge Cases (esta feature)

- Canvas vazio no submit → FAIL local imediato (sem LLM) — AD-016
- Requisitos vazios → aviso, mas permite avançar (modo study)
- Modo guiado: hints não bloqueiam ações do jogador

---

## Requirement Traceability

| ID | Story | Sub-phase | Tasks | Status |
| -- | ----- | --------- | ----- | ------ |
| PROD-01 | Briefing | 1b | T9, T10, T12 | Pending |
| PROD-02 | Requisitos | 1b | T11, T12, T14 | Pending |
| PROD-03 | Canvas 3D | 1a, 1c | T1–T5, T8, T20 | Pending |
| PROD-04 | Conexões animadas | 1a | T6, T7 | Pending |
| PROD-11 | Onboarding | 1c | T15 | Pending |
| PROD-12 | Modo Guiado | 1c | T16 | Pending |
| PROD-13 | Tooltips/glossário | 1c | T17, T19 | Pending |
| PROD-14 | Métricas explicadas | 1c | T18 | Pending |
| PROD-15 | Requisitos assistidos | 1b | T13 | Pending |
| PROD-16 | Dicas no canvas | 1c | T22 (stretch) | Pending |

**Coverage:** 10 requirements in scope, 22 tasks mapped, 0 done.
