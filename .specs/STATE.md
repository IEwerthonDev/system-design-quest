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
| **Fase atual** | `blueprint-2d-canvas` Execute done — gate lint+test PASS |
| **Próximo passo** | Hard refresh localhost:4200; UAT URL Shortener no blueprint; merge após Verify |
| **Feature ativa** | `blueprint-2d-canvas` |
| **Branch** | `feature/blueprint-2d-canvas` |
| **Bloqueios** | Nenhum |
| **Artefatos** | `client/src/blueprint/*`, sim controls, AD-018..020 |

### Context Checkpoint (2026-07-27 — blueprint execute)

| Sinal | Status |
| ----- | ------ |
| Gate | `npx nx run-many -t lint test` PASS |
| Sim | 1B pressure engine |
| UI | 2D blueprint + popover + header |

**Veredito:** **GREEN**

**Prompt para nova sessão:**
```
Branch feature/blueprint-2d-canvas. Blueprint 2D + sim + configs committed.
Read .specs/STATE.md Handoff. Run Verifier if needed, then merge to main after UAT.
Gate: npx nx run-many -t lint test
```

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
| AD-011 | active | **Idioma UI: PT-BR** com termos técnicos em inglês quando padrão da indústria | Usuário brasileiro; termos como "Load Balancer" permanecem em inglês |
| AD-012 | active | **Branch `main` = produção**; features em `feature/<story-slug>` | Fluxo Git solicitado pelo usuário |
| AD-013 | active | **Newbie-friendly é pilar de produto**, não polish | Feedback do [vídeo nvZch2Z7eMM](https://www.youtube.com/watch?v=nvZch2Z7eMM): iniciantes travam no canvas; tutorial + Modo Guiado desde o MVP |
| AD-014 | active | **URL Shortener = primeiro problema (tutorial guiado)**; YouTube = Medium na biblioteca | Progressão Easy → Medium → Hard |
| AD-015 | active | **Três níveis de dificuldade:** `easy`, `medium`, `hard` com filtros, badges e trilha recomendada | Biblioteca curada em `docs/PROBLEM-LIBRARY.md` (27 problemas no launch) |
| AD-016 | active | **Critério de score e veredito** — verdeto `PASS` se score ≥ 80 e zero blockers críticos; `PARTIAL` se score ≥ 70 e zero blockers; `FAIL` caso contrário. Ranking speedrun aceita apenas `PASS` ou `PARTIAL` com score ≥ 70 e zero blockers. Canvas vazio = FAIL local sem LLM | Unifica product spec, judge prompts e leaderboard; decisão tomada antes da Fase 2 |
| AD-017 | active | **Tiers de componentes:** Tier 1 = 15 tipos (MVP 1a, canvas jogável); Tier 2 = 25 tipos (MVP 1c, meta do canvas); Tier 3 = 36 tipos (catálogo completo, Fase 3); Tier 4 = GLB assets (Fase 5 polish) | Alinha goal "≥25" com roadmap; evita bloquear 1a por catálogo completo |
| AD-018 | active | **Canvas de sessão = DOM node cards + SVG edges** sobre grid CSS blueprint; pan/zoom no world container | Paridade System Design Playground; supersede AD-002/008/009 no path de jogo |
| AD-019 | active | **`ArchitectureGraph` inclui** `replicas`, `config` tipado (cache/cdn/sql), `implementationNotes`, `simulation` global; juiz recebe no prompt | Configuração e notes fazem parte do artefato julgado |
| AD-020 | active | **Simulação determinística client-side**; Start on/off; Speed só animação; Traffic + R/W + reps/configs → pressão `ok\|warn\|hot` | Pedagógico sem rede; testável em Vitest |

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
| — | `blueprint-2d-canvas` | Canvas 2D Playground + sim + configs | 🔄 Execute |

Detalhes em `docs/ROADMAP.md`.
