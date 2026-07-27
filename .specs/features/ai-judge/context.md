# AI Judge — Context

**Gathered:** 2026-07-27  
**Spec:** `.specs/features/ai-judge/spec.md`  
**Status:** Approved — 2026-07-27

---

## Feature Boundary

Julgamento dual-LLM de arquiteturas submetidas pelo jogador. Conecta o submit do canvas (Fase 1) ao feedback pedagógico estruturado. Sem ranking, sem biblioteca expandida, sem persistência de submissões.

---

## Implementation Decisions

### LLM Provider & Testing

- **Provedor:** API OpenAI-compatible genérica — env `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`
- **Dev/CI:** Mock/fixtures determinísticos; chamada real só com `LLM_API_KEY` configurada em dev manual
- **Golden tests:** 3 grafos fixos (good/medium/bad) com respostas mockadas; CI nunca chama API externa

### Rate Limiting

- **Dev:** sem rate limit
- **Produção:** 20 requisições `/api/judge` por IP por hora (in-memory)
- **429:** client exibe mensagem amigável com tempo estimado para retry

### Loading UX

- Progresso por etapas durante julgamento:
  1. "Analisando arquitetura…"
  2. "Juiz rigoroso avaliando…"
  3. "Juiz pragmático avaliando…"
  4. "Chegando ao consenso…"
- Sem streaming token-a-token; etapas avançam conforme server completa cada fase (ou simula delay mínimo no mock)

### Feedback em Camadas (PROD-17)

- Resumo colapsado por default: 2–3 frases + próximo passo sugerido
- "Detalhes técnicos" expandível: forças, problemas, melhorias, debate dos juízes
- **Modo iniciante:** default ON se jogador escolheu "Sou iniciante" no onboarding; OFF se "Já sei o básico"
- Toggle na tela de resultado permite alternar sem voltar ao onboarding

### Dual-Judge (AD-006)

- Juiz **Rigoroso:** foco em requisitos, escalabilidade, SPOF, consistência
- Juiz **Pragmático:** foco em trade-offs realistas, custo, simplicidade para o escopo
- **Consenso:** merge dos vereditos; score e verdict finais seguem AD-016
- Juízes podem rodar em paralelo; consenso após ambos retornarem

### Rubrica (escopo Fase 2)

- Apenas problema **URL Shortener** (tutorial existente)
- Briefing + constraints do problema + requisitos declarados pelo jogador
- Rubricas ocultas por problema → Fase 3 (`problem-library`)

---

## Agent's Discretion

- Estrutura interna dos prompts (system/user messages)
- Parser/repair de JSON malformado do LLM (1 retry)
- Layout visual exato do painel de resultado (dentro de design system existente)
- Ordem de implementação das tasks

---

## Deferred Ideas

- Streaming do debate em tempo real
- Persistência de histórico de submissões
- Moderação de conteúdo em requisitos declarados
- Circuit breaker para API LLM
