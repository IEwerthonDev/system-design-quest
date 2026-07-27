# Canvas Graph DnD — Context

**Gathered:** 2026-07-27  
**Spec:** `.specs/features/canvas-graph-dnd/spec.md`  
**Status:** Approved — 2026-07-27

---

## Feature Boundary

O jogador monta a arquitetura como grafo visual estilo Obsidian/Whimsical: coloca componentes pela paleta, **liga nós arrastando de handles**, vê **preview curvo com luz**, e edita arestas (selecionar, apagar, inverter, religar ponta). Reusa paleta, drag XZ, `EdgeManager` e shader de fluxo (AD-008); entrega o gesto de ligação + feedback + edição de arestas + wiring de cena.

---

## Implementation Decisions

### Gesto de criar ligação (Obsidian)

- Arrastar do **handle de saída** do nó A até o **handle de entrada** (ou nó) B cria aresta direcionada A→B
- Handles **entrada e saída** separados por componente
- Handles visíveis **somente no hover** (exceto durante gesto — ver Feedback)
- **Corpo do componente** = mover no plano XZ; **handle** = iniciar/completar ligação (sem atalho Shift)
- Cancelar gesto: **soltar no vazio** ou **clique fora** (Esc não exigido)

### Feedback enquanto liga

- Preview da linha em **curva suave** (estilo Obsidian) seguindo o ponteiro
- Alvo válido: **highlight no nó e no handle de entrada**
- Alvo inválido (mesmo nó, ou par A→B já existente): cursor **proibido**, sem snap
- Durante o gesto, handles do nó de destino **aparecem** mesmo sem hover

### Editar / apagar ligações

- **Selecionar** aresta: clique na linha
- **Apagar** aresta selecionada: Delete/Backspace **e** botão no painel de propriedades
- **Inverter** sentido: botão no painel; efeito visual imediato
- **Religar**: arrastar a **ponta** da aresta para outro nó válido

### Direção e luz

- Luz (**brilho/pulso no tubo**, AD-008) também no **preview** curvo, no sentido do gesto
- Após soltar, aresta permanente anima no sentido A→B
- **Bidirecional**: botão no painel “tornar bidirecional” + **dois pulsos opostos** na mesma curva
- Inverter no painel: troca from/to e a **luz inverte na hora**

---

## Agent's Discretion

- Geometria exata da curva (Bezier vs Catmull) e espessura do preview
- Posicionamento 3D dos handles relativos ao bounding box do componente
- Hit-testing / prioridade raycast handle vs corpo vs aresta
- Layout exato dos botões no painel de propriedades da aresta
- Som de connect existente; timing fino da animação do preview
- Ordem de implementação das tasks

---

## Declined / Undiscussed Gray Areas → Assumptions

Nenhuma área declinada — as quatro gray areas (gesto, feedback, edição, luz) foram discutidas e travadas acima.

---

## Specific References

- **Obsidian**: drag de handle a handle para criar ligação
- **Whimsical / grafos educativos**: preview curvo + feedback de alvo
- **AD-008**: conexões com fluxo animado via shader em tubo; brilho direcional = sentido do fluxo

---

## Deferred Ideas

- Atalho Esc para cancelar gesto (não exigido)
- Shift+drag no corpo como atalho de ligação
- Partículas/ponto luminoso além do brilho no tubo
- Export PNG / fallback 2D (backlog polish)
- Novos tipos de componente / catálogo Tier 3–4
