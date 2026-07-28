import type { ProblemDefinition } from '../schema/problem';

export const CHAT_SYSTEM: ProblemDefinition = {
  id: 'chat-system',
  company: 'WhatsApp',
  title: 'Chat em Tempo Real',
  difficulty: 'medium',
  description:
    'Projete o sistema de mensagens do WhatsApp ou Slack: chat 1:1 e em grupos com delivery receipts, ' +
    'presence (online/offline) e histórico persistente. Mensagens devem chegar em menos de 200 ms ' +
    'para usuários online, com garantias de entrega e suporte a grupos grandes.',
  metrics: {
    dau: 500_000_000,
    rps: 500_000,
    storageGb: 10_000,
  },
  constraints: [
    '500M DAU, 50 bilhões de mensagens por dia',
    'Latência de entrega < 200 ms para mensagens online',
    'Histórico persistente e paginado',
    'Presence updates com granularidade de segundos',
    'Suporte a grupos de até 256 membros',
  ],
  tags: ['websockets', 'sharding'],
  suggestedRequirements: {
    functional: [
      'Usuário envia e recebe mensagens em tempo real',
      'Sistema exibe status online/offline de contatos',
      'Usuário consulta histórico de mensagens paginado',
    ],
    nonFunctional: [
      'Entrega de mensagens em menos de 200 ms para usuários online',
      'Sistema suporta 50 bilhões de mensagens por dia',
      'Histórico persiste com durabilidade garantida',
    ],
  },
  orderInTrack: 8,
  isRecommended: true,
  estimatedMinutes: { study: 35, speedrun: 22 },
  rubric: {
    expectedComponents: ['client_web', 'websocket_gateway', 'app_server', 'message_queue', 'nosql_db'],
    criticalPatterns: [
      'WebSocket gateway for persistent connections',
      'Message queue for offline delivery and fan-out',
      'Chat history sharded by conversation ID',
    ],
    commonMistakes: [
      'HTTP polling only — poor latency and scale',
      'No message queue for offline users',
      'Single database for all messages globally',
    ],
  },
};

export const NEWS_FEED: ProblemDefinition = {
  id: 'news-feed',
  company: 'Meta / X',
  title: 'News Feed',
  difficulty: 'medium',
  description:
    'Projete o news feed do Twitter/X ou Facebook: usuários publicam posts e veem uma timeline personalizada ' +
    'de quem seguem. Arquitete fan-out on write ou read, ranking por relevância e recência, ' +
    'e trate o celebrity problem (contas com milhões de seguidores).',
  metrics: {
    dau: 500_000_000,
    readRps: 500_000,
    writeRps: 50_000,
    readWriteRatio: '10:1',
    storageGb: 5_000,
  },
  constraints: [
    'Timeline carrega em < 500 ms',
    'Celebrity accounts com milhões de seguidores',
    'Fan-out híbrido (push para normais, pull para celebrities)',
    'Ranking por relevância e recência',
    '500M DAU',
  ],
  tags: ['fan-out', 'ranking'],
  suggestedRequirements: {
    functional: [
      'Usuário publica posts visíveis para seguidores',
      'Usuário vê timeline personalizada de quem segue',
      'Feed ordenado por relevância e recência',
    ],
    nonFunctional: [
      'Timeline carrega em menos de 500 ms',
      'Sistema lida com contas celebrity (milhões de seguidores)',
      'Fan-out suporta 50.000 writes/s',
    ],
  },
  orderInTrack: 9,
  isRecommended: true,
  estimatedMinutes: { study: 35, speedrun: 22 },
  rubric: {
    expectedComponents: ['app_server', 'cache_redis', 'nosql_db', 'message_queue'],
    criticalPatterns: [
      'Hybrid fan-out: push for regular users, pull for celebrities',
      'Pre-computed timeline in cache (Redis) for push model',
      'Social graph storage for follow relationships',
    ],
    commonMistakes: [
      'Pure fan-out on write for all users — celebrity bottleneck',
      'Pure fan-out on read only — slow timeline for active users',
      'No caching layer for hot timelines',
    ],
  },
};

export const SEARCH_AUTOCOMPLETE: ProblemDefinition = {
  id: 'search-autocomplete',
  company: 'Google',
  title: 'Autocomplete / Typeahead',
  difficulty: 'medium',
  description:
    'Projete um serviço de autocomplete como Google Search. Conforme o usuário digita, retorna sugestões ' +
    'ranqueadas por popularidade em menos de 100 ms no p99.',
  metrics: {
    rps: 500_000,
    storageGb: 50,
  },
  constraints: [
    '5 bilhões de queries por dia',
    'Latência p99 < 100 ms',
    'Ranking por frequência e relevância',
    'Suporte a prefixos de 1–20 caracteres',
    'Atualização de trending terms em near-real-time',
  ],
  tags: ['trie', 'cache'],
  suggestedRequirements: {
    functional: [
      'Sistema retorna sugestões conforme usuário digita prefixo',
      'Sugestões ranqueadas por popularidade e relevância',
      'Sistema atualiza termos trending periodicamente',
    ],
    nonFunctional: [
      'Resposta em menos de 100 ms no p99',
      'Suporta 500.000 queries/s no pico',
      'Trie ou estrutura otimizada para prefix lookup',
    ],
  },
  orderInTrack: 10,
  estimatedMinutes: { study: 30, speedrun: 18 },
  rubric: {
    expectedComponents: ['app_server', 'cache_redis', 'cdn'],
    criticalPatterns: [
      'Trie or prefix tree for fast prefix matching',
      'Cache hot prefixes at CDN or edge',
      'Aggregation pipeline for trending term updates',
    ],
    commonMistakes: [
      'Full database scan per keystroke',
      'No caching for popular prefixes',
      'Ranking only by alphabetical order',
    ],
  },
};

export const INSTAGRAM: ProblemDefinition = {
  id: 'instagram',
  company: 'Instagram',
  title: 'Instagram',
  difficulty: 'medium',
  description:
    'Projete o backend do Instagram: upload de fotos/vídeos, feed, Stories com TTL de 24h e grafo social. ' +
    'Media-heavy workload com CDN e pipeline de processamento de imagens.',
  metrics: {
    dau: 2_000_000_000,
    readRps: 1_000_000,
    writeRps: 100_000,
    storageGb: 50_000,
  },
  constraints: [
    '2B usuários, photo/video heavy',
    'Stories expiram em 24 horas',
    'Feed personalizado com fan-out',
    'Thumbnails gerados no upload',
    'CDN para servir media globalmente',
  ],
  tags: ['cdn', 'fan-out'],
  suggestedRequirements: {
    functional: [
      'Usuário faz upload de fotos e vídeos',
      'Usuário vê feed de posts de quem segue',
      'Stories expiram automaticamente após 24 horas',
    ],
    nonFunctional: [
      'Media servida via CDN com latência baixa globalmente',
      'Thumbnails gerados assincronamente no upload',
      'Feed carrega em menos de 1 segundo',
    ],
  },
  orderInTrack: 11,
  estimatedMinutes: { study: 38, speedrun: 24 },
  rubric: {
    expectedComponents: ['client_web', 'app_server', 'object_storage', 'cdn', 'worker'],
    criticalPatterns: [
      'Object storage for original media + CDN for delivery',
      'Async media processing pipeline (thumbnails, transcoding)',
      'Stories TTL with automatic expiration',
    ],
    commonMistakes: [
      'Serving original full-size images directly',
      'No CDN — high latency for global users',
      'Synchronous image processing blocking upload',
    ],
  },
};

export const GOOGLE_DRIVE: ProblemDefinition = {
  id: 'google-drive',
  company: 'Google Drive',
  title: 'Armazenamento em Nuvem',
  difficulty: 'medium',
  description:
    'Projete um serviço de armazenamento em nuvem como Google Drive ou Dropbox. Upload/download de arquivos, ' +
    'sync entre dispositivos, versionamento e resolução de conflitos.',
  metrics: {
    dau: 500_000_000,
    storageGb: 100_000,
  },
  constraints: [
    'Arquivos até 5 GB',
    'Sync em tempo quasi-real entre dispositivos',
    'Versionamento — manter últimas 30 versões',
    'Resolução de conflitos em edições simultâneas',
    'Chunking para arquivos grandes',
  ],
  tags: ['sync', 'chunking'],
  suggestedRequirements: {
    functional: [
      'Usuário faz upload e download de arquivos',
      'Arquivos sincronizam entre múltiplos dispositivos',
      'Sistema mantém histórico de versões do arquivo',
    ],
    nonFunctional: [
      'Arquivos grandes são divididos em chunks para upload',
      'Conflitos de sync são detectados e resolvidos',
      'Sync notifica dispositivos em menos de 5 segundos',
    ],
  },
  orderInTrack: 12,
  estimatedMinutes: { study: 35, speedrun: 22 },
  rubric: {
    expectedComponents: ['client_web', 'app_server', 'object_storage', 'metadata_db'],
    criticalPatterns: [
      'Chunked upload for large files with resume support',
      'Metadata DB separate from blob storage',
      'Version vector or timestamp for conflict detection',
    ],
    commonMistakes: [
      'Storing file content in SQL database',
      'No chunking — failed uploads restart from zero',
      'Last-write-wins without conflict notification',
    ],
  },
};

export const YELP_NEARBY: ProblemDefinition = {
  id: 'yelp-nearby',
  company: 'Yelp',
  title: 'Busca por Proximidade',
  difficulty: 'medium',
  description:
    'Projete um serviço de busca por proximidade como Yelp ou Google Maps lite. Usuários buscam negócios ' +
    'restaurantes dentro de um raio geográfico com ranking por distância e rating.',
  metrics: {
    rps: 100_000,
    storageGb: 500,
  },
  constraints: [
    '100k QPS de queries geo',
    'Latência p99 < 200 ms',
    'Índice geoespacial eficiente (Geohash, QuadTree, ou PostGIS)',
    'Ranking por distância + rating + popularidade',
    'Dados de 50M+ estabelecimentos',
  ],
  tags: ['geospatial', 'search'],
  suggestedRequirements: {
    functional: [
      'Usuário busca estabelecimentos dentro de raio geográfico',
      'Resultados ordenados por distância e rating',
      'Sistema suporta filtros por categoria e preço',
    ],
    nonFunctional: [
      'Queries geo respondem em menos de 200 ms no p99',
      'Suporta 100.000 QPS de buscas geográficas',
      'Índice geoespacial escala para 50M+ pontos',
    ],
  },
  orderInTrack: 13,
  estimatedMinutes: { study: 32, speedrun: 20 },
  rubric: {
    expectedComponents: ['app_server', 'search_engine', 'cache_redis'],
    criticalPatterns: [
      'Geohash or QuadTree spatial index',
      'Pre-filter by geohash prefix before distance calculation',
      'Cache popular area queries',
    ],
    commonMistakes: [
      'Full table scan with Haversine on every query',
      'No spatial index structure',
      'Single monolithic database without geo sharding',
    ],
  },
};

export const HOTEL_BOOKING: ProblemDefinition = {
  id: 'hotel-booking',
  company: 'Booking.com',
  title: 'Reserva de Hotel',
  difficulty: 'medium',
  description:
    'Projete um sistema de reserva de hotel como Booking.com. Usuários buscam quartos por datas, ' +
    'reservam com garantia de inventário e o sistema previne double-booking.',
  metrics: {
    rps: 50_000,
    storageGb: 200,
  },
  constraints: [
    '1 milhão de reservas por dia',
    'Zero double-booking — consistência forte no inventário',
    'Busca por hotel, datas e número de hóspedes',
    'Lock otimista ou pessimista em janelas de reserva',
    'Cancelamento com liberação de inventário',
  ],
  tags: ['transactions', 'inventory'],
  suggestedRequirements: {
    functional: [
      'Usuário busca quartos disponíveis por hotel e datas',
      'Usuário confirma reserva com inventário garantido',
      'Usuário pode cancelar reserva e liberar inventário',
    ],
    nonFunctional: [
      'Zero double-booking mesmo sob concorrência alta',
      'Confirmação de reserva em menos de 3 segundos',
      'Inventário atualizado atomicamente por quarto/data',
    ],
  },
  orderInTrack: 14,
  estimatedMinutes: { study: 35, speedrun: 22 },
  rubric: {
    expectedComponents: ['app_server', 'sql_db', 'cache_redis'],
    criticalPatterns: [
      'Transactional inventory decrement with row-level locking',
      'Hold/reservation TTL before payment confirmation',
      'Calendar-based availability index per room type',
    ],
    commonMistakes: [
      'Check-then-act without locking — race condition',
      'No inventory table — availability computed on the fly only',
      'Cache inventory counts without invalidation on booking',
    ],
  },
};

export const YOUTUBE: ProblemDefinition = {
  id: 'youtube',
  company: 'YouTube',
  title: 'Streaming de Vídeo',
  difficulty: 'medium',
  description:
    'Projete o backend de streaming do YouTube: upload de vídeos, transcoding para múltiplas resoluções, ' +
    'entrega adaptativa (HLS/DASH) via CDN para milhões de usuários. 500 horas de upload por minuto, ' +
    'bitrate adaptativo e metadados com baixa latência.',
  metrics: {
    dau: 2_000_000_000,
    writeRps: 10_000,
    readRps: 500_000,
    storageGb: 100_000,
  },
  constraints: [
    '500 horas de upload por minuto',
    'Transcoding para 360p, 720p, 1080p',
    'Streaming adaptativo HLS/DASH via CDN',
    'Metadados, likes e comentários por vídeo',
    '2B usuários ativos',
  ],
  tags: ['cdn', 'transcoding'],
  suggestedRequirements: {
    functional: [
      'Usuário faz upload de vídeos',
      'Vídeos são transcodificados para múltiplas resoluções',
      'Usuários assistem vídeos via streaming adaptativo',
    ],
    nonFunctional: [
      'Upload pipeline processa 500 horas/min de conteúdo',
      'Streaming via CDN com bitrate adaptativo',
      'Metadados e interações (likes) com baixa latência',
    ],
  },
  orderInTrack: 15,
  isRecommended: true,
  estimatedMinutes: { study: 40, speedrun: 25 },
  rubric: {
    expectedComponents: ['client_web', 'app_server', 'object_storage', 'cdn', 'worker', 'message_queue'],
    criticalPatterns: [
      'Upload to object storage + async transcoding DAG',
      'CDN serves HLS/DASH segments',
      'Separate metadata DB from video blob storage',
    ],
    commonMistakes: [
      'Synchronous transcoding blocking upload response',
      'Serving video files directly from origin without CDN',
      'Single resolution only — no adaptive bitrate',
    ],
  },
};

export const UBER_RIDE: ProblemDefinition = {
  id: 'uber-ride',
  company: 'Uber',
  title: 'Motoristas Próximos',
  difficulty: 'medium',
  description:
    'Projete como o Uber encontra motoristas próximos: sirva consultas geoespaciais em escala (1M+ RPS de ' +
    'location updates) com baixa latência e localizações frescas. Matching em menos de 30 segundos, ' +
    'geohash/quadtree para proximidade e status da corrida em tempo real.',
  metrics: {
    dau: 100_000_000,
    rps: 1_000_000,
    storageGb: 1_000,
  },
  constraints: [
    '1M RPS de location updates',
    'Matching em < 30 segundos',
    'Geohash para proximidade de motoristas',
    'Surge pricing dinâmico por região',
    'WebSocket para status da corrida em tempo real',
  ],
  tags: ['geospatial', 'realtime'],
  suggestedRequirements: {
    functional: [
      'Passageiro solicita corrida e recebe motorista próximo',
      'Motorista e passageiro veem status da corrida em tempo real',
      'Preço surge aplicado em regiões de alta demanda',
    ],
    nonFunctional: [
      'Matching completa em menos de 30 segundos',
      'Location updates processados a 1M RPS',
      'Geospatial index encontra motoristas num raio de 5 km',
    ],
  },
  orderInTrack: 16,
  isRecommended: true,
  estimatedMinutes: { study: 38, speedrun: 24 },
  rubric: {
    expectedComponents: ['client_web', 'websocket_gateway', 'app_server', 'cache_redis', 'message_queue'],
    criticalPatterns: [
      'Geohash-based driver location index',
      'WebSocket for real-time ride status updates',
      'Surge pricing service per geohash cell',
    ],
    commonMistakes: [
      'Polling for driver location instead of WebSocket',
      'No geospatial index — brute force distance calc',
      'Matching without considering driver availability state',
    ],
  },
};

export const TIKTOK_FEED: ProblemDefinition = {
  id: 'tiktok-feed',
  company: 'TikTok',
  title: 'TikTok — Feed de Vídeos Curtos',
  difficulty: 'medium',
  description:
    'Projete o feed de vídeos curtos do TikTok. Recommendation-first: usuários veem feed infinito personalizado ' +
    'por ML ranking, com CDN para delivery, moderação de conteúdo e detecção de viralidade.',
  metrics: {
    dau: 1_000_000_000,
    readRps: 2_000_000,
    storageGb: 50_000,
  },
  constraints: [
    '1B usuários, recommendation-first UX',
    'Feed infinito com scroll — prefetch de próximos vídeos',
    'Moderação automática + revisão humana',
    'Detecção de conteúdo viral para boost',
    'Vídeos curtos (< 3 min) servidos via CDN',
  ],
  tags: ['cdn', 'ml-ranking'],
  suggestedRequirements: {
    functional: [
      'Usuário vê feed infinito personalizado de vídeos curtos',
      'Sistema recomenda conteúdo baseado em engajamento',
      'Conteúdo impróprio é flagado por moderação',
    ],
    nonFunctional: [
      'Feed carrega próximo vídeo em menos de 500 ms',
      'CDN entrega vídeos globalmente com baixa latência',
      'Pipeline de moderação processa uploads em minutos',
    ],
  },
  orderInTrack: 17,
  estimatedMinutes: { study: 40, speedrun: 25 },
  rubric: {
    expectedComponents: ['app_server', 'cdn', 'object_storage', 'cache_redis', 'ml_service'],
    criticalPatterns: [
      'Recommendation/ranking service for personalized feed',
      'CDN for short video segment delivery',
      'Async content moderation pipeline on upload',
    ],
    commonMistakes: [
      'Chronological feed only — no recommendation engine',
      'No CDN — origin serves all video traffic',
      'No content moderation in upload path',
    ],
  },
};

export const MEDIUM_PROBLEMS = [
  CHAT_SYSTEM,
  NEWS_FEED,
  SEARCH_AUTOCOMPLETE,
  INSTAGRAM,
  GOOGLE_DRIVE,
  YELP_NEARBY,
  HOTEL_BOOKING,
  YOUTUBE,
  UBER_RIDE,
  TIKTOK_FEED,
] as const;
