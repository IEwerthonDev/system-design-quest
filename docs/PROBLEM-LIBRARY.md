# Biblioteca de Problemas — Níveis Easy · Medium · Hard

Catálogo curado para o **System Design Quest**, organizado em três níveis de dificuldade.  
Fontes: [Design Gurus — 30 questions ranked](https://designgurus.substack.com/p/30-system-design-interview-questions), [Hello Interview](https://www.hellointerview.com/learn/system-design/problem-breakdowns/bitly), [gitGood.dev](https://gitgood.dev/questions/category/system-design), [System Design Sandbox](https://www.systemdesignsandbox.com/), [Exponent 2026 Guide](https://www.tryexponent.com/blog/system-design-interview-guide).

---

## Sistema de Níveis

| Nível | Badge | Público | Tempo típico (Study) | Speedrun |
| ----- | ----- | ------- | -------------------- | -------- |
| **Easy** | 🟢 Fácil | Iniciantes, L3 | 15–25 min | Desbloqueado após tutorial |
| **Medium** | 🟡 Médio | Mid-level, L4 | 25–40 min | Desbloqueado após 2 Easy com PARTIAL+ |
| **Hard** | 🔴 Difícil | Senior, L5+ | 40–60 min | Desbloqueado após 2 Medium com PARTIAL+ |

**Regra newbie-friendly:** aviso amigável (não bloqueante) ao pular níveis; Modo Guiado só no Easy #1 (URL Shortener).

---

## 🟢 Easy — Fácil (7 problemas no launch)

Problemas com escopo pequeno, poucos componentes, trade-offs claros. Ideal para aprender o fluxo do jogo.

| ID | Problema | Inspiração | Escala típica | Tags | Conceitos-chave |
| -- | -------- | ----------- | ------------- | ---- | --------------- |
| `url-shortener` | **Encurtador de URL** | Bit.ly, TinyURL | 100M DAU, 100:1 read/write | hashing, cache, kv | Base62, 302 redirect, cache read-heavy |
| `rate-limiter` | **Rate Limiter** | Stripe, Uber API | 1M RPS, 429 responses | token-bucket, redis | Token bucket, sliding window, API gateway |
| `pastebin` | **Pastebin** | Pastebin.com | 10M pastes, read-heavy | blob-storage, kv | Object storage, TTL, URLs únicas |
| `unique-id-gen` | **Gerador de ID Distribuído** | Twitter Snowflake | 10k IDs/s | snowflake, coordination | UUID vs Snowflake, clock drift |
| `distributed-cache` | **Cache Distribuído** | Redis/Memcached | 1M gets/s, 99% hit rate | cache, consistent-hash | LRU, eviction, hot keys, stampede |
| `notification-system` | **Sistema de Notificações** | Uber, Airbnb | 1M notif/min | queue, multi-channel | Push/email/SMS, retry, preferências |
| `key-value-store` | **Key-Value Store** | DynamoDB simplificado | 1B keys, 100k ops/s | cap-theorem, sharding | Consistent hashing, replication, quorum |

**Tutorial guiado:** apenas `url-shortener` (PROD-12).

---

## 🟡 Medium — Médio (10 problemas no launch)

Sistemas multi-componente, fan-out, tempo real ou domínios especializados (geo, sync).

| ID | Problema | Inspiração | Escala típica | Tags | Conceitos-chave |
| -- | -------- | ----------- | ------------- | ---- | --------------- |
| `chat-system` | **Chat em Tempo Real** | WhatsApp, Slack | 500M DAU, 50B msg/dia | websockets, sharding | WebSocket, delivery receipts, presence |
| `news-feed` | **News Feed** | Twitter/X, Facebook | 500M DAU, fan-out | fan-out, ranking | Push vs pull, celebrity problem, Redis timeline |
| `search-autocomplete` | **Autocomplete / Typeahead** | Google Search | <100ms p99, 5B queries/dia | trie, cache | Trie, ranking por frequência, CDN cache |
| `instagram` | **Instagram** | Meta | 2B users, photo-heavy | cdn, fan-out | Media pipeline, Stories TTL, social graph |
| `google-drive` | **Armazenamento em Nuvem** | Google Drive, Dropbox | 500M users, sync | sync, chunking | File chunking, conflict resolution, block storage |
| `yelp-nearby` | **Busca por Proximidade** | Yelp, Google Maps lite | 100k QPS geo | geospatial | Geohash, QuadTree, PostGIS |
| `hotel-booking` | **Reserva de Hotel** | Booking.com, Airbnb | 1M reservas/dia | transactions, inventory | Double-booking, locking, calendário |
| `youtube` | **YouTube — Upload/Stream/Social** | YouTube | 500h upload/min, 2B users | cdn, transcoding | HLS/DASH, transcoding DAG, likes/comments |
| `uber-ride` | **Uber — Matching de Motoristas** | Uber, Lyft | 1M RPS geo | geospatial, realtime | Geohash, dispatch, surge pricing, WebSocket |
| `tiktok-feed` | **TikTok — Feed de Vídeos Curtos** | TikTok | 1B users, recommendation-first | cdn, ml-ranking | Recommendation engine, moderation, virality |

---

## 🔴 Hard — Difícil (10 problemas no launch)

Trade-offs múltiplos, baixa latência, consistência financeira ou coordenação distribuída avançada.

| ID | Problema | Inspiração | Escala típica | Tags | Conceitos-chave |
| -- | -------- | ----------- | ------------- | ---- | --------------- |
| `netflix-streaming` | **Netflix — Streaming ABR** | Netflix | 200M subs, 1B hrs/mês | cdn, abr | Adaptive bitrate, encoding, Open Connect CDN |
| `ticketmaster` | **Ticketmaster — Venda de Ingressos** | Ticketmaster | 400k tickets/min no pico | queues, inventory | Virtual waiting room, inventory lock, flash sale |
| `google-maps` | **Google Maps** | Google Maps | 1B users, routing | geospatial, graph | A*, tile serving, traffic, geocoding |
| `google-docs` | **Edição Colaborativa** | Google Docs | Real-time sync | crdt, websockets | OT/CRDT, conflict resolution, versioning |
| `stripe-payments` | **Sistema de Pagamentos** | Stripe | $1T+/ano, idempotency | ledger, idempotency | Double-entry, PCI, reconciliation, webhooks |
| `zoom-conference` | **Videoconferência** | Zoom, Meet | 300M meeting/day | webrtc, sfu | WebRTC, SFU vs MCU, TURN/STUN, simulcast |
| `doordash-delivery` | **Delivery de Comida** | DoorDash, Uber Eats | 3-sided marketplace | dispatch, state-machine | Restaurant + driver + customer, batching |
| `distributed-kafka` | **Message Queue Distribuída** | Kafka | 1M events/s | kafka, exactly-once | Partitions, ISR, consumer groups, ordering |
| `s3-storage` | **Object Storage (S3-like)** | AWS S3 | 11 nines durability | erasure-coding | Erasure coding, multipart upload, lifecycle |
| `distributed-lock` | **Distributed Lock** | Google Chubby | Coordination service | consensus, raft | Paxos/Raft, fencing tokens, lease TTL |

---

## Trilha recomendada (newbie-friendly)

Ordem sugerida na UI — badge **"Recomendado"** nos primeiros de cada tier:

```
Easy:    url-shortener → rate-limiter → paste bin → notification-system
Medium:  chat-system → news-feed → youtube → uber-ride
Hard:    netflix-streaming → ticketmaster → stripe-payments
```

---

## Speedrun — Categorias

Cada `problem_id` é uma **categoria** independente no ranking:

- `url-shortener` — speedrun Fácil mais popular para iniciantes
- `ticketmaster` — speedrun Hard competitivo
- Filtro na tela de ranking: **por problema** ou **por nível** (Easy/Medium/Hard)

---

## Roadmap de conteúdo (pós-launch)

Problemas adicionais para fases futuras (backlog):

| Nível | Problema | ID sugerido |
| ----- | -------- | ----------- |
| Easy | Web Crawler | `web-crawler` |
| Easy | CDN | `cdn-design` |
| Easy | Pub/Sub básico | `pubsub-basic` |
| Medium | E-commerce Checkout | `ecommerce-checkout` |
| Hard | Stock Exchange | `stock-exchange` |
| Hard | Code Deployment (CI/CD) | `deploy-system` |
| Hard | LLM Inference API | `llm-inference` |

---

## Estrutura de dados (shared)

```typescript
type Difficulty = 'easy' | 'medium' | 'hard';

interface ProblemDefinition {
  id: string;
  title: string;
  difficulty: Difficulty;
  orderInTrack: number;           // trilha recomendada global
  isTutorial: boolean;            // true só para url-shortener
  briefing: ProblemBriefing;
  suggestedRequirements: { functional: string[]; nonFunctional: string[] };
  rubric: JudgeRubric;            // oculto do jogador
  tags: string[];
  estimatedMinutes: { study: number; speedrun: number };
}
```

---

## Referências

- [30 System Design Questions Ranked by Difficulty](https://designgurus.substack.com/p/30-system-design-interview-questions) — Design Gurus
- [System Design Interview Guide 2026](https://www.tryexponent.com/blog/system-design-interview-guide) — Exponent
- [System Design for Beginners](https://leetcopilot.dev/blog/how-to-practice-system-design-for-beginners) — LeetCopilot
- [gitGood.dev System Design](https://gitgood.dev/questions/category/system-design) — 68 questões categorizadas
