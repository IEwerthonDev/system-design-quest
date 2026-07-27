# System Design Quest

Jogo educativo no browser para aprender **System Design** desenhando arquiteturas 3D — **newbie-friendly** com tutorial guiado, tooltips e feedback em linguagem simples.

Resolva problemas reais organizados em **3 níveis** — 🟢 Fácil, 🟡 Médio, 🔴 Difícil — desde URL Shortener até Netflix, Uber e Ticketmaster.

**Inspirado por:** [System Design Playground](https://system-design-playground.replit.app/) · padrões 3D do nj-mmo · diagramas Hayk Simonyan

## Para Iniciantes

- **Onboarding** na primeira visita — escolha "Sou iniciante" para o tutorial guiado
- **URL Shortener** como primeiro problema (Easy) com highlights passo a passo
- **Tooltips** em cada componente e métrica — passe o mouse e aprenda
- **Sugestões de requisitos** clicáveis — aprenda o formato antes de escrever os seus
- **Feedback em camadas** — resumo simples primeiro, detalhes técnicos depois

Detalhes em [docs/NEWBIE-FRIENDLY.md](docs/NEWBIE-FRIENDLY.md).

## Modos de Jogo

| Modo | Timer | Ranking | Para quem |
| ---- | ----- | ------- | --------- |
| **Study** | Não | Não | Estudar sem pressão |
| **Speedrun** | Sim | Sim (por problema) | Competir — só entra no ranking se o design estiver correto |

## Fluxo

1. **Briefing** — leia o problema com métricas (RPS, DAU, storage…)
2. **Requisitos** — liste requisitos funcionais e não-funcionais
3. **Canvas 3D** — arraste componentes, conecte com setas animadas
4. **Resultado** — veredito + feedback: o que funciona, o que falta, como melhorar e por quê

## Status do Projeto

| Fase | Branch | Status |
| ---- | ------ | ------ |
| 0 Foundation | `main` | ✅ Merge completo |
| 1 MVP Canvas | `main` | ✅ Merge completo (22 tasks, 3 sub-fases) |
| 2 AI Judge | `main` | ✅ Merge completo (dual-LLM + feedback em camadas) |
| 3 Problem Library | `feature/problem-library` | 📋 Próxima fase |
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

- [Newbie-Friendly](docs/NEWBIE-FRIENDLY.md) — princípios para iniciantes
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
