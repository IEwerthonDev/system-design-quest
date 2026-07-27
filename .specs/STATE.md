# System Design Quest — Project State

**Repo:** https://github.com/IEwerthonDev/system-design-quest  
**Branch strategy:** `main` = produção · `feature/*` = histórias em desenvolvimento  
**Workflow:** TLC Spec-Driven Development (Specify → Design → Tasks → Execute)

---

## Vision

Jogo educativo no browser para aprender System Design desenhando arquiteturas 3D. O jogador lê um problema real (YouTube, Netflix, Uber, Ticketmaster…), levanta requisitos funcionais e não-funcionais, monta a arquitetura com ícones 3D conectados por linhas animadas, e recebe julgamento detalhado de IA — incluindo o que faltou, o que está errado, e como melhorar (com o porquê).

**Inspirações:**
- [System Design Playground](https://system-design-playground.replit.app/) — fluxo problema → canvas → juízes IA
- [Análise do Playground (newbie-friendly)](https://www.youtube.com/watch?v=nvZch2Z7eMM) — o que evitar para iniciantes
- [nj-mmo](../nj-mmo) — Three.js + Vite no browser, padrões de renderer e test hooks
- Vídeos Hayk Simonyan — vocabulário visual de componentes de system design

---

## Handoff

| Campo | Valor |
| ----- | ----- |
| **Fase atual** | Specify + Design (planejamento inicial) |
| **Próximo passo** | Confirmar spec atualizada (newbie-friendly) → criar branch `feature/foundation` |
| **Feature ativa** | `product` (visão geral) + `foundation` (scaffold) |
| **Bloqueios** | Nenhum |

---

## Decisions

| ID | Status | Decision | Rationale |
| -- | ------ | -------- | --------- |
| AD-001 | active | **Monorepo Nx** com `client/`, `server/`, `libs/shared/` | Mesmo padrão do nj-mmo; separação clara entre canvas 3D, API de julgamento e dados compartilhados |
| AD-002 | active | **Three.js vanilla** (sem React Three Fiber) para o canvas 3D | Proven no nj-mmo; controle total sobre shaders de fluxo de dados nas conexões |
| AD-003 | active | **UI em DOM vanilla** sobreposto ao canvas (painéis, formulários) | Consistente com nj-mmo; evita re-render do React invalidando WebGL context |
| AD-004 | active | **Estado do diagrama serializável em JSON** (`ArchitectureGraph`) | Permite salvar, enviar ao juiz, replay e speedrun verification sem depender do WebGL |
| AD-005 | active | **Dois modos de jogo:** Study (sem timer) e Speedrun (com timer + ranking por categoria) | Requisito explícito do usuário; ranking só aceita soluções corretas |
| AD-006 | active | **Juiz dual-LLM** (rigor vs pragmatismo → consenso) | Inspirado no System Design Playground; feedback mais rico |
| AD-007 | active | **Requisitos como checklist editável + campos livres** antes do canvas | Força o jogador a praticar levantamento de requisitos, não só desenhar |
| AD-008 | active | **Conexões com fluxo animado** via custom shader em `TubeGeometry` | Brilho direcional nas setas indica direção do fluxo de dados |
| AD-009 | active | **Catálogo de componentes 3D manifest-driven** (GLB + fallback primitivo) | Mesmo padrão de manifest do nj-mmo; assets CC0 |
| AD-010 | active | **Testes:** lógica em unit (Vitest), canvas via `window.__GAME_STATE__` hook | WebGL não é testável em jsdom; AD-014 do nj-mmo como referência |
| AD-011 | active | **Idioma UI: PT-BR** com termos técnicos em inglês quando padrão da indústria | Usuário brasileiro; termos como "Load Balancer" permanecem em inglês |
| AD-012 | active | **Branch `main` = produção**; features em `feature/<story-slug>` | Fluxo Git solicitado pelo usuário |
| AD-013 | active | **Newbie-friendly é pilar de produto**, não polish | Feedback do [vídeo nvZch2Z7eMM](https://www.youtube.com/watch?v=nvZch2Z7eMM): iniciantes travam no canvas; tutorial + Modo Guiado desde o MVP |
| AD-014 | active | **URL Shortener = primeiro problema (tutorial guiado)**; YouTube = Hard na biblioteca | Progressão Easy → Hard; atende pedido original sem assustar iniciantes |

---

## Phased Roadmap (summary)

| Fase | Feature slug | Entrega |
| ---- | ------------ | ------- |
| 0 | `foundation` | Monorepo, CI, canvas vazio, spec infra |
| 1 | `mvp-canvas` | 1 problema, canvas 3D, requisitos, submit |
| 2 | `ai-judge` | Julgamento dual-LLM + feedback detalhado |
| 3 | `problem-library` | 10+ problemas (YouTube, Netflix, Uber…) |
| 4 | `speedrun` | Timer, categorias, leaderboard |
| 5 | `polish` | UX, tutoriais, partículas, sons |

Detalhes em `docs/ROADMAP.md`.
