import type { Problem } from '../schema/problem';

export const RATE_LIMITER: Problem = {
  id: 'rate-limiter',
  title: 'Rate Limiter',
  difficulty: 'easy',
  description:
    'Projete um rate limiter para APIs como Stripe ou Uber. Clientes enviam requisições e o sistema ' +
    'deve limitar quantas são aceitas por janela de tempo, retornando HTTP 429 quando exceder. ' +
    'Deve funcionar de forma distribuída entre múltiplos servidores de API.',
  metrics: {
    dau: 10_000_000,
    rps: 1_000_000,
    readWriteRatio: '10:1',
    storageGb: 50,
  },
  constraints: [
    'Limite configurável por cliente/API key (ex.: 100 req/min)',
    'Resposta 429 com header Retry-After quando limite excedido',
    'Consistência eventual aceitável — pequena margem de erro (<1%)',
    'Latência de verificação de quota < 5 ms no p99',
    'Funcionar com múltiplas instâncias de API gateway',
  ],
  tags: ['token-bucket', 'redis', 'api-gateway'],
  suggestedRequirements: {
    functional: [
      'API rejeita requisições acima do limite configurado com HTTP 429',
      'Administrador pode definir limites por cliente ou API key',
      'Sistema retorna header Retry-After indicando quando tentar novamente',
    ],
    nonFunctional: [
      'Verificação de quota responde em menos de 5 ms no p99',
      'Rate limiter funciona corretamente com múltiplos servidores de API',
      'Margem de erro na contagem de requisições menor que 1%',
    ],
  },
  orderInTrack: 2,
  isRecommended: true,
  estimatedMinutes: { study: 20, speedrun: 12 },
  rubric: {
    expectedComponents: ['api_gateway', 'cache_redis', 'app_server'],
    criticalPatterns: [
      'Token bucket or sliding window counter in shared store',
      'Rate check before request reaches backend services',
      'Distributed counter with Redis or similar',
    ],
    commonMistakes: [
      'In-memory counter only — breaks with multiple API servers',
      'No 429 response or Retry-After header',
      'Rate limit check after expensive backend processing',
    ],
  },
};

export const PASTEBIN: Problem = {
  id: 'pastebin',
  title: 'Pastebin',
  difficulty: 'easy',
  description:
    'Projete um serviço como Pastebin.com onde usuários colam texto e recebem uma URL única para compartilhar. ' +
    'Leituras são muito mais frequentes que escritas. Pastes podem ter TTL opcional e expirar automaticamente.',
  metrics: {
    dau: 5_000_000,
    readRps: 50_000,
    writeRps: 500,
    readWriteRatio: '100:1',
    storageGb: 200,
  },
  constraints: [
    'URLs únicas e não adivinháveis para cada paste',
    'Suporte a TTL configurável (1 hora a 30 dias)',
    'Pastes expirados devem ser removidos automaticamente',
    'Tamanho máximo de paste: 1 MB',
    'Disponibilidade 99,9% para leituras',
  ],
  tags: ['blob-storage', 'kv', 'read-heavy'],
  suggestedRequirements: {
    functional: [
      'Usuário pode criar um paste e receber URL única para compartilhar',
      'Visitante pode ler o conteúdo do paste pela URL',
      'Usuário pode definir TTL e o paste expira automaticamente',
    ],
    nonFunctional: [
      'Leituras respondem em menos de 100 ms no p99',
      'Sistema suporta 500 escritas/s e 50.000 leituras/s',
      'Pastes expirados são removidos sem intervenção manual',
    ],
  },
  orderInTrack: 3,
  isRecommended: true,
  estimatedMinutes: { study: 18, speedrun: 10 },
  rubric: {
    expectedComponents: ['client_web', 'app_server', 'object_storage', 'cache_redis'],
    criticalPatterns: [
      'Object storage or blob store for paste content',
      'Metadata store mapping paste ID to storage location',
      'TTL/expiration mechanism for pastes',
    ],
    commonMistakes: [
      'Storing large paste content in SQL rows',
      'Predictable paste URLs enabling enumeration attacks',
      'No expiration job for TTL pastes',
    ],
  },
};

export const UNIQUE_ID_GEN: Problem = {
  id: 'unique-id-gen',
  title: 'Gerador de ID Distribuído',
  difficulty: 'easy',
  description:
    'Projete um serviço de geração de IDs únicos distribuídos como Twitter Snowflake. ' +
    'Múltiplos servidores devem gerar IDs únicos, ordenáveis e compactos sem coordenação central pesada.',
  metrics: {
    rps: 10_000,
    storageGb: 1,
  },
  constraints: [
    'IDs únicos globalmente — zero colisões',
    'IDs roughly sortable by time of creation',
    'Throughput de 10.000 IDs/s agregado',
    'Tolerar clock drift entre máquinas',
    'IDs compactos (64-bit integer preferred)',
  ],
  tags: ['snowflake', 'coordination'],
  suggestedRequirements: {
    functional: [
      'Serviço gera IDs únicos globalmente sem colisão',
      'IDs são ordenáveis por tempo de criação (roughly)',
      'Múltiplos servidores podem gerar IDs em paralelo',
    ],
    nonFunctional: [
      'Throughput agregado de 10.000 IDs/s',
      'Sistema tolera diferença de clock entre máquinas',
      'IDs ocupam no máximo 64 bits',
    ],
  },
  orderInTrack: 4,
  estimatedMinutes: { study: 22, speedrun: 14 },
  rubric: {
    expectedComponents: ['app_server'],
    criticalPatterns: [
      'Snowflake-style: timestamp + machine ID + sequence',
      'Clock drift handling with sequence wait or offset',
      'No central database round-trip per ID',
    ],
    commonMistakes: [
      'UUID v4 only — not time-sortable',
      'Auto-increment database — single point of failure',
      'No machine ID allocation strategy',
    ],
  },
};

export const DISTRIBUTED_CACHE: Problem = {
  id: 'distributed-cache',
  title: 'Cache Distribuído',
  difficulty: 'easy',
  description:
    'Projete um cache distribuído estilo Redis/Memcached para acelerar leituras em um sistema read-heavy. ' +
    'Deve suportar eviction (LRU), lidar com hot keys e evitar cache stampede.',
  metrics: {
    rps: 1_000_000,
    readWriteRatio: '50:1',
    storageGb: 100,
  },
  constraints: [
    'Hit rate alvo de 99% para chaves quentes',
    'Eviction LRU quando memória cheia',
    'Consistent hashing para distribuição entre nós',
    'Proteção contra cache stampede (thundering herd)',
    'Latência de get < 1 ms no p99 para hits',
  ],
  tags: ['cache', 'consistent-hash'],
  suggestedRequirements: {
    functional: [
      'Cliente pode get/set/delete chaves no cache distribuído',
      'Cache evicta entradas LRU quando memória está cheia',
      'Chaves são distribuídas entre nós via consistent hashing',
    ],
    nonFunctional: [
      'Hit rate de 99% para workload de chaves quentes',
      'Get responde em menos de 1 ms no p99 para cache hits',
      'Sistema protege contra cache stampede em expirações',
    ],
  },
  orderInTrack: 5,
  estimatedMinutes: { study: 22, speedrun: 14 },
  rubric: {
    expectedComponents: ['cache_redis', 'load_balancer', 'app_server'],
    criticalPatterns: [
      'Consistent hashing ring for key distribution',
      'LRU eviction policy',
      'Stampede protection (singleflight, probabilistic early expiration)',
    ],
    commonMistakes: [
      'Single cache node — no distribution',
      'No eviction strategy — OOM crashes',
      'All clients refresh expired hot key simultaneously',
    ],
  },
};

export const NOTIFICATION_SYSTEM: Problem = {
  id: 'notification-system',
  title: 'Sistema de Notificações',
  difficulty: 'easy',
  description:
    'Projete um sistema de notificações multi-canal como Uber ou Airbnb. Eventos disparam notificações ' +
    'via push, email e SMS conforme preferências do usuário, com retry e rate limiting por canal.',
  metrics: {
    rps: 16_000,
    storageGb: 20,
  },
  constraints: [
    'Suporte a push, email e SMS',
    'Preferências de canal por usuário',
    'Retry com backoff exponencial em falhas',
    '1 milhão de notificações por minuto no pico',
    'At-least-once delivery — duplicatas aceitáveis com idempotência',
  ],
  tags: ['queue', 'multi-channel'],
  suggestedRequirements: {
    functional: [
      'Sistema envia notificações via push, email e SMS',
      'Usuário configura preferências de canal por tipo de evento',
      'Falhas de entrega disparam retry automático',
    ],
    nonFunctional: [
      'Sistema processa 1 milhão de notificações por minuto',
      'Delivery at-least-once com deduplicação por idempotency key',
      'Rate limiting por canal para respeitar quotas de provedores',
    ],
  },
  orderInTrack: 6,
  isRecommended: true,
  estimatedMinutes: { study: 20, speedrun: 12 },
  rubric: {
    expectedComponents: ['message_queue', 'app_server', 'worker'],
    criticalPatterns: [
      'Message queue decouples producers from delivery workers',
      'Separate workers or adapters per channel (push/email/SMS)',
      'User preference lookup before channel selection',
    ],
    commonMistakes: [
      'Synchronous delivery in API request path',
      'No retry queue for failed deliveries',
      'Single channel only without preference routing',
    ],
  },
};

export const KEY_VALUE_STORE: Problem = {
  id: 'key-value-store',
  title: 'Key-Value Store',
  difficulty: 'easy',
  description:
    'Projete um key-value store distribuído simplificado estilo DynamoDB. Suporte get/put/delete com ' +
    'replicação, sharding e quorum reads/writes para tolerância a falhas.',
  metrics: {
    rps: 100_000,
    storageGb: 1_000,
  },
  constraints: [
    '1 bilhão de chaves, 100k ops/s agregado',
    'Consistent hashing para sharding',
    'Replicação com fator 3',
    'Quorum read/write (R + W > N)',
    'Tolerar falha de 1 nó por shard sem perda de dados',
  ],
  tags: ['cap-theorem', 'sharding'],
  suggestedRequirements: {
    functional: [
      'Cliente pode get, put e delete chaves',
      'Dados são replicados entre múltiplos nós',
      'Sistema continua operando com falha de um nó por shard',
    ],
    nonFunctional: [
      'Sharding via consistent hashing distribui 1B chaves',
      'Quorum reads/writes garantem consistência configurável',
      'Throughput agregado de 100.000 ops/s',
    ],
  },
  orderInTrack: 7,
  estimatedMinutes: { study: 25, speedrun: 15 },
  rubric: {
    expectedComponents: ['nosql_db', 'load_balancer'],
    criticalPatterns: [
      'Consistent hashing for key-to-node mapping',
      'Replication factor 3 with quorum (R+W>N)',
      'Coordinator or client-side routing to correct shard',
    ],
    commonMistakes: [
      'Single database node — no sharding',
      'No replication — data loss on node failure',
      'Split-brain without quorum configuration',
    ],
  },
};

export const EASY_PROBLEMS = [
  RATE_LIMITER,
  PASTEBIN,
  UNIQUE_ID_GEN,
  DISTRIBUTED_CACHE,
  NOTIFICATION_SYSTEM,
  KEY_VALUE_STORE,
] as const;
