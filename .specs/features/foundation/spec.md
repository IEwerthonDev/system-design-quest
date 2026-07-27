# Foundation — Specification

## Problem Statement

Antes de construir o jogo, precisamos de um monorepo funcional com canvas Three.js vazio, tipos compartilhados, server com health check, testes e CI — seguindo os padrões do nj-mmo.

## Goals

- [ ] `npm run dev` inicia client (canvas 3D) + server (API)
- [ ] `npm test` passa em shared, client e server
- [ ] CI verde no GitHub Actions

## User Stories

### P1: Monorepo Scaffold ⭐

**Acceptance Criteria**:

1. WHEN o dev clona o repo THEN `npm install && npm run dev` SHALL iniciar client na porta 4200 e server na porta 3000
2. WHEN o client carrega THEN o browser SHALL exibir canvas 3D com grid isométrico e orbit controls
3. WHEN `npm test` roda THEN todos os testes SHALL passar

### P1: Shared Types ⭐

**Acceptance Criteria**:

1. WHEN `libs/shared` é importado THEN `ArchitectureGraph`, `ComponentType`, `Problem` types SHALL estar disponíveis
2. WHEN um grafo inválido é validado THEN `validateGraph()` SHALL retornar erros descritivos

### P1: Test Hook ⭐

**Acceptance Criteria**:

1. WHEN testes rodam em jsdom THEN `window.__GAME_STATE__` SHALL expor estado serializável do canvas

## Requirement Traceability

| ID | Story | Status |
| -- | ----- | ------ |
| FND-01 | Monorepo scaffold | Pending |
| FND-02 | Canvas vazio 3D | Pending |
| FND-03 | Shared types | Pending |
| FND-04 | Server health check | Pending |
| FND-05 | Vitest setup | Pending |
| FND-06 | Test hook | Pending |
| FND-07 | CI GitHub Actions | Pending |
| FND-08 | AGENTS.md + README | Pending |
