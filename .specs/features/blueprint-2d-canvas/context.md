# Blueprint 2D Canvas — Context

**Gathered:** 2026-07-27  
**Spec:** `.specs/features/blueprint-2d-canvas/spec.md`  
**Status:** Ready for design

---

## Discuss decisions

| Área | Decisão | Fonte |
| ---- | ------- | ----- |
| Simulação | **1B** — educativa: pressão + animação a partir de traffic/speed/R/W, reps e configs | Usuário |
| Configs tipadas | **2A** — MVP: Cache hit rate, CDN hit rate, SQL shards/partitioning/skew; resto = reps + notes | Usuário |
| Replicas | Em **todos** os nós, UI igual aos prints (`−` / `N reps` / `+`) | Usuário + prints |
| Visual | Esquecer 3D; blueprint 2D igual System Design Playground | Usuário |
| Speed | Visual-only (não altera pressão) | Plano / AD-020 |

## Locked UX

- Capsule branca no header: Start, Speed, Traffic, Reads vs Writes
- Cards com borda por categoria; popover ancorado ao selecionado
- Implementation Notes em todos; copy do juiz no footer do popover
- PROBLEM slide-out; zoom +/−; labels de aresta (REQ/CACHE/DB)

## Agent discretion

- Fórmulas exatas de capacity/load no design.md (determinísticas, testáveis)
- Ícones 2D simples (SVG/CSS), não GLB
- Migrar `note` → `implementationNotes` com fallback de leitura
