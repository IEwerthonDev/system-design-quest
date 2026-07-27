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
| **Fase atual** | **Fase 3 `problem-library` implementada** em `feature/problem-library` — Verifier PASS ✅ |
| **Próximo passo** | Merge `feature/problem-library` → `main`; depois Fase 4 `speedrun` |
| **Feature ativa** | `problem-library` — T1–T8 committed, validation PASS |
| **Bloqueios** | Nenhum |
| **Artefatos** | spec/design/tasks/validation em `.specs/features/problem-library/` |

### Context Checkpoint (2026-07-27)

| Sinal | Status |
| ----- | ------ |
| Branch `feature/problem-library` | ✅ 9 commits |
| Gate `npx nx run-many -t lint test` | ✅ 279 tests |
| 27 problemas + library UI + progress | ✅ OK |

**Veredito:** **GREEN**

**Gate:** `npx nx run-many -t lint test`

**Prompt para nova sessão:**
```
Branch feature/problem-library. Fase 3 done (27 problems, library UI, progress, rubrics).
validation.md PASS. Merge to main if approved.
Next: Fase 4 speedrun (timer, leaderboard).
Gate: npx nx run-many -t lint test
```

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
| AD-014 | active | **URL Shortener = primeiro problema (tutorial guiado)**; YouTube = Medium na biblioteca | Progressão Easy → Medium → Hard |
| AD-015 | active | **Três níveis de dificuldade:** `easy`, `medium`, `hard` com filtros, badges e trilha recomendada | Biblioteca curada em `docs/PROBLEM-LIBRARY.md` (27 problemas no launch) |
| AD-016 | active | **Critério de score e veredito** — verdeto `PASS` se score ≥ 80 e zero blockers críticos; `PARTIAL` se score ≥ 70 e zero blockers; `FAIL` caso contrário. Ranking speedrun aceita apenas `PASS` ou `PARTIAL` com score ≥ 70 e zero blockers. Canvas vazio = FAIL local sem LLM | Unifica product spec, judge prompts e leaderboard; decisão tomada antes da Fase 2 |
| AD-017 | active | **Tiers de componentes:** Tier 1 = 15 tipos (MVP 1a, canvas jogável); Tier 2 = 25 tipos (MVP 1c, meta do canvas); Tier 3 = 36 tipos (catálogo completo, Fase 3); Tier 4 = GLB assets (Fase 5 polish) | Alinha goal "≥25" com roadmap; evita bloquear 1a por catálogo completo |

---

## Phased Roadmap (summary)

| Fase | Feature slug | Entrega |
| ---- | ------------ | ------- |
| 0 | `foundation` | Monorepo, CI, canvas vazio, spec infra |
| 1 | `mvp-canvas` | Canvas + tutorial (1a/1b/1c) |
| 2 | `ai-judge` | Julgamento dual-LLM + feedback detalhado |
| 3 | `problem-library` | 27 problemas (7 Easy, 10 Medium, 10 Hard) |
| 4 | `speedrun` | Timer, categorias, leaderboard |
| 5 | `polish` | UX, tutoriais, partículas, sons |

Detalhes em `docs/ROADMAP.md`.
