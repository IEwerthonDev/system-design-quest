# System Design Quest — Context

**Gathered:** 2026-07-27  
**Spec:** `.specs/features/product/spec.md`  
**Status:** Design confirmed — 2026-07-27

---

## Feature Boundary

Jogo educativo no browser para aprender System Design. O jogador resolve problemas reais de grandes sistemas, levanta requisitos, desenha arquitetura 3D com ícones e conexões animadas, e recebe julgamento detalhado de IA. Dois modos: Study (sem timer) e Speedrun (com ranking por categoria/problema).

---

## Implementation Decisions

### Visual & UX

- Design **moderno e minimalista** — fundo escuro suave, painéis com glassmorphism leve, tipografia sans-serif (Inter ou similar)
- **Newbie-friendly por padrão** — ver `docs/NEWBIE-FRIENDLY.md`
- Canvas 3D ocupa ~70% da tela; painéis laterais para paleta e propriedades
- Conexões: linha com **brilho animado** na direção da seta (efeito "dados fluindo")
- Câmera: vista isométrica levemente inclinada (não primeira pessoa); orbit controls para zoom/pan
- Componentes 3D: ícones estilizados low-poly (estética similar a diagramas 3D do Hayk Simonyan)

### Fluxo do Jogo

0. **Onboarding** (primeira visita) → escolher iniciante ou experiente
1. **Home** → escolher modo (Study / Speedrun) e problema
2. **Briefing** → ler descrição + métricas (com tooltips `?`)
3. **Requisitos** → listas editáveis FR / NFR + sugestões clicáveis
4. **Canvas** → montar arquitetura 3D (Modo Guiado com highlights ou Modo Livre)
5. **Resultado** → resumo simples + detalhes expandíveis + cobertura de requisitos
6. (Speedrun) → tempo registrado se correto

### Newbie-Friendly (feedback do vídeo)

Referência: [Analisei o Site do Lucas Montano de System Design](https://www.youtube.com/watch?v=nvZch2Z7eMM)

- **Problema do Playground:** usuário chega no canvas e trava — lista de componentes sem contexto, problemas difíceis de cara, sem tutorial
- **Nossa resposta:** Modo Guiado com URL Shortener como primeiro problema; tooltips em tudo; feedback em camadas
- **Primeiro problema do MVP:** URL Shortener (Easy, tutorial guiado)
- **YouTube, Netflix, Uber, Ticketmaster:** incluídos nos níveis Medium/Hard conforme `docs/PROBLEM-LIBRARY.md`

### Julgamento

- Inspirado no [System Design Playground](https://system-design-playground.replit.app/): **dois juízes IA** (Rigoroso vs Pragmático) debatem e chegam a consenso
- Feedback deve sempre explicar: **o quê**, **como melhorar**, **por quê**
- Verificar cobertura dos requisitos que o jogador declarou (não só requisitos "esperados" ocultos)

### Problemas por Nível

Catálogo completo em `docs/PROBLEM-LIBRARY.md` (27 problemas no launch).

| Nível | Qtd | Exemplos |
| ----- | --- | -------- |
| 🟢 **Easy** | 7 | URL Shortener (tutorial), Rate Limiter, Pastebin, Notification System |
| 🟡 **Medium** | 10 | YouTube, Uber, Chat, News Feed, Instagram, TikTok, Hotel Booking |
| 🔴 **Hard** | 10 | Netflix, Ticketmaster, Stripe, Google Maps, Google Docs, Zoom, S3 |

**Trilha recomendada (newbie):**
`url-shortener` → `rate-limiter` → `chat-system` → `news-feed` → `youtube` → `netflix-streaming` → `ticketmaster`

### Agent's Discretion

- Escolha exata de fontes e paleta de cores (dentro de minimalista/escuro)
- Detalhes de animação do fluxo (shader vs partículas)
- Estrutura interna do prompt dos juízes IA
- Ordem de implementação dos problemas além do YouTube MVP

### Declined / Undiscussed Gray Areas → Assumptions

| Área | Default escolhido | Registrado em spec |
| ---- | ----------------- | ------------------ |
| Auth para ranking | GitHub OAuth + nickname anônimo | Assumptions table |
| Provedor LLM | API OpenAI-compatible configurável | Assumptions table |
| Fallback 2D sem WebGL | Mensagem de erro no MVP; fallback em P3 | Out of Scope / Edge cases |

---

## Specific References

- **nj-mmo** (`~/spiralout/dev/nj-mmo`): Three.js + Vite, `createRenderer()` / `startRenderLoop()`, manifest-driven GLB, `window.__GAME_STATE__` para testes
- **System Design Playground**: fluxo problema → canvas → dual AI judges → consenso
- **Vídeos Hayk Simonyan**: vocabulário visual de componentes (client, LB, cache, DB, queue, CDN, etc.)
  - [Video 1](https://www.youtube.com/watch?v=oYxTTirKY8M&t=1678s)
  - [Video 2](https://www.youtube.com/watch?v=Rrd6xkyjPB8)
  - [Video 3](https://www.youtube.com/watch?v=n28iOV_Y_tQ&t=610s)
- **Análise do Playground (newbie-friendly)**: [nvZch2Z7eMM](https://www.youtube.com/watch?v=nvZch2Z7eMM)

---

## Deferred Ideas

- Modo colaborativo (dois jogadores no mesmo canvas)
- Replay de submissões de outros jogadores
- Integração com Discord para competições
- Editor Mermaid como alternativa ao canvas 3D
- Modo "entrevista" com timer de 45 min simulando entrevista real
