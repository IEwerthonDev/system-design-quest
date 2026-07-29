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
| **Fase atual** | `chaos-lab` merged + production |
| **Próximo passo** | Pick next roadmap feature (post–chaos-lab) |
| **Feature ativa** | (none — chaos-lab shipped) |
| **Branch** | `main` |
| **Bloqueios** | None |
| **Decisões** | AD-031·032·033·034·035·036·**037** |
| **Gate** | `nx run-many -t lint test --skip-nx-cache` green (shared 175 · server 153 · client 445) |
| **Verify** | PASS — `.specs/features/chaos-lab/validation.md` |
| **PR** | [#9](https://github.com/IEwerthonDev/system-design-quest/pull/9) squash-merged |
| **Production URL** | https://system-design-quest.vercel.app |
| **Deploy** | `dpl_7cUm91WHq47Sme4xuTuZ3X1P1znh` READY · sha `e6bf195` |

### Context Checkpoint (2026-07-29 chaos-lab ship)

| Sinal | Status |
| ----- | ------ |
| Chat length | GREEN — smoke + PR + merge + deploy |
| Uncommitted | STATE handoff only |
| Spec drift | GREEN — AD-037 on main |
| Gate confidence | GREEN — Verify PASS + browser smoke FAILED |
| Task clarity | GREEN — feature shipped |

**Veredito:** GREEN

**Smoke:** Modo Estudo → App Server + SQL → Quick Chaos Instance Crash → `__GAME_STATE__.resilienceReport[0].verdict === FAILED`

**Prompt para nova sessão:**
```
Branch main. chaos-lab shipped (PR #9, prod dpl_7cUm91WHq47Sme4xuTuZ3X1P1znh).
Read .specs/STATE.md Handoff + docs/ROADMAP.md for next feature.
```


### Deploy note (Hobby)

- **Serves:** Vite client `dist/client` + serverless `api/*.js` (judge, sessions, leaderboard, cron, auth, **mentor**) via esbuild from `server/src/vercel/`
- **New API routes:** run `bash scripts/vercel-build.sh` (or at least esbuild the new entry) before `vercel deploy` so `api/<name>.js` exists locally — Vercel registers lambdas from the uploaded `api/` set
- **Sessions / leaderboard on Hobby:** Vercel KV primary (AD-025); client `localStorage` fallback when remote missing/fails; optional `VITE_SESSIONS_MODE=local`
- **Mobile:** tap-to-add when `(pointer: coarse)` or width ≤768; HTML5 DnD remains desktop path
- **Env:** Documented in `.env.example` — `KV_*`, optional `BLOB_READ_WRITE_TOKEN`, `EDGE_CONFIG` / `VITE_EDGE_CONFIG`, `CRON_SECRET`; optional `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL`; mock judge/mentor when key missing; `JUDGE_USE_MOCK=true` forces mock
- **Build:** esbuild api bundles (judge/sessions/leaderboard/cron/auth/mentor) then `client:build`; quality gate `nx run-many -t lint test`
- **Production:** https://system-design-quest.vercel.app
- **Cron:** `vercel.json` schedules `GET/POST /api/cron` daily (`0 6 * * *`); auth via `Authorization: Bearer CRON_SECRET`

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
| AD-019 | active (extended by AD-028) | **`ArchitectureGraph` inclui** `replicas`, `config` tipado, `implementationNotes`, `simulation` global; juiz recebe no prompt | Configuração e notes fazem parte do artefato julgado; AD-028 amplia kinds scale-critical |
| AD-020 | active | **Simulação determinística client-side**; Start on/off; Speed só animação; Traffic + R/W + reps/configs → pressão `ok\|warn\|hot` | Pedagógico sem rede; testável em Vitest |
| AD-021 | superseded by AD-026 (Hobby durable) | **Design sessions** persistem via Fastify `/api/sessions` + `SessionStore` (JSON file em prod, in-memory em testes); auth surrogate = nickname; status `approved\|rejected\|partial\|in_progress`; cap 50/nickname | Playground-parity dashboard; reusa padrão DI do leaderboard |
| AD-022 | superseded by AD-025 | **Hobby preview** = Vite static + serverless `POST /api/judge` (esbuild CJS); hybrid LLM (key → real, else mock incl. production); sessions on Hobby via client `localStorage` fallback when `/api/sessions` missing; leaderboard still deferred | Unblocks AI judge + approved-session history on free preview without Fastify/durable DB |
| AD-023 | active | **Mobile web canvas** = phone bottom dock + tap-to-add; `touch-action: none` drag/pan; arm+tap (or drag) connect; delete control on selected nodes | HTML5 DnD fails on touch; thumb-zone / 44px targets from mobile-app-ui-design + mobile-touch |
| AD-024 | active | **Bilingual EN/PT-BR** — UI + problem copy + Judge narrative; `sdq-locale`; default `pt-BR`; jargon stays English; library locale buttons | Supersedes AD-011; user request full-system locale including AI Judge |
| AD-025 | active | **Hobby durable platform** — thin `api/*.js` (judge/sessions/leaderboard/cron/export); KV for sessions+leaderboard; localStorage fallback; Fastify+DI for local; Neon deferred | Supersedes AD-022; KV-first Hobby ROI without full Fastify on Vercel |
| AD-026 | active | **Google OAuth identity** — guest play OK; durable sessions + leaderboard POST require Google session cookie + unique public nickname; nickname-alone is no longer ownership on Hobby APIs | User chose real OAuth over nickname surrogate; supersedes AD-021 auth surrogate for Hobby durable path |
| AD-027 | active | **Judge structural-first (hybrid)** — deterministic per-problem structural rubric always runs before LLM; LLM cannot clear structural blockers; no cross-problem URL-shortener golden mock; Baseline 27 + Deep Core 13 | judge-realism Approach A; trustworthy learning bar |
| AD-028 | active | **Scale-critical `ComponentConfig`** — cache, CDN(+TTL), SQL, MQ durability/partitions, WS fan-out, LB algorithm; configs affect simulation pressure and structural judge rules | Extends AD-019; judge-realism 2A/7B |
| AD-029 | active | **DB access + topology roles** — `accessPattern` read\|write\|read_write and `topologyRole` primary\|replica\|standalone on sql_db + nosql_db; canvas badge + judge JSON; `sdq:localechange` refreshes canvas/config/palette chrome | Player CQRS intent + AD-024 full-system locale |
| AD-030 | active | **Config depth + detailBonus** — expanded ComponentConfig (rate limiter, gateway, object storage, search, auth, compute, worker, notification; deepen cache/SQL/NoSQL/MQ; kafka kind); Advanced toggle; structural detailBonus ≤15 when no blockers; LLM prompts reward trade-off detail | Extends AD-028/029; config-depth 1B·2B·3B·4A |
| AD-031 | active | **Sim v2** — absolute workload fields on `SimulationSettings`; path-aware RPS mode when absolute set; traffic 1–5 back-compat; edge intent weights; topology findings via `analyzeTopology` | Extends AD-020; study-mode realism |
| AD-032 | active | **Sandbox Study Mode** — `GameMode` += `sandbox`; `__sandbox__` sentinel problem; library CTA; skip briefing/requirements; Practice rename for problem `study` | Freeform lab; AD-005 extended |
| AD-033 | active | **On-demand mentor** — `POST /api/mentor` with actions evaluate/hint/bottlenecks/improve/missing; mock from findings; sandbox-only chrome | Cost-controlled AI mentor |
| AD-034 | active | **Link validity + sim realism** — `assessConnectionPair` ok/warn/invalid; live preview colors; invalid blocked; warn yellow edges; findings always-on; async MQ write relief; primary write concentration; `QUEUE_BACKLOG` + `HOT_PARTITION` | Pedagogue canvas + interview-realistic bottlenecks without discrete-event sim |
| AD-035 | active | **Sandbox Workload + Mentor FAB/drawer** — both panels collapsed by default on all viewports; FAB chip opens; collapse button + backdrop/outside click closes; opening one closes the other; Componentes palette stays independent (AD-023) | Canvas-first Study Mode; mirrors Componentes phone FAB pattern on desktop too |
| AD-036 | active | **Cobertura de requisitos derivada do grafo** — `analyzeRequirementCoverage` classifica cada requisito em capabilities (write/read path, uniqueness, latency, throughput, availability, …) e avalia contra grafo + configs; LLM só pode **rebaixar** status (match por texto normalizado), nunca inventar `covered`; caminho estrutural usa o mesmo engine; itens de feedback string do LLM são coeridos para `FeedbackItem` sem `capability` | Tabela de cobertura era sempre `missing` no caminho LLM (match exato de string) e sempre `covered` no estrutural; AD-027 structural-first estendido ao relatório de requisitos |
| AD-037 | active | **Chaos Lab efêmero** — Quick Chaos + Live Metrics + Resilience Report em Sandbox/Practice only (não Speedrun); uma falha ativa por vez; probes isolados vs baseline; estado em `__GAME_STATE__` apenas (nunca em `ArchitectureGraph`/sessions/judge payload); mobile FAB/drawer + exclusão mútua com Workload/Mentor | Playground parity without discrete-event sim; ranking fairness; AD-020/031/034 preserved |

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
| — | `chaos-lab` | Quick Chaos + Live Metrics + Resilience Report (AD-037) |
| — | `canvas-graph-dnd` | Grafo Obsidian-style + luz direcional | ✅ Verify PASS |
| — | `blueprint-2d-canvas` | Canvas 2D Playground + sim + configs | ✅ Merged (`4b8c87a`) |
| — | `playground-parity` | Sim labels + judge sidebar + session history | ✅ Verify PASS (+ Voltar hotfix) |
| — | `connection-intent` | Edge label pill + CONNECTION INTENT menu | ✅ Tasks approved → Execute |

Detalhes em `docs/ROADMAP.md`.
