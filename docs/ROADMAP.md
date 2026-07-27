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

| Entrega | Req IDs |
| ------- | ------- |
| Onboarding 3 telas (iniciante vs experiente) | PROD-11 |
| Problema URL Shortener com briefing + tutorial guiado | PROD-12, PROD-01 |
| Modo Guiado com highlights passo a passo | PROD-12 |
| Tooltips em componentes + glossário de métricas (`?`) | PROD-13, PROD-14 |
| Requisitos assistidos (sugestões clicáveis) | PROD-15 |
| UI de briefing + navegação de fases | PROD-01 |
| UI de requisitos (FR/NFR editáveis) | PROD-02 |
| Paleta com ≥ 15 componentes 3D (primitivos) | PROD-03 |
| Drag & drop + seleção + delete | PROD-03 |
| Conexões com setas e animação de fluxo | PROD-04 |
| Painel de dicas contextuais (Modo Study) | PROD-16 |
| Serialização `ArchitectureGraph` JSON | PROD-03 |
| Botão Submeter → validação local (não-vazio) | PROD-03 |
| `component-lab.html` para iterar ícones | AD-009 |

**Critério de done:** Iniciante completa onboarding → tutorial URL Shortener guiado → submit com validação local.

---

## Fase 1b — YouTube Hard (`feature/mvp-youtube`)

**Objetivo:** Segundo problema (pedido original do usuário) após tutorial.

| Entrega | Req IDs |
| ------- | ------- |
| Problema YouTube Upload/Stream/Likes com briefing completo | PROD-01 |
| Briefing com links contextuais para conceitos (CDN, transcoding) | PROD-14 |

**Critério de done:** Jogador que completou tutorial consegue iniciar problema YouTube em Modo Livre.

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

**Objetivo:** Expandir para 8+ problemas reais.

| Problema | Dificuldade | Tags |
| -------- | ----------- | ---- |
| YouTube Upload/Stream/Social | Hard | CDN, transcoding, fan-out |
| Netflix Video Streaming | Hard | ABR, CDN, encoding |
| Uber Nearby Drivers | Hard | geospatial, geohash, 1M RPS |
| Ticketmaster Peak Ticketing | Hard | queues, inventory, consistency |
| URL Shortener | Easy | hashing, caching, KV |
| News Feed | Medium | fan-out, ranking, redis |
| Rate Limiter | Medium | token-bucket, distributed |
| Chat System | Medium | websockets, sharding, presence |

| Entrega | Req IDs |
| ------- | ------- |
| Tela de biblioteca com filtros | PROD-09 |
| **Trilha de progressão** com ordem recomendada e badges | PROD-18 |
| Cada problema com briefing + rubrica oculta para juiz | PROD-09 |
| Home screen com seleção de problema | PROD-01 |

**Critério de done:** 8 problemas jogáveis end-to-end com julgamento IA.

---

## Fase 4 — Speedrun (`feature/speedrun`)

**Objetivo:** Modo competitivo com ranking.

| Entrega | Req IDs |
| ------- | ------- |
| Seleção de modo Study vs Speedrun na home | PROD-07 |
| Cronômetro visível no speedrun | PROD-07 |
| `POST /api/leaderboard` + `GET /api/leaderboard/:problemId` | PROD-08 |
| Tela de ranking por categoria | PROD-08 |
| Rejeição de FAIL no ranking | PROD-07, PROD-08 |
| Nickname anônimo ou GitHub OAuth | Assumption |

**Critério de done:** Speedrun com design correto aparece no ranking; design incorreto não.

---

## Fase 5 — Polish (`feature/polish`)

**Objetivo:** Refinamento visual e pedagógico.

| Entrega | Req IDs |
| ------- | ------- |
| Substituir primitivos por GLB icons (CC0) | AD-009 |
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

| Fase | Tasks estimadas | Complexidade |
| ---- | --------------- | ------------ |
| 0 Foundation | ~8 | Medium |
| 1 MVP Canvas | ~20 | Large |
| 1b YouTube | ~4 | Medium |
| 2 AI Judge | ~10 | Large |
| 3 Problem Library | ~8 | Medium |
| 4 Speedrun | ~6 | Medium |
| 5 Polish | ~8 | Medium |

**Total:** ~64 tasks atômicas.
