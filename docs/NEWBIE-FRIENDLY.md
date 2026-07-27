# Newbie-Friendly — Princípios e Requisitos

**Referência:** [Analisei o Site do Lucas Montano de System Design](https://www.youtube.com/watch?v=nvZch2Z7eMM)  
**Contexto:** Crítica ao [System Design Playground](https://system-design-playground.replit.app/) — ferramenta poderosa, mas que **assusta iniciantes** que chegam no canvas sem saber por onde começar.

O próprio Lucas Montano reconhece no desenvolvimento do playground ([vídeo de construção](https://www.youtube.com/watch?v=16IYx0CekVc)):

> *"O que tá faltando aqui é um tutorial. Muita gente vai chegar aqui e vai travar."*

**Nossa resposta:** System Design Quest deve ser **newbie-friendly por padrão**, sem sacrificar profundidade para quem já é sênior (modo livre + problemas Hard permanecem disponíveis).

---

## Problemas identificados no Playground (e como evitamos)

| Problema no Playground | Impacto no iniciante | Nossa solução |
| ---------------------- | -------------------- | ------------- |
| Canvas aberto sem orientação | Paralisia — "o que coloco primeiro?" | **Modo Guiado** com highlights passo a passo |
| Lista enorme de componentes sem contexto | Não sabe o que é CDN, WAF, etc. | **Tooltips + glossário** em cada componente |
| Problemas difíceis expostos logo de cara | Desânimo (Uber 1M RPS no dia 1) | **Trilha iniciante** — URL Shortener primeiro |
| Métricas (RPS, DAU) sem explicação | Não entende a escala do problema | **Métricas com tooltip** em linguagem simples |
| Fase de requisitos ausente ou fraca | Pula etapa crítica da entrevista | **Requisitos com prompts sugeridos** (clicáveis) |
| Feedback técnico demais | Não aprende, só se sente burro | **Feedback em camadas** — resumo simples + detalhes |
| Biblioteca de artigos desconectada | Estuda teoria mas não aplica | **Links contextuais** no briefing por tag |
| Sem indicação de próximo passo após erro | Abandona | **"Próximo passo sugerido"** no resultado |

---

## Pilares Newbie-Friendly

### 1. Onboarding (primeira visita)

3 telas rápidas (< 60s total):

1. **O que é System Design?** — "Você vai praticar como numa entrevista de big tech"
2. **Como o jogo funciona** — briefing → requisitos → canvas → feedback
3. **Escolha seu caminho** — "Sou iniciante" (Modo Guiado) vs "Já sei o básico" (Modo Livre)

### 2. Modo Guiado (tutorial integrado)

Problema fixo: **URL Shortener** (Easy).

| Passo | Fase | O que o jogo faz |
| ----- | ---- | ---------------- |
| 1 | Briefing | Destaca métricas uma a uma com explicação |
| 2 | Requisitos | Sugere 3 FR + 2 NFR clicáveis; jogador pode editar |
| 3 | Canvas | Highlight sequencial: Client → LB → App → Cache → DB |
| 4 | Conexão | Tooltip: "Conecte o Client ao Load Balancer (HTTPS)" |
| 5 | Submit | Explica o que os juízes vão avaliar |
| 6 | Resultado | Celebra conclusão + desbloqueia biblioteca completa |

**Regra:** Modo Guiado não bloqueia ações — jogador pode ignorar hints, mas elas permanecem visíveis.

### 3. Tooltips e glossário

- **Hover/long-press** em componente da paleta → nome + 1 frase + "quando usar"
- **Ícone `?`** no briefing → glossário de métricas (RPS, DAU, storage, latency p99)
- **Painel Glossário** acessível a qualquer momento (atalho `G`)

### 4. Requisitos assistidos

Na fase de requisitos, cards clicáveis:

- "Usuário pode encurtar uma URL longa" (FR)
- "Redirect em < 100ms" (NFR)
- "Sistema suporta 10k writes/s" (NFR)

Jogador clica para adicionar e pode editar — aprende o **formato** de um bom requisito.

### 5. Dicas contextuais no canvas (Modo Study)

Painel lateral "Dicas" com 2–3 sugestões dinâmicas baseadas no problema:

- "Este problema é read-heavy — considere um cache"
- "Você ainda não adicionou armazenamento persistente"

Dicas **não revelam** a solução completa — só direcionam o raciocínio.

### 6. Feedback em camadas

```
┌─────────────────────────────────────┐
│  RESUMO (linguagem simples)        │
│  "Seu design funciona para o básico │
│   mas não escala para picos."       │
├─────────────────────────────────────┤
│  PRÓXIMO PASSO                      │
│  "Adicione um cache entre App e DB" │
├─────────────────────────────────────┤
│  DETALHES TÉCNICOS (expandível)     │
│  Pontos fortes · Problemas · Debate │
└─────────────────────────────────────┘
```

Toggle **"Modo iniciante"** no feedback: esconde jargão, mantém explicações com analogias.

### 7. Trilha de progressão

Ordem recomendada na biblioteca (badge "Recomendado para iniciantes"):

1. URL Shortener (Easy) — tutorial
2. Rate Limiter (Medium)
3. News Feed (Medium)
4. Chat (Medium)
5. YouTube / Netflix / Uber / Ticketmaster (Hard)

Speedrun desbloqueado por problema após completar em Study com PARTIAL+.

---

## O que NÃO é newbie-friendly (e está ok)

- **Speedrun** — modo competitivo; iniciante deve dominar Study primeiro
- **Problemas Hard sem tentativa prévia** — aviso claro: "Recomendamos completar URL Shortener antes"
- **Juiz rigoroso** — feedback honesto, mas empacotado em camadas simples primeiro

---

## Métricas de sucesso (newbie)

- [ ] ≥ 70% dos novos usuários completam o tutorial URL Shortener sem abandonar
- [ ] Tempo médio do tutorial < 15 min (primeira vez)
- [ ] NPS interno: "Entendi o que fazer em cada fase" ≥ 4/5 em teste com 3 iniciantes
- [ ] Zero submissões de canvas vazio após tutorial (validação + hints reduzem)

---

## Mapeamento para requisitos

| Doc section | Requirement ID |
| ----------- | -------------- |
| Onboarding | PROD-11 |
| Modo Guiado | PROD-12 |
| Tooltips + glossário | PROD-13 |
| Métricas explicadas | PROD-14 |
| Requisitos assistidos | PROD-15 |
| Dicas no canvas | PROD-16 |
| Feedback em camadas | PROD-17 |
| Trilha de progressão | PROD-18 |
