import type { ProblemDefinition } from '../schema/problem';

export const NETFLIX_STREAMING: ProblemDefinition = {
  id: 'netflix-streaming',
  company: 'Netflix',
  title: 'Netflix — Streaming ABR',
  difficulty: 'hard',
  description:
    'Projete a plataforma de streaming da Netflix: encoding de vídeos, adaptive bitrate (ABR), CDN Open Connect ' +
    'e playback com qualidade ajustada à banda do usuário. 200M assinantes, 1B horas/mês.',
  metrics: {
    dau: 200_000_000,
    readRps: 5_000_000,
    storageGb: 500_000,
  },
  constraints: [
    '200M assinantes, 1B horas de streaming/mês',
    'Adaptive bitrate — qualidade ajusta à banda',
    'Encoding para múltiplos codecs e resoluções',
    'CDN própria (Open Connect) em ISPs',
    'Startup time < 2 segundos',
  ],
  tags: ['cdn', 'abr'],
  suggestedRequirements: {
    functional: [
      'Usuário assiste vídeos com qualidade adaptativa à banda',
      'Vídeos são encodados para múltiplas resoluções e bitrates',
      'Conteúdo é distribuído via CDN global',
    ],
    nonFunctional: [
      'Startup de playback em menos de 2 segundos',
      'CDN serve 5M streams simultâneos no pico',
      'ABR reduz buffering em conexões instáveis',
    ],
  },
  orderInTrack: 18,
  isRecommended: true,
  estimatedMinutes: { study: 50, speedrun: 32 },
  rubric: {
    expectedComponents: ['client_web', 'cdn', 'object_storage', 'worker', 'app_server'],
    criticalPatterns: [
      'Transcoding pipeline producing multiple bitrate ladders',
      'ABR protocol (HLS/DASH) with segment-based delivery',
      'CDN edge caching close to users (Open Connect model)',
    ],
    commonMistakes: [
      'Single bitrate stream — buffering on slow connections',
      'No CDN — all traffic hits origin',
      'Synchronous encoding blocking content availability',
    ],
  },
};

export const TICKETMASTER: ProblemDefinition = {
  id: 'ticketmaster',
  company: 'Ticketmaster',
  title: 'Ticketmaster — Venda de Ingressos',
  difficulty: 'hard',
  description:
    'Projete um sistema de venda de ingressos como Ticketmaster para flash sales. Virtual waiting room, ' +
    'inventory lock, 400k tickets/min no pico e zero overselling.',
  metrics: {
    rps: 500_000,
    storageGb: 100,
  },
  constraints: [
    '400.000 tickets vendidos por minuto no pico',
    'Virtual waiting room para eventos populares',
    'Inventory lock durante checkout (5 min TTL)',
    'Zero overselling — consistência forte',
    'Fair queue — FIFO para waiting room',
  ],
  tags: ['queues', 'inventory'],
  suggestedRequirements: {
    functional: [
      'Usuário entra em fila virtual para eventos populares',
      'Usuário reserva ingressos com lock temporário no checkout',
      'Sistema garante que ingressos vendidos não excedem inventário',
    ],
    nonFunctional: [
      'Suporta 400.000 transações por minuto no pico',
      'Waiting room processa fila FIFO de forma justa',
      'Lock de inventário expira após 5 minutos sem pagamento',
    ],
  },
  orderInTrack: 19,
  isRecommended: true,
  estimatedMinutes: { study: 55, speedrun: 35 },
  rubric: {
    expectedComponents: ['app_server', 'message_queue', 'sql_db', 'cache_redis'],
    criticalPatterns: [
      'Virtual waiting room with token-based queue admission',
      'Pessimistic or atomic inventory decrement on purchase',
      'Temporary seat hold with TTL during checkout',
    ],
    commonMistakes: [
      'No waiting room — thundering herd crashes servers',
      'Check-then-act inventory — overselling under load',
      'No seat hold TTL — inventory locked indefinitely',
    ],
    structuralDepth: 'deep',
    antiPatterns: [
      {
        code: 'no-waiting-room-queue',
        requiredAnyOf: ['message_queue'],
        severity: 'blocker',
        messageKey: 'ticketmaster.no_waiting_room',
      },
    ],
    configRules: [
      {
        code: 'shardCount-too-low',
        componentType: 'sql_db',
        minShardCount: 2,
        severity: 'major',
        messageKey: 'ticketmaster.shard_count_too_low',
      },
      {
        code: 'mq-not-durable',
        componentType: 'message_queue',
        requireMqDurability: 'disk',
        severity: 'blocker',
        messageKey: 'ticketmaster.mq_not_durable',
      },
    ],
    scaleChecklist: {
      en: [
        'Absorb flash-sale peaks (~400k transactions/min) with a fair FIFO virtual waiting room.',
        'Hold inventory locks with TTL and strong consistency so seats are never oversold.',
      ],
      'pt-BR': [
        'Absorva picos de flash sale (~400k tx/min) com waiting room virtual FIFO justa.',
        'Segure locks de inventário com TTL e consistência forte para nunca overselling.',
      ],
    },
  },
};

export const GOOGLE_MAPS: ProblemDefinition = {
  id: 'google-maps',
  company: 'Google Maps',
  title: 'Google Maps',
  difficulty: 'hard',
  description:
    'Projete o backend do Google Maps: tile serving, routing (A*), geocoding, tráfego em tempo real ' +
    'e busca de lugares. 1B usuários com baixa latência global.',
  metrics: {
    dau: 1_000_000_000,
    rps: 2_000_000,
    storageGb: 1_000_000,
  },
  constraints: [
    '1B usuários, map tiles servidos globalmente',
    'Routing A* em grafos rodoviários pré-processados',
    'Geocoding endereço ↔ coordenadas',
    'Tráfego em tempo real atualizado a cada minuto',
    'Tile cache agressivo em CDN',
  ],
  tags: ['geospatial', 'graph'],
  suggestedRequirements: {
    functional: [
      'Usuário visualiza mapas com tiles carregados sob demanda',
      'Usuário obtém rota entre dois pontos',
      'Sistema converte endereços em coordenadas (geocoding)',
    ],
    nonFunctional: [
      'Tiles carregam em menos de 100 ms via CDN',
      'Routing responde em menos de 500 ms para rotas urbanas',
      'Dados de tráfego atualizados a cada minuto',
    ],
  },
  orderInTrack: 20,
  estimatedMinutes: { study: 55, speedrun: 35 },
  rubric: {
    expectedComponents: ['cdn', 'app_server', 'cache_redis', 'search_engine'],
    criticalPatterns: [
      'Pre-rendered map tiles at multiple zoom levels',
      'CDN caches tiles by z/x/y coordinates',
      'Contraction hierarchies or preprocessed graph for fast routing',
    ],
    commonMistakes: [
      'Rendering map tiles on every request dynamically',
      'No CDN for tile delivery',
      'Dijkstra on full graph per routing request',
    ],
  },
};

export const GOOGLE_DOCS: ProblemDefinition = {
  id: 'google-docs',
  company: 'Google Docs',
  title: 'Edição Colaborativa',
  difficulty: 'hard',
  description:
    'Projete um editor colaborativo como Google Docs. Múltiplos usuários editam simultaneamente com ' +
    'sincronização em tempo real via OT ou CRDT, versionamento e resolução de conflitos.',
  metrics: {
    dau: 500_000_000,
    rps: 1_000_000,
    storageGb: 10_000,
  },
  constraints: [
    'Edição simultânea por dezenas de usuários por documento',
    'Latência de sync < 100 ms',
    'OT ou CRDT para convergência garantida',
    'Versionamento com histórico completo',
    'Offline edit com sync ao reconectar',
  ],
  tags: ['crdt', 'websockets'],
  suggestedRequirements: {
    functional: [
      'Múltiplos usuários editam documento simultaneamente',
      'Edições aparecem em tempo real para todos os colaboradores',
      'Sistema mantém histórico de versões do documento',
    ],
    nonFunctional: [
      'Sync de edições em menos de 100 ms',
      'Convergência garantida via OT ou CRDT',
      'Suporta edição offline com merge ao reconectar',
    ],
  },
  orderInTrack: 21,
  estimatedMinutes: { study: 55, speedrun: 35 },
  rubric: {
    expectedComponents: ['client_web', 'websocket_gateway', 'app_server', 'nosql_db'],
    criticalPatterns: [
      'WebSocket for real-time operation broadcast',
      'OT or CRDT for conflict-free concurrent edits',
      'Operation log for versioning and replay',
    ],
    commonMistakes: [
      'Last-write-wins — lost edits on conflict',
      'HTTP polling for sync — poor UX',
      'No operational transform — edit conflicts corrupt document',
    ],
  },
};

export const STRIPE_PAYMENTS: ProblemDefinition = {
  id: 'stripe-payments',
  company: 'Stripe',
  title: 'Sistema de Pagamentos',
  difficulty: 'hard',
  description:
    'Projete um sistema de pagamentos como Stripe. Processamento de transações, ledger double-entry, ' +
    'idempotency, reconciliação, webhooks e compliance PCI.',
  metrics: {
    rps: 100_000,
    storageGb: 5_000,
  },
  constraints: [
    '$1T+/ano em volume de transações',
    'Idempotency keys — retries seguros',
    'Double-entry ledger — débito = crédito sempre',
    'Webhooks para notificar merchants',
    'PCI compliance — dados de cartão tokenizados',
  ],
  tags: ['ledger', 'idempotency'],
  suggestedRequirements: {
    functional: [
      'Merchant processa pagamentos via API',
      'Sistema garante idempotência em retries de transação',
      'Webhooks notificam merchant sobre status de pagamento',
    ],
    nonFunctional: [
      'Ledger double-entry mantém consistência contábil',
      'Dados sensíveis de cartão nunca armazenados (tokenização PCI)',
      'Reconciliação diária detecta discrepâncias',
    ],
  },
  orderInTrack: 22,
  isRecommended: true,
  estimatedMinutes: { study: 55, speedrun: 35 },
  rubric: {
    expectedComponents: ['api_gateway', 'app_server', 'sql_db', 'message_queue'],
    criticalPatterns: [
      'Idempotency key store for safe retry',
      'Double-entry ledger with immutable transaction log',
      'Webhook delivery queue with retry',
    ],
    commonMistakes: [
      'No idempotency — duplicate charges on retry',
      'Single-entry accounting — audit failures',
      'Storing raw credit card numbers',
    ],
    structuralDepth: 'deep',
    antiPatterns: [
      {
        code: 'no-idempotency-queue',
        requiredAnyOf: ['message_queue'],
        severity: 'blocker',
        messageKey: 'stripe_payments.no_idempotency_queue',
      },
      {
        code: 'no-durable-ledger-store',
        requiredAnyOf: ['sql_db'],
        severity: 'blocker',
        messageKey: 'stripe_payments.no_durable_ledger',
      },
    ],
    configRules: [
      {
        code: 'mq-not-durable',
        componentType: 'message_queue',
        requireMqDurability: 'disk',
        severity: 'blocker',
        messageKey: 'stripe_payments.mq_not_durable',
      },
      {
        code: 'shardCount-too-low',
        componentType: 'sql_db',
        minShardCount: 2,
        severity: 'major',
        messageKey: 'stripe_payments.shard_count_too_low',
      },
    ],
    scaleChecklist: {
      en: [
        'Process ~100,000 payment RPS with idempotency keys so retries never double-charge.',
        'Keep a durable double-entry ledger and webhook retry queue for merchant reconciliation.',
      ],
      'pt-BR': [
        'Processe ~100.000 RPS de pagamento com idempotency keys para retries sem cobrança dupla.',
        'Mantenha ledger double-entry durável e fila de retry de webhooks para reconciliação.',
      ],
    },
  },
};

export const ZOOM_CONFERENCE: ProblemDefinition = {
  id: 'zoom-conference',
  company: 'Zoom',
  title: 'Videoconferência',
  difficulty: 'hard',
  description:
    'Projete uma plataforma de videoconferência como Zoom. WebRTC para media, SFU para fan-out, ' +
    'TURN/STUN para NAT traversal, simulcast e 300M meetings/dia.',
  metrics: {
    dau: 300_000_000,
    rps: 500_000,
    storageGb: 1_000,
  },
  constraints: [
    '300M meetings por dia',
    'WebRTC peer connections com SFU architecture',
    'TURN/STUN para NAT traversal',
    'Simulcast — múltiplas qualidades por stream',
    'Latência de media < 150 ms',
  ],
  tags: ['webrtc', 'sfu'],
  suggestedRequirements: {
    functional: [
      'Usuários participam de videoconferência em tempo real',
      'Sistema suporta dezenas de participantes por meeting',
      'Usuários atrás de NAT conseguem conectar via TURN',
    ],
    nonFunctional: [
      'Latência de áudio/vídeo menor que 150 ms',
      'SFU escala para 50+ participantes sem mesh',
      'Simulcast adapta qualidade por bandwidth do receptor',
    ],
  },
  orderInTrack: 23,
  estimatedMinutes: { study: 55, speedrun: 35 },
  rubric: {
    expectedComponents: ['client_web', 'media_server', 'signaling_server', 'turn_server'],
    criticalPatterns: [
      'SFU (Selective Forwarding Unit) for media fan-out',
      'STUN/TURN for NAT traversal',
      'Signaling server for SDP/ICE exchange',
    ],
    commonMistakes: [
      'Mesh topology — N² connections for N participants',
      'No TURN server — users behind NAT cannot connect',
      'MCU mixing all streams — CPU bottleneck',
    ],
    structuralDepth: 'deep',
    antiPatterns: [
      {
        code: 'no-sfu-media-path',
        requiredAnyOf: ['media_server'],
        severity: 'blocker',
        messageKey: 'zoom_conference.no_sfu',
      },
      {
        code: 'no-signaling',
        requiredAnyOf: ['signaling_server'],
        severity: 'blocker',
        messageKey: 'zoom_conference.no_signaling',
      },
      {
        code: 'no-turn-nat',
        requiredAnyOf: ['turn_server'],
        severity: 'major',
        messageKey: 'zoom_conference.no_turn',
      },
    ],
    configRules: [
      {
        code: 'ws-fanout-too-low',
        componentType: 'websocket_gateway',
        minFanOutLimit: 5_000,
        severity: 'major',
        messageKey: 'zoom_conference.ws_fanout_too_low',
      },
    ],
    scaleChecklist: {
      en: [
        'Scale SFU media fan-out for ~300M meetings/day with <150 ms media latency.',
        'Provide TURN/STUN NAT traversal and signaling so participants behind firewalls can join.',
      ],
      'pt-BR': [
        'Escale fan-out de mídia SFU para ~300M meetings/dia com latência de mídia <150 ms.',
        'Ofereça TURN/STUN e signaling para participantes atrás de NAT/firewall entrarem.',
      ],
    },
  },
};

export const DOORDASH_DELIVERY: ProblemDefinition = {
  id: 'doordash-delivery',
  company: 'DoorDash',
  title: 'Delivery de Comida',
  difficulty: 'hard',
  description:
    'Projete um marketplace de delivery como DoorDash. Três lados: restaurante, entregador e cliente. ' +
    'Dispatch otimizado, batching de entregas e state machine de pedido.',
  metrics: {
    dau: 50_000_000,
    rps: 200_000,
    storageGb: 500,
  },
  constraints: [
    'Marketplace 3-sided: restaurant + driver + customer',
    'Dispatch encontra driver ótimo em < 2 min',
    'Batching — múltiplas entregas por driver quando possível',
    'State machine: placed → confirmed → preparing → picked up → delivered',
    'ETA preciso para cliente',
  ],
  tags: ['dispatch', 'state-machine'],
  suggestedRequirements: {
    functional: [
      'Cliente faz pedido e acompanha status em tempo real',
      'Sistema atribui entregador ao pedido automaticamente',
      'Restaurante recebe e confirma pedidos',
    ],
    nonFunctional: [
      'Dispatch completa em menos de 2 minutos',
      'Batching otimiza rotas de entregadores',
      'ETA atualizado dinamicamente durante entrega',
    ],
  },
  orderInTrack: 24,
  estimatedMinutes: { study: 50, speedrun: 32 },
  rubric: {
    expectedComponents: ['app_server', 'message_queue', 'cache_redis', 'websocket_gateway'],
    criticalPatterns: [
      'Order state machine with valid transitions',
      'Dispatch service matching driver location to order',
      'WebSocket for real-time order tracking',
    ],
    commonMistakes: [
      'No state machine — invalid order states possible',
      'Manual driver assignment only',
      'No batching — inefficient single-order routes',
    ],
  },
};

export const DISTRIBUTED_KAFKA: ProblemDefinition = {
  id: 'distributed-kafka',
  company: 'LinkedIn',
  title: 'Message Queue Distribuída',
  difficulty: 'hard',
  description:
    'Projete uma message queue distribuída como Apache Kafka. Partitions, ISR (In-Sync Replicas), ' +
    'consumer groups, ordering guarantees e exactly-once semantics.',
  metrics: {
    rps: 1_000_000,
    storageGb: 10_000,
  },
  constraints: [
    '1M events/s throughput',
    'Partitions para paralelismo',
    'ISR — replicação com leader election',
    'Consumer groups com offset management',
    'Ordering garantido dentro de partition',
  ],
  tags: ['kafka', 'exactly-once'],
  suggestedRequirements: {
    functional: [
      'Producers publicam eventos em topics particionados',
      'Consumers leem eventos via consumer groups',
      'Sistema garante ordering dentro de cada partition',
    ],
    nonFunctional: [
      'Throughput de 1M events/s agregado',
      'Replicação ISR tolera falha de broker',
      'Exactly-once ou at-least-once configurável',
    ],
  },
  orderInTrack: 25,
  estimatedMinutes: { study: 55, speedrun: 35 },
  rubric: {
    expectedComponents: ['message_queue', 'app_server', 'object_storage'],
    criticalPatterns: [
      'Partitioned log with ordered append-only segments',
      'ISR replication with leader/follower model',
      'Consumer group coordinator for offset tracking',
    ],
    commonMistakes: [
      'Single queue without partitions — no parallelism',
      'No replication — message loss on broker crash',
      'Global ordering requirement — kills throughput',
    ],
  },
};

export const S3_STORAGE: ProblemDefinition = {
  id: 's3-storage',
  company: 'AWS',
  title: 'Object Storage (S3-like)',
  difficulty: 'hard',
  description:
    'Projete um object storage como AWS S3. 11 nines de durability via erasure coding, multipart upload, ' +
    'lifecycle policies e consistência eventual para list operations.',
  metrics: {
    storageGb: 10_000_000,
    rps: 500_000,
  },
  constraints: [
    '11 nines durability (99.999999999%)',
    'Erasure coding ( Reed-Solomon ) para storage eficiente',
    'Multipart upload para objetos > 5 GB',
    'Lifecycle policies (IA → Glacier → delete)',
    'Strong consistency para GET/PUT de objeto',
  ],
  tags: ['erasure-coding', 'object-storage'],
  suggestedRequirements: {
    functional: [
      'Cliente faz PUT/GET/DELETE de objetos por key',
      'Upload multipart para objetos grandes',
      'Lifecycle policies movem objetos entre tiers automaticamente',
    ],
    nonFunctional: [
      'Durabilidade de 11 nines via erasure coding',
      'Suporta 500.000 ops/s agregado',
      'Multipart upload retoma de onde parou em falha',
    ],
  },
  orderInTrack: 26,
  estimatedMinutes: { study: 55, speedrun: 35 },
  rubric: {
    expectedComponents: ['app_server', 'object_storage', 'metadata_db', 'load_balancer'],
    criticalPatterns: [
      'Erasure coding across multiple availability zones',
      'Metadata service separate from data nodes',
      'Multipart upload with part tracking and assembly',
    ],
    commonMistakes: [
      'Simple 3-copy replication only — expensive at scale',
      'No multipart — large upload failures restart',
      'Metadata and data on same node — coupling failure',
    ],
  },
};

export const DISTRIBUTED_LOCK: ProblemDefinition = {
  id: 'distributed-lock',
  company: 'Google',
  title: 'Distributed Lock',
  difficulty: 'hard',
  description:
    'Projete um serviço de distributed lock como Google Chubby. Coordenação entre serviços distribuídos ' +
    'com consensus (Raft/Paxos), lease TTL, fencing tokens e alta disponibilidade.',
  metrics: {
    rps: 100_000,
    storageGb: 10,
  },
  constraints: [
    'Locks com lease TTL — auto-release on crash',
    'Fencing tokens prevent stale lock holders',
    'Consensus via Raft for leader election',
    'Latência de acquire/release < 10 ms p99',
    'Tolerar minority node failures',
  ],
  tags: ['consensus', 'raft'],
  suggestedRequirements: {
    functional: [
      'Serviço adquire e libera locks distribuídos',
      'Lock expira automaticamente via lease TTL',
      'Fencing token invalida operações de lock holder antigo',
    ],
    nonFunctional: [
      'Acquire/release em menos de 10 ms no p99',
      'Consensus tolera falha de minoria de nós',
      'Locks são seguros contra split-brain',
    ],
  },
  orderInTrack: 27,
  estimatedMinutes: { study: 50, speedrun: 32 },
  rubric: {
    expectedComponents: ['app_server', 'consensus_service'],
    criticalPatterns: [
      'Raft or Paxos consensus for lock state',
      'Lease-based locks with TTL and heartbeat renewal',
      'Fencing tokens monotonically increasing per resource',
    ],
    commonMistakes: [
      'Redis SETNX without fencing — stale lock holder writes',
      'No lease TTL — dead lock holder blocks forever',
      'Single coordinator without consensus — SPOF',
    ],
  },
};

export const HARD_PROBLEMS = [
  NETFLIX_STREAMING,
  TICKETMASTER,
  GOOGLE_MAPS,
  GOOGLE_DOCS,
  STRIPE_PAYMENTS,
  ZOOM_CONFERENCE,
  DOORDASH_DELIVERY,
  DISTRIBUTED_KAFKA,
  S3_STORAGE,
  DISTRIBUTED_LOCK,
] as const;
