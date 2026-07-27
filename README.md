# System Design Quest

Jogo educativo no browser para aprender **System Design** desenhando arquiteturas 3D — **newbie-friendly** com tutorial guiado, tooltips e feedback em linguagem simples.

Resolva problemas reais organizados em **3 níveis** — 🟢 Fácil, 🟡 Médio, 🔴 Difícil — desde URL Shortener até Netflix, Uber e Ticketmaster.

**Inspirado por:** [System Design Playground](https://system-design-playground.replit.app/) · padrões 3D do nj-mmo · diagramas Hayk Simonyan

## Status do Projeto

| Fase | Branch | Status |
| ---- | ------ | ------ |
| 0 Foundation | `main` | ✅ Merge completo |
| 1 MVP Canvas | `feature/mvp-canvas` | 📋 Sub-fase 1a em andamento (22 tasks, 3 sub-fases) |
| 2 AI Judge | `feature/ai-judge` | 📋 Planejado |
| 3 Problem Library | `feature/problem-library` | 📋 Planejado |
| 4 Speedrun | `feature/speedrun` | 📋 Planejado |
| 5 Polish | `feature/polish` | 📋 Planejado |

## Tech Stack

- **Client:** Vite + TypeScript + Three.js (vanilla)
- **Server:** Fastify
- **Monorepo:** Nx (`client/`, `server/`, `libs/shared/`)
- **Tests:** Vitest

## Desenvolvimento

Este projeto segue **TLC Spec-Driven Development**. Specs ficam em `.specs/`.

```bash
npm install
npm run dev        # client :4200 + server :3000
npm test           # todos os testes
npm run lint       # ESLint em todos os projetos
```

### Estrutura

```
client/          # Vite + Three.js canvas + DOM UI panels
server/          # Fastify API (judge, leaderboard)
libs/shared/     # Types, problem definitions, validation
.specs/          # Spec-driven docs
docs/            # Roadmap, component catalog
```

## Documentação

- [Roadmap](docs/ROADMAP.md) — fases e entregas
- [Catálogo de Componentes 3D](docs/COMPONENT-CATALOG.md) — ícones e categorias
- [Product Spec](.specs/features/product/spec.md) — requisitos completos
- [Project State](.specs/STATE.md) — decisões e handoff
- [AGENTS.md](AGENTS.md) — guia para agentes de IA

## Branch Strategy

- `main` — produção
- `feature/<story-slug>` — desenvolvimento e teste antes do merge

## License

MIT
