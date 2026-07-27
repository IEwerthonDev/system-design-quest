# System Design Quest

Jogo educativo no browser para aprender **System Design** desenhando arquiteturas 3D — **newbie-friendly** com tutorial guiado, tooltips e feedback em linguagem simples.

Resolva problemas reais organizados em **3 níveis** — 🟢 Fácil, 🟡 Médio, 🔴 Difícil — desde URL Shortener até Netflix, Uber e Ticketmaster.

**Inspirado por:** [System Design Playground](https://system-design-playground.replit.app/) · padrões 3D do [nj-mmo](https://github.com/IEwerthonDev/nj-mmo) · diagramas Hayk Simonyan

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

🚧 **Fase de planejamento** — specs e design completos; implementação começa na branch `feature/foundation`.

| Fase | Branch | Status |
| ---- | ------ | ------ |
| 0 Foundation | `feature/foundation` | 📋 Planejado |
| 1 MVP Canvas | `feature/mvp-canvas` | 📋 Planejado |
| 2 AI Judge | `feature/ai-judge` | 📋 Planejado |
| 3 Problem Library | `feature/problem-library` | 📋 Planejado |
| 4 Speedrun | `feature/speedrun` | 📋 Planejado |
| 5 Polish | `feature/polish` | 📋 Planejado |

## Tech Stack

- **Client:** Vite + TypeScript + Three.js (vanilla)
- **Server:** Fastify + Drizzle ORM
- **Monorepo:** Nx
- **Tests:** Vitest + Playwright (visual gate)
- **AI:** Dual-LLM judge (OpenAI-compatible)

## Desenvolvimento

Este projeto segue **TLC Spec-Driven Development**. Specs ficam em `.specs/`.

```bash
# (após Fase 0)
npm install
npm run dev        # client :4200 + server :3000
npm test           # todos os testes
```

## Documentação

- [Biblioteca de Problemas](docs/PROBLEM-LIBRARY.md) — 27 problemas por nível (Easy/Medium/Hard)
- [Newbie-Friendly](docs/NEWBIE-FRIENDLY.md) — princípios para iniciantes
- [Roadmap](docs/ROADMAP.md) — fases e entregas
- [Catálogo de Componentes 3D](docs/COMPONENT-CATALOG.md) — ícones e categorias
- [Product Spec](.specs/features/product/spec.md) — requisitos completos
- [Architecture Design](.specs/features/product/design.md) — arquitetura técnica
- [Project State](.specs/STATE.md) — decisões e handoff

## Branch Strategy

- `main` — produção
- `feature/<story-slug>` — desenvolvimento e teste antes do merge

## License

MIT
