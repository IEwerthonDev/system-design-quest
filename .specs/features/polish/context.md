# Polish Context

**Gathered:** 2026-07-27
**Spec:** `.specs/features/polish/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Refinamento visual e pedagógico da Fase 5: GLB icons (Tier 4) para os 25 tipos atuais com fallback primitivo, sons sutis (place/connect/submit) com mute, layout responsivo tablet (≤1024px), painel Configurações com "Refazer tutorial" + "Rever onboarding", e2e Playwright do fluxo tutorial, e remote Git sempre via SSH.

---

## Implementation Decisions

### GLB icons (1A)

- Manifest-driven loading para os **25 tipos atuais** (tier 2)
- Assets GLB CC0 sob `client/public/assets/components/`
- Se GLB falhar ou estiver ausente → **primitivo atual** (categoria) como fallback
- Não expandir para 36 tipos nesta fase

### Sons (2A)

- Web Audio API sintético (osciladores curtos), sem arquivos de áudio
- Eventos: `place`, `connect`, `submit`
- Mute em Configurações; **default: ligado**, volume baixo
- Preferência persistida em `UserPreferences`

### Responsive + e2e + SSH (3 ok)

- Breakpoint tablet: **≤1024px** — painéis empilham, paleta colapsável
- Mobile fino: usable, não “pixel-perfect”
- e2e: **Playwright** — onboarding → tutorial URL Shortener → place/connect → submit (judge mockado)
- Assertivas via DOM + `window.__GAME_STATE__` — sem pixel/WebGL asserts
- Git remote: sempre `git@github.com:...` (SSH); documentar em AGENTS.md

### Refazer tutorial (4A)

- Painel **Configurações** com:
  - **Refazer tutorial** — reset guided + inicia URL Shortener guiado
  - **Rever onboarding** — limpa `onboardingCompleted` e reexibe onboarding
- Também: toggle mute / sons

### Agent's Discretion

- Forma visual dos GLBs (geometrias simples exportadas ou CC0 minimalistas por categoria)
- Timbre/duração exata dos beeps sintéticos
- Layout exato do painel Configurações (desde que acessível e PT-BR)

### Declined / Undiscussed Gray Areas → Assumptions

| Gray area | Chosen default | Rationale |
| --------- | -------------- | --------- |
| Export PNG | Out of scope | Roadmap deferred |
| Fallback 2D WebGL | Out of scope | Edge case / roadmap |
| Expand catalog to 36 | Skip | User chose 1A (25 + GLB) |

---

## Specific References

- AD-009, AD-017 Tier 4 — GLB + fallback primitivo
- PROD-10 — Refazer tutorial / rever onboarding
- Roadmap Fase 5 — sons, responsive tablet
- AGENTS.md — WebGL não testável em Vitest; `__GAME_STATE__`

---

## Deferred Ideas

- Export PNG do diagrama
- Fallback 2D sem WebGL
- Catálogo Tier 3 (36 tipos)
- Partículas avançadas além do shader de fluxo existente
