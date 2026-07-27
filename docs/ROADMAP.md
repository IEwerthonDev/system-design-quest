# System Design Quest — Roadmap

Fases ordenadas para desenvolvimento spec-driven. Cada fase = uma branch `feature/<slug>` mergeada em `main` após verificação.

---

## Fase 0 — Foundation (`feature/foundation`)

**Objetivo:** Monorepo funcional com canvas vazio e infra de specs.

| Entrega | Req IDs |
| ------- | ------- |
| Nx monorepo: `client/`, `server/`, `libs/shared/` | — |
| Vite dev server com canvas Three.js (grid + câmera isométrica) | PROD-03 (parcial) |
| `libs/shared` com tipos base (`ArchitectureGraph`, `ComponentType`) | PROD-03 |
| Fastify server com health check | — |
| Vitest configurado (client + server + shared) | AD-010 |
| `window.__GAME_STATE__` test hook | AD-010 |
| CI: lint + test no GitHub Actions | — |
| `.specs/` + `AGENTS.md` + `README.md` | — |

**Critério de done:** `npm run dev` abre canvas 3D vazio; `npm test` passa; CI verde.

---

## Fase 1 — MVP Canvas (`feature/mvp-canvas`)

**Objetivo:** Loop jogável com tutorial guiado (URL Shortener) + experiência newbie-friendly.  
**Tasks:** `.specs/features/mvp-canvas/tasks.md` (22 tasks em 3 sub-fases).

> **MVP pedagógico completo** (com feedback IA) = Fase 1 + Fase 2. Fase 1 sozinha entrega submit com validação local.

### Sub-fase 1a — Canvas jogável (T1–T8)

| Entrega | Req IDs |
| ------- | ------- |
| Paleta com **15 componentes** 3D primitivos (AD-017 Tier 1) | PROD-03 |
| Drag & drop + seleção + delete + label/nota | PROD-03 |
| Conexões com setas e animação de fluxo | PROD-04 |
| Serialização `ArchitectureGraph` JSON | PROD-03 |
| Botão Submeter → validação local (não-vazio) | PROD-03, AD-016 |

**Marco testável:** montar grafo 3D e submeter (sem briefing/requisitos ainda).

### Sub-fase 1b — Fluxo de fases (T9–T14)

| Entrega | Req IDs |
| ------- | ------- |
| Problema URL Shortener com briefing | PROD-01 |
| UI de requisitos (FR/NFR editáveis) | PROD-02 |
| Requisitos assistidos (sugestões clicáveis) | PROD-15 |
| Navegação briefing → requisitos → canvas | PROD-01, PROD-02 |

**Marco testável:** fluxo URL Shortener end-to-end até submit local.

### Sub-fase 1c — Newbie-friendly (T15–T22)

| Entrega | Req IDs |
| ------- | ------- |
| Onboarding 3 telas (iniciante vs experiente) | PROD-11 |
| Modo Guiado com highlights passo a passo | PROD-12 |
| Tooltips em componentes + glossário de métricas (`?`) | PROD-13, PROD-14 |
| Glossário (atalho G) | PROD-13 |
| Expandir paleta para **25 componentes** (AD-017 Tier 2) | PROD-03 |
| `component-lab.html` para iterar ícones | AD-009 |
| Painel de dicas contextuais (stretch) | PROD-16 |

**Critério de done (Fase 1):** Iniciante completa onboarding → tutorial URL Shortener guiado → submit com validação local; paleta com 25 tipos.

---

## Fase 2 — AI Judge (`feature/ai-judge`)

**Objetivo:** Julgamento dual-LLM com feedback estruturado.

| Entrega | Req IDs |
| ------- | ------- |
| `POST /api/judge` endpoint | PROD-05 |
| Dual-judge orchestration (rigor + pragmatismo → consenso) | PROD-05 |
| UI de resultado com seções: veredito, forças, problemas, melhorias | PROD-05 |
| **Feedback em camadas** (resumo simples + detalhes expandíveis) | PROD-17 |
| Cobertura de requisitos declarados pelo jogador | PROD-06 |
| Loading state com progresso do debate | PROD-05 |
| Golden test submissions (3 designs: bom, médio, ruim) | PROD-05 |
| Rate limiting básico | — |

**Critério de done:** Submit de design ruim → FAIL com explicação; design bom → PASS com melhorias.

---

## Fase 3 — Problem Library (`feature/problem-library`)

**Objetivo:** 27 problemas em 3 níveis (7 Easy · 10 Medium · 10 Hard). Ver `docs/PROBLEM-LIBRARY.md`.

### 🟢 Easy (7)

URL Shortener · Rate Limiter · Pastebin · Unique ID Gen · Distributed Cache · Notification System · Key-Value Store

### 🟡 Medium (10)

Chat · News Feed · Search Autocomplete · Instagram · Google Drive · Yelp Nearby · Hotel Booking · **YouTube** · **Uber** · TikTok

### 🔴 Hard (10)

**Netflix** · **Ticketmaster** · Google Maps · Google Docs · Stripe Payments · Zoom · DoorDash · Distributed Kafka · S3 Storage · Distributed Lock

| Entrega | Req IDs |
| ------- | ------- |
| Tela de biblioteca com filtros por nível + tags | PROD-09, PROD-19 |
| Badges 🟢🟡🔴 e contador de progresso por nível | PROD-19 |
| Trilha de progressão recomendada | PROD-18 |
| 27 briefings + rubricas ocultas para juiz | PROD-09 |
| Home screen com seleção de problema | PROD-01 |

**Critério de done:** 27 problemas jogáveis end-to-end com julgamento IA; filtros por nível funcionando.

---

## Fase 4 — Speedrun (`feature/speedrun`)

**Objetivo:** Modo competitivo com ranking.

| Entrega | Req IDs |
| ------- | ------- |
| Seleção de modo Study vs Speedrun na home | PROD-07 |
| Cronômetro visível no speedrun | PROD-07 |
| `POST /api/leaderboard` + `GET /api/leaderboard/:problemId` | PROD-08 |
| Tela de ranking por categoria | PROD-08 |
| Rejeição de FAIL no ranking | PROD-07, PROD-08, AD-016 |
| Nickname anônimo ou GitHub OAuth | Assumption |

**Critério de done:** Speedrun com design correto aparece no ranking; design incorreto não.

---

## Fase 5 — Polish (`feature/polish`)

**Objetivo:** Refinamento visual e pedagógico.

| Entrega | Req IDs |
| ------- | ------- |
| Substituir primitivos por GLB icons (CC0) — catálogo completo 36 tipos | AD-009, AD-017 Tier 4 |
| Opção "Refazer tutorial" em configurações | PROD-10 |
| Sons sutis (place, connect, submit) | — |
| Responsive layout (tablet) | — |
| Export PNG do diagrama | Deferred |
| Fallback 2D sem WebGL | Edge case |

---

## Git Workflow

```
main (produção)
  └── feature/foundation     → merge após verify
  └── feature/mvp-canvas     → merge após verify
  └── feature/ai-judge       → merge após verify
  └── feature/problem-library
  └── feature/speedrun
  └── feature/polish
```

Cada feature segue: **Specify → Design → Tasks → Execute → Verify** (TLC spec-driven).

---

## Estimativa de Esforço (ordem de grandeza)

| Fase | Tasks estimadas | Sessões (~7 tasks) | Complexidade |
| ---- | --------------- | ------------------ | ------------ |
| 0 Foundation | 8 | 1 | Medium |
| 1a Canvas jogável | 8 | 1–2 | Medium |
| 1b Fluxo de fases | 6 | 1 | Medium |
| 1c Newbie-friendly | 8 | 1–2 | Large |
| 2 AI Judge | ~10 | 2 | Large |
| 3 Problem Library | ~16 | 2–3 | Large |
| 4 Speedrun | ~6 | 1 | Medium |
| 5 Polish | ~8 | 1–2 | Medium |

**Total:** ~70 tasks atômicas · **~10–12 sessões** para produto completo · **~5–6 sessões** para loop pedagógico (foundation + mvp-canvas + ai-judge).
