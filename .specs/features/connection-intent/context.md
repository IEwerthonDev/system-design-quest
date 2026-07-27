# Connection Intent — Context

**Gathered:** 2026-07-27  
**Spec:** `.specs/features/connection-intent/spec.md`  
**Status:** Confirmed 2026-07-27 — Ready for design

---

## Feature Boundary

Pill label na aresta SVG + popover **CONNECTION INTENT** (catálogo curado) + default heurístico ao conectar + UX usável em **mobile/touch**. Intent é pedagógico/visual (`ConnectionEdge.label`); não altera o motor de simulação. Deploy preview na Vercel (Hobby/grátis) é passo de release fora do núcleo de código do intent, mas pedido pelo usuário nesta sessão.

---

## Implementation Decisions

### Catálogo MVP (P1)

- Opções no menu: **REQ** (REQUEST), **DB** (DEFAULT), **DB** (ORIGIN FALLBACK), **CACHE**
- Pill mostra short code: `REQ` | `DB` | `CACHE`
- DEFAULT e ORIGIN FALLBACK são duas rows no menu com descrições distintas; ambos serializam `label: "DB"`

### Serialização

- Grafo persiste só `label` string (`REQ` | `DB` | `CACHE`)
- Sem campo `intent` separado no schema neste MVP
- Labels legados custom (ex. `HTTPS`): pill mostra o texto; menu sem row ativa / header `CUSTOM`

### Preview

- MVP = pill estático na aresta após create/select (CI-01)
- Pill durante linking (CI-04) = **fora do MVP** / backlog

### Default ao conectar

- Heurística por **destino** no MVP:
  - `cache_redis` | `cdn` → `CACHE`
  - `sql_db` | `nosql_db` | `object_storage` | `search_engine` → `DB`
  - demais → `REQ`
- Se “errar”, jogador corrige no CONNECTION INTENT (sem undo especial)

### Mobile / touch

- Popover CONNECTION INTENT deve caber e ser usável em viewport ≤375px (scroll interno se necessário; não cortar opções)
- Seleção de aresta via touch no stroke/pill (hit target adequado; não depender só de hover)
- Não redesenhar o canvas inteiro para mobile neste feature — só intent menu + hit targets de aresta

### Agent's Discretion

- Visual exato do pill (cores claras/escuras) desde que legível no blueprint
- Posição do popover (ancorado perto do clique vs fixed bottom sheet no mobile) — preferir bottom sheet / viewport-safe em ≤640px se âncora ao clique estourar

### Declined / Undiscussed Gray Areas → Assumptions

- Intent **não** afeta simulação (AD-020) — confirmado por escopo
- Free-text label — fora de escopo
- Deploy Vercel Hobby — ver seção Release abaixo (não bloqueia Design do intent UI)

---

## Specific References

- Screenshot Playground: pill `DB` + menu CONNECTION INTENT com DB/DEFAULT, DB/ORIGIN FALLBACK, REQ/REQUEST
- Pedido explícito: funcionar na versão mobile + subir na Vercel de graça via MCP

---

## Release / Deploy (pedido do usuário)

- Preview deploy na **Vercel Hobby (grátis)** via MCP `deploy_to_vercel`
- Monorepo: client Vite estático + server Fastify — Design deve documentar o que sobe no preview (provável: client + proxy/API serverless ou client-only se API não couber no Hobby sem config extra)
- Deploy **após** Execute do intent (ou preview intermediário da branch atual se usuário pedir agora) — preferir deploy com feature pronta

---

## Deferred Ideas

- CI-04 linking label preview
- `DB` vs `DB_ORIGIN` no grafo para o juiz distinguir
- Mobile overhaul completo do canvas (pan/zoom/palette)
- Production domain custom / CI git-push automático (além do preview MCP)
