# Polish Specification

## Problem Statement

O loop pedagógico (Fases 0–4) está completo, mas a experiência ainda usa primitivos 3D genéricos, não tem feedback sonoro, layout fixo de desktop, e quem pulou o onboarding não consegue refazer o tutorial. A Fase 5 fecha o polish visual/pedagógico e adiciona cobertura e2e do happy path.

## Goals

- [ ] 25 tipos do catálogo carregam via manifest GLB com fallback primitivo
- [ ] Sons sutis em place/connect/submit com mute em Configurações
- [ ] Layout usable em tablet (≤1024px)
- [ ] Configurações: Refazer tutorial + Rever onboarding
- [ ] Playwright e2e do fluxo tutorial (judge mockado)
- [ ] Remote Git documentado/garantido como SSH

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Export PNG | Deferred no roadmap |
| Fallback 2D sem WebGL | Edge case; mensagem de incompatibilidade já coberta como P3 produto |
| Expandir catálogo para 36 tipos | User chose 1A — só GLB nos 25 atuais |
| Partículas novas / visual FX avançado | Fora do escopo confirmado |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| GLB scope | 25 tipos tier-2 + primitivo fallback | Discuss 1A | y |
| Sons | Web Audio sintético; mute; default on | Discuss 2A | y |
| Responsive | ≤1024px stack/collapse | Discuss 3 | y |
| e2e | Playwright; DOM + `__GAME_STATE__` | Discuss 3 | y |
| SSH | `git@github.com:...` + nota AGENTS | Discuss 3 | y |
| Settings | Refazer tutorial + Rever onboarding + mute | Discuss 4A | y |
| GLB source | Assets locais CC0/minimal gerados por categoria | Agent discretion | y |

**Open questions:** none.

---

## User Stories

### P1: GLB icons com fallback ⭐ MVP

**User Story**: Como jogador, quero ver ícones 3D distintos por tipo de componente, para o canvas parecer um diagrama de system design de verdade.

**Why P1**: AD-017 Tier 4; diferencial visual do produto.

**Acceptance Criteria**:

1. WHEN o catálogo carrega THEN system SHALL expor um manifest com path GLB (ou null) por cada um dos 25 `ComponentType`
2. WHEN um componente é colocado e o GLB do tipo existe e carrega THEN system SHALL renderizar o modelo GLB (com cor/categoria preservada quando aplicável)
3. WHEN o GLB está ausente ou falha ao carregar THEN system SHALL renderizar o primitivo por categoria (comportamento atual) sem quebrar o canvas
4. WHEN `__GAME_STATE__` / serialização THEN system SHALL continuar expondo o mesmo `ArchitectureGraph` (tipo/id/posição) independente de GLB vs primitivo

**Independent Test**: Manifest cobre 25 tipos; load failure → primitivo; place component → graph serializa.

---

### P1: Sons sutis ⭐ MVP

**User Story**: Como jogador, quero feedback sonoro discreto ao colocar, conectar e submeter, para reforçar ações sem poluir.

**Why P1**: Roadmap Fase 5; reforço pedagógico.

**Acceptance Criteria**:

1. WHEN o jogador coloca um componente e sons estão habilitados THEN system SHALL tocar um beep curto `place`
2. WHEN o jogador cria uma conexão e sons estão habilitados THEN system SHALL tocar um beep curto `connect`
3. WHEN o jogador submete e sons estão habilitados THEN system SHALL tocar um beep curto `submit`
4. WHEN mute está ativo THEN system SHALL não emitir áudio
5. WHEN preferências carregam THEN system SHALL persistir `soundEnabled` (default `true`) em `UserPreferences`

**Independent Test**: Unit com AudioContext mock — enabled plays, muted skips; preference round-trip.

---

### P1: Configurações — tutorial e onboarding ⭐ MVP

**User Story**: Como jogador que pulou o onboarding, quero refazer o tutorial e rever o onboarding a qualquer momento.

**Why P1**: PROD-10.

**Acceptance Criteria**:

1. WHEN o jogador abre Configurações THEN system SHALL exibir painel com "Refazer tutorial", "Rever onboarding" e toggle de sons
2. WHEN clica "Refazer tutorial" THEN system SHALL ativar modo guiado, resetar progresso de tutorial conforme necessário, e iniciar sessão URL Shortener guiada
3. WHEN clica "Rever onboarding" THEN system SHALL setar `onboardingCompleted=false` (e estado coerente) e reexibir o fluxo de onboarding
4. WHEN Configurações está fechado THEN system SHALL não bloquear interação com o canvas/UI principal

**Independent Test**: Settings mount → click Refazer → preferences/guided + problemId url-shortener; Rever → shouldShowOnboarding true.

---

### P2: Responsive tablet

**User Story**: Como jogador em tablet, quero usar o app sem painéis sobrepostos inutilizáveis.

**Acceptance Criteria**:

1. WHEN viewport width ≤ 1024px THEN system SHALL empilhar/reorganizar painéis principais e permitir colapsar a paleta
2. WHEN viewport width > 1024px THEN system SHALL manter o layout desktop atual
3. WHEN a paleta está colapsada em tablet THEN system SHALL expor controle para expandir novamente

**Independent Test**: CSS/media ou class toggle em 1024; palette collapse API/test.

---

### P2: e2e Playwright + SSH docs

**User Story**: Como mantenedor, quero um e2e do happy path tutorial e remote sempre via SSH.

**Acceptance Criteria**:

1. WHEN roda o suite e2e THEN Playwright SHALL cobrir: onboarding (ou skip) → tutorial URL Shortener → place ≥1 componente → connect (se aplicável) → submit com judge mockado
2. WHEN e2e valida estado THEN SHALL usar DOM/`data-testid` e/ou `__GAME_STATE__` — nunca screenshots WebGL
3. WHEN `AGENTS.md` / docs de workflow THEN SHALL indicar remote SSH (`git@github.com:...`) como padrão do projeto

**Independent Test**: `npx playwright test` (ou target nx) passa com mock; AGENTS contém SSH.

---

## Edge Cases

- WHEN GLB 404/corrupt THEN system SHALL fallback primitivo e continuar
- WHEN AudioContext indisponível / autoplay blocked THEN system SHALL falhar silenciosamente (sem throw)
- WHEN Refazer tutorial com sessão ativa THEN system SHALL substituir/reiniciar sessão guiada URL Shortener
- WHEN e2e sem WebGL real THEN system SHALL ainda validar DOM + game state (jsdom/playwright com mocks conforme setup)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| POL-01 | P1: Manifest GLB 25 tipos | Design | Pending |
| POL-02 | P1: Render GLB + fallback | Design | Pending |
| POL-03 | P1: Graph/state independente de mesh | Design | Pending |
| POL-04 | P1: Sons place/connect/submit | Design | Pending |
| POL-05 | P1: Mute + soundEnabled persist | Design | Pending |
| POL-06 | P1: Settings panel | Design | Pending |
| POL-07 | P1: Refazer tutorial | Design | Pending |
| POL-08 | P1: Rever onboarding | Design | Pending |
| POL-09 | P2: Responsive ≤1024 | Design | Pending |
| POL-10 | P2: Palette collapse tablet | Design | Pending |
| POL-11 | P2: Playwright e2e tutorial | Design | Pending |
| POL-12 | P2: SSH docs | Design | Pending |

**Coverage:** 12 total, 0 mapped to tasks yet

---

## Success Criteria

- [ ] Place de qualquer tipo do catálogo não quebra com GLB missing
- [ ] Mute silencia; unmute toca nos 3 eventos
- [ ] Settings refaz tutorial e onboarding
- [ ] ≤1024px: paleta colapsável + layout stacked
- [ ] e2e tutorial passa; AGENTS menciona SSH
