# System Design Quest — Project State

**Repo:** https://github.com/IEwerthonDev/system-design-quest  
**Branch strategy:** `main` = produção · `feature/*` = histórias em desenvolvimento  
**Workflow:** TLC Spec-Driven Development (Specify → Design → Tasks → Execute)

---

## Vision

Jogo educativo no browser para aprender System Design desenhando arquiteturas em canvas **blueprint 2D** (paridade System Design Playground). O jogador lê um problema real (YouTube, Netflix, Uber, Ticketmaster…), levanta requisitos funcionais e não-funcionais, monta a arquitetura com cards conectados por fluxo animado, configura replicas/hit rate/shards, simula tráfego, e recebe julgamento detalhado de IA — incluindo o que faltou, o que está errado, e como melhorar (com o porquê).

**Inspirações:**
- [System Design Playground](https://system-design-playground.replit.app/) — fluxo problema → canvas → juízes IA
- [Análise do Playground (newbie-friendly)](https://www.youtube.com/watch?v=nvZch2Z7eMM) — o que evitar para iniciantes
- [nj-mmo](../nj-mmo) — Three.js + Vite no browser, padrões de renderer e test hooks
- Vídeos Hayk Simonyan — vocabulário visual de componentes de system design

---

## Handoff

| Campo | Valor |
| ----- | ----- |
| **Fase atual** | Execute — Batch 1 (Phase 1 T1–T5) in progress via sub-agent |
| **Próximo passo** | Await Batch 1 summary → dispatch Batch 2 (T6–T10) |
| **Feature ativa** | `hobby-platform` |
| **Branch** | `feature/hobby-platform` |
| **Bloqueios** | Vercel KV/Blob/Edge/Cron env for durable path in prod |
| **Production URL** | https://system-design-quest.vercel.app |
| **Deployment** | `dpl_4jggm7UQ399uxbSAj7KhzoSsbRES` (Spiral Out / Hobby) — READY |
| **Mobile UX** | Phone ≤768: left drawer + COMPONENTS FAB; sim strip (Start + Speed/Traffic/R/W sliders); compact header card; tap-to-add; touch drag/pan |
| **Bugfix** | Confirm session upsert uses localStorage fallback on Hobby |
| **UI fix** | Voltar in session-header leading; Componentes palette minimizable |

### Deploy note (Hobby)

- **Serves:** Vite client `dist/client` + serverless `api/*.js` (judge, sessions, leaderboard, cron, optional export) via esbuild from `server/src/vercel/`
- **Sessions / leaderboard on Hobby:** Vercel KV primary (AD-025); client `localStorage` fallback when remote missing/fails; optional `VITE_SESSIONS_MODE=local`
- **Mobile:** tap-to-add when `(pointer: coarse)` or width ≤768; HTML5 DnD remains desktop path
- **Env:** `KV_*`, optional `BLOB_READ_WRITE_TOKEN`, `EDGE_CONFIG`, `CRON_SECRET`; optional `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL`; mock judge when key missing; `JUDGE_USE_MOCK=true` forces mock
- **Build:** esbuild api bundles then `client:build`; quality gate `nx run-many -t lint test`
- **Production:** https://system-design-quest.vercel.app

### AD-022 (superseded by AD-025)

Hobby preview = static Vite client + thin serverless `POST /api/judge` (not full Fastify). Hybrid LLM: real when `LLM_API_KEY` set, mock otherwise (including production). Design sessions persist via localStorage fallback on Hobby (AD-021 server store still used when Fastify `/api/sessions` is reachable).

### AD-023 (active)

Mobile web playability: phone layout uses left overlay drawer + COMPONENTS FAB (canvas-first, Playground-style); sim controls strip always shows Start, Speed, Traffic, and Reads vs Writes sliders; palette tap places nodes; canvas/nodes use `touch-action: none` for pan/drag; connection via out-handle + second tap; selected nodes expose delete control.

### AD-024 (active)

UI + problem copy + AI Judge narrative are bilingual (`en` \| `pt-BR`); preference persisted (`sdq-locale`); default `pt-BR`. Industry jargon stays English in both locales. Controls on problem library.

### AD-025 (active)

Hobby = static Vite client + thin serverless `api/*.js` (judge, sessions, leaderboard, cron, optional export). Hybrid LLM unchanged. Sessions + leaderboard on Vercel KV; `localStorage` fallback. Fastify + injectable stores for local/dev. Neon deferred unless KV cannot serve required queries.

---

## Decisions

| ID | Status | Decision | Rationale |
| -- | ------ | -------- | --------- |
| AD-001 | active | **Monorepo Nx** com `client/`, `server/`, `libs/shared/` | Separação clara entre canvas de sessão, API de julgamento e dados compartilhados |
| AD-002 | superseded by AD-018 | **Three.js vanilla** para o canvas 3D | Substituído por blueprint DOM+SVG (paridade Playground) |
| AD-003 | active | **UI em DOM vanilla** (painéis + agora o próprio canvas de sessão) | Consistente; canvas 2D é DOM/SVG |
| AD-004 | active | **Estado do diagrama serializável em JSON** (`ArchitectureGraph`) | Permite salvar, enviar ao juiz, replay e speedrun verification sem depender do WebGL |
| AD-005 | active | **Dois modos de jogo:** Study (sem timer) e Speedrun (com timer + ranking por categoria) | Requisito explícito do usuário; ranking só aceita soluções corretas |
| AD-006 | active | **Juiz dual-LLM** (rigor vs pragmatismo → consenso) | Inspirado no System Design Playground; feedback mais rico |
| AD-007 | active | **Requisitos como checklist editável + campos livres** antes do canvas | Força o jogador a praticar levantamento de requisitos, não só desenhar |
| AD-008 | superseded by AD-018 | **Conexões com fluxo animado** via `TubeGeometry` shader | Substituído por SVG paths + packet animation CSS/JS |
| AD-009 | superseded by AD-018 | **Catálogo 3D GLB** no canvas de sessão | Sessão usa ícones 2D; GLB/`component-lab` orphan ok |
| AD-010 | active | **Testes:** lógica em unit (Vitest), canvas via `window.__GAME_STATE__` hook | Sem WebGL; assert grafo + estado de interação |
| AD-011 | superseded by AD-024 | **Idioma UI: PT-BR** com termos técnicos em inglês quando padrão da indústria | Usuário brasileiro; termos como "Load Balancer" permanecem em inglês |
| AD-012 | active | **Branch `main` = produção**; features em `feature/<story-slug>` | Fluxo Git solicitado pelo usuário |
| AD-013 | active | **Newbie-friendly é pilar de produto**, não polish | Feedback do [vídeo nvZch2Z7eMM](https://www.youtube.com/watch?v=nvZch2Z7eMM): iniciantes travam no canvas; tutorial + Modo Guiado desde o MVP |
| AD-014 | active | **URL Shortener = primeiro problema (tutorial guiado)**; YouTube = Medium na biblioteca | Progressão Easy → Medium → Hard |
| AD-015 | active | **Três níveis de dificuldade:** `easy`, `medium`, `hard` com filtros, badges e trilha recomendada | Biblioteca curada em `docs/PROBLEM-LIBRARY.md` (27 problemas no launch) |
| AD-016 | active | **Critério de score e veredito** — verdeto `PASS` se score ≥ 80 e zero blockers críticos; `PARTIAL` se score ≥ 70 e zero blockers; `FAIL` caso contrário. Ranking speedrun aceita apenas `PASS` ou `PARTIAL` com score ≥ 70 e zero blockers. Canvas vazio = FAIL local sem LLM | Unifica product spec, judge prompts e leaderboard; decisão tomada antes da Fase 2 |
| AD-017 | active | **Tiers de componentes:** Tier 1 = 15 tipos (MVP 1a, canvas jogável); Tier 2 = 25 tipos (MVP 1c, meta do canvas); Tier 3 = 36 tipos (catálogo completo, Fase 3); Tier 4 = GLB assets (Fase 5 polish) | Alinha goal "≥25" com roadmap; evita bloquear 1a por catálogo completo |
| AD-018 | active | **Canvas de sessão = DOM node cards + SVG edges** sobre grid CSS blueprint; pan/zoom no world container | Paridade System Design Playground; supersede AD-002/008/009 no path de jogo |
| AD-019 | active | **`ArchitectureGraph` inclui** `replicas`, `config` tipado (cache/cdn/sql), `implementationNotes`, `simulation` global; juiz recebe no prompt | Configuração e notes fazem parte do artefato julgado |
| AD-020 | active | **Simulação determinística client-side**; Start on/off; Speed só animação; Traffic + R/W + reps/configs → pressão `ok\|warn\|hot` | Pedagógico sem rede; testável em Vitest |
| AD-021 | active | **Design sessions** persistem via Fastify `/api/sessions` + `SessionStore` (JSON file em prod, in-memory em testes); auth surrogate = nickname; status `approved\|rejected\|partial\|in_progress`; cap 50/nickname | Playground-parity dashboard; reusa padrão DI do leaderboard |
| AD-022 | superseded by AD-025 | **Hobby preview** = Vite static + serverless `POST /api/judge` (esbuild CJS); hybrid LLM (key → real, else mock incl. production); sessions on Hobby via client `localStorage` fallback when `/api/sessions` missing; leaderboard still deferred | Unblocks AI judge + approved-session history on free preview without Fastify/durable DB |
| AD-023 | active | **Mobile web canvas** = phone bottom dock + tap-to-add; `touch-action: none` drag/pan; arm+tap (or drag) connect; delete control on selected nodes | HTML5 DnD fails on touch; thumb-zone / 44px targets from mobile-app-ui-design + mobile-touch |
| AD-024 | active | **Bilingual EN/PT-BR** — UI + problem copy + Judge narrative; `sdq-locale`; default `pt-BR`; jargon stays English; library locale buttons | Supersedes AD-011; user request full-system locale including AI Judge |
| AD-025 | active | **Hobby durable platform** — thin `api/*.js` (judge/sessions/leaderboard/cron/export); KV for sessions+leaderboard; localStorage fallback; Fastify+DI for local; Neon deferred | Supersedes AD-022; KV-first Hobby ROI without full Fastify on Vercel |

---

## Phased Roadmap (summary)

| Fase | Feature slug | Entrega |
| ---- | ------------ | ------- |
| 0 | `foundation` | Monorepo, CI, canvas vazio, spec infra |
| 1 | `mvp-canvas` | Canvas + tutorial (1a/1b/1c) |
| 2 | `ai-judge` | Julgamento dual-LLM + feedback detalhado |
| 3 | `problem-library` | 27 problemas (7 Easy, 10 Medium, 10 Hard) |
| 4 | `speedrun` | Timer, categorias, leaderboard | ✅ Done |
| 5 | `polish` | UX, tutoriais, partículas, sons |
| — | `canvas-graph-dnd` | Grafo Obsidian-style + luz direcional | ✅ Verify PASS |
| — | `blueprint-2d-canvas` | Canvas 2D Playground + sim + configs | ✅ Merged (`4b8c87a`) |
| — | `playground-parity` | Sim labels + judge sidebar + session history | ✅ Verify PASS (+ Voltar hotfix) |
| — | `connection-intent` | Edge label pill + CONNECTION INTENT menu | ✅ Tasks approved → Execute |

Detalhes em `docs/ROADMAP.md`.
