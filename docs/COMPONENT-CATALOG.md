# Catálogo de Componentes 3D

Vocabulário visual inspirado nos diagramas de System Design do Hayk Simonyan e no padrão de entrevistas de big tech. Cada componente tem um `type` (ID estável), categoria na paleta, ícone 3D, e descrição curta.

---

## Tiers de Implementação (AD-017)

O catálogo completo tem **36 tipos**. A entrega é incremental:

| Tier | Qtd | Fase | Uso |
| ---- | --- | ---- | --- |
| **Tier 1** | 15 | mvp-canvas 1a | Canvas jogável; URL Shortener guiado |
| **Tier 2** | 25 | mvp-canvas 1c | Meta do MVP canvas (product goal) |
| **Tier 3** | 36 | problem-library | Catálogo completo no launch |
| **Tier 4** | 36 GLB | polish | Ícones CC0 substituem primitivos |

### Tier 1 — 15 tipos (MVP 1a)

`client_web`, `client_mobile`, `dns`, `cdn`, `load_balancer`, `api_gateway`, `app_server`, `cache_redis`, `sql_db`, `rate_limiter`, `object_storage`, `message_queue`, `worker`, `monitoring`, `auth_service`

### Tier 2 — +10 tipos (total 25, MVP 1c)

`microservice`, `nosql_db`, `kafka`, `pub_sub`, `search_engine`, `waf`, `reverse_proxy`, `logging`, `notification`, `serverless`

### Tier 3 — +11 tipos (total 36, problem-library)

Demais tipos das seções abaixo: clients restantes, edge, compute, data, messaging, search, security, observability.

---

## Categorias da Paleta

| Categoria | Cor na UI | Descrição |
| --------- | --------- | --------- |
| **Client** | `#60A5FA` (blue) | Dispositivos e apps que consomem o sistema |
| **Edge** | `#34D399` (green) | CDN, DNS, WAF — camada de borda |
| **Traffic** | `#FBBF24` (amber) | Roteamento, balanceamento, gateway |
| **Compute** | `#A78BFA` (purple) | Serviços de processamento |
| **Data** | `#F87171` (red) | Armazenamento e cache |
| **Messaging** | `#FB923C` (orange) | Filas, pub/sub, streaming de eventos |
| **Search** | `#2DD4BF` (teal) | Indexação e busca |
| **Security** | `#E879F9` (pink) | Auth, secrets, encryption |
| **Observability** | `#94A3B8` (slate) | Logs, metrics, tracing |

---

## Componentes — Client

| Type ID | Nome | Ícone 3D (MVP → Final) | Quando usar |
| ------- | ---- | ----------------------- | ----------- |
| `client_mobile` | Mobile App | Cubo + tela → phone GLB | Apps iOS/Android |
| `client_web` | Web Browser | Cubo + tela larga | SPA, site |
| `client_desktop` | Desktop App | Cubo + monitor | Electron, native |
| `client_tv` | Smart TV | Cubo + TV wide | Streaming em TV |
| `client_iot` | IoT Device | Cubo pequeno + antena | Sensores, wearables |

---

## Componentes — Edge

| Type ID | Nome | Ícone 3D | Quando usar |
| ------- | ---- | -------- | ----------- |
| `dns` | DNS | Globo com setas | Resolução de nomes |
| `cdn` | CDN | Servidor com borda pontilhada | Conteúdo estático/vídeo cacheado |
| `waf` | WAF | Escudo | Proteção HTTP |
| `reverse_proxy` | Reverse Proxy | Servidor com seta dupla | Nginx, Envoy front |

---

## Componentes — Traffic

| Type ID | Nome | Ícone 3D | Quando usar |
| ------- | ---- | -------- | ----------- |
| `load_balancer` | Load Balancer | Cilindro com 3 setas de saída | Distribuir tráfego |
| `api_gateway` | API Gateway | Portão/arco | Roteamento, auth, rate limit |
| `rate_limiter` | Rate Limiter | Funil com contador | Throttling |

---

## Componentes — Compute

| Type ID | Nome | Ícone 3D | Quando usar |
| ------- | ---- | -------- | ----------- |
| `app_server` | App Server | Servidor com engrenagem | Monólito / serviço |
| `microservice` | Microservice | Servidor pequeno (replicável) | Serviço independente |
| `serverless` | Serverless / Lambda | Raio + caixa | Funções event-driven |
| `worker` | Background Worker | Servidor com relógio | Jobs assíncronos |
| `transcoder` | Video Transcoder | Servidor + play icon | Encoding de vídeo |
| `recommendation` | Recommendation Engine | Servidor + estrela | Ranking, ML inference |

---

## Componentes — Data

| Type ID | Nome | Ícone 3D | Quando usar |
| ------- | ---- | -------- | ----------- |
| `sql_db` | SQL Database | Cilindro (disco) | Dados relacionais |
| `sql_replica` | SQL Read Replica | Cilindro menor + seta | Read scaling |
| `nosql_db` | NoSQL Database | Cubo empilhado | Document/KV wide-column |
| `cache_redis` | Redis Cache | Cubo vermelho rápido | Cache in-memory |
| `object_storage` | Object Storage (S3) | Bucket/cilindro largo | Arquivos, vídeos raw |
| `data_warehouse` | Data Warehouse | Cilindro grande | Analytics batch |
| `shard` | Database Shard | Cilindro partido | Sharding horizontal |

---

## Componentes — Messaging

| Type ID | Nome | Ícone 3D | Quando usar |
| ------- | ---- | -------- | ----------- |
| `message_queue` | Message Queue | Tubo com buffer | RabbitMQ, SQS |
| `kafka` | Kafka / Event Stream | Tubo com partições | Event sourcing, logs |
| `pub_sub` | Pub/Sub | Hub com raios | Fan-out de eventos |
| `notification` | Notification Service | Sino | Push, email, SMS |

---

## Componentes — Search

| Type ID | Nome | Ícone 3D | Quando usar |
| ------- | ---- | -------- | ----------- |
| `search_engine` | Search Engine (ES) | Lupa + índice | Full-text search |
| `geospatial` | Geospatial Index | Mapa pin + grid | Nearby queries (Uber) |

---

## Componentes — Security

| Type ID | Nome | Ícone 3D | Quando usar |
| ------- | ---- | -------- | ----------- |
| `auth_service` | Auth Service | Cadeado | Login, tokens |
| `oauth` | OAuth Provider | Cadeado + globo | SSO, third-party auth |

---

## Componentes — Observability

| Type ID | Nome | Ícone 3D | Quando usar |
| ------- | ---- | -------- | ----------- |
| `monitoring` | Monitoring | Gráfico/onda | Prometheus, Grafana |
| `logging` | Logging | Documento/lista | ELK, CloudWatch |
| `tracing` | Distributed Tracing | Árvore de spans | Jaeger, Zipkin |

---

## Conexões (Edges)

| Propriedade | Valores | Visual |
| ----------- | ------- | ------ |
| `direction` | `forward`, `bidirectional` | Seta única ou dupla |
| `label` | texto livre (≤ 30 chars) | Tooltip na linha |
| Protocolo sugerido | HTTPS, gRPC, TCP, WebSocket, events | Aparece como label preset |

### Animação de Fluxo

- **Shader:** `flow-edge.frag` — banda luminosa (`vec3 glow`) deslocada por `uTime` ao longo do `vUv.x`
- **Velocidade:** 1.5 units/s (configurável)
- **Cor:** herda da categoria do componente de origem, com alpha 0.8
- **Bidirecional:** duas bandas em direções opostas

---

## MVP vs Final Assets

| Fase | Asset strategy |
| ---- | -------------- |
| MVP (Fase 1) | Primitivos Three.js coloridos por categoria (Box, Cylinder, Sphere) com label flutuante |
| Polish (Fase 5) | GLB icons CC0 via manifest (`component-manifest.ts`) |
| Lab | `component-lab.html` para preview e ajuste de escala/rotação |

---

## Mapeamento por Problema (mínimo esperado)

Componentes que um design "completo" tipicamente inclui:

### YouTube (Upload/Stream/Likes)
`client_mobile`, `client_web`, `client_tv`, `cdn`, `load_balancer`, `api_gateway`, `app_server`, `transcoder`, `object_storage`, `sql_db`, `cache_redis`, `kafka`, `notification`, `search_engine`

### Netflix
`client_tv`, `client_web`, `cdn`, `object_storage`, `transcoder`, `recommendation`, `sql_db`, `cache_redis`

### Uber
`client_mobile`, `load_balancer`, `api_gateway`, `geospatial`, `cache_redis`, `sql_db`, `kafka`, `worker`

### Ticketmaster
`client_web`, `client_mobile`, `load_balancer`, `api_gateway`, `rate_limiter`, `message_queue`, `sql_db`, `cache_redis`, `worker`

> A rubrica oculta de cada problema (em `libs/shared/src/problems/`) define requisitos esperados e componentes críticos para o juiz IA — **não visíveis ao jogador**.
