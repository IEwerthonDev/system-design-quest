import type { ComponentTypeMeta } from '../schema/component-types';

/** AD-017 Tier 1 — 15 types for MVP canvas 1a */
export const TIER_1_COMPONENTS = [
  {
    type: 'client_web',
    label: 'Web Browser',
    category: 'client',
    description: 'Interface web que consome APIs e renderiza conteúdo no navegador.',
    whenToUse: 'SPA, site, dashboard web',
  },
  {
    type: 'client_mobile',
    label: 'Mobile App',
    category: 'client',
    description: 'Aplicativo nativo ou híbrido para iOS e Android.',
    whenToUse: 'Apps iOS/Android',
  },
  {
    type: 'dns',
    label: 'DNS',
    category: 'edge',
    description: 'Resolve nomes de domínio para endereços IP dos serviços.',
    whenToUse: 'Resolução de nomes',
  },
  {
    type: 'cdn',
    label: 'CDN',
    category: 'edge',
    description: 'Rede de borda que cacheia conteúdo estático e mídia perto do usuário.',
    whenToUse: 'Conteúdo estático/vídeo cacheado',
  },
  {
    type: 'load_balancer',
    label: 'Load Balancer',
    category: 'traffic',
    description: 'Distribui requisições entre múltiplas instâncias de backend.',
    whenToUse: 'Distribuir tráfego',
  },
  {
    type: 'api_gateway',
    label: 'API Gateway',
    category: 'traffic',
    description: 'Ponto de entrada unificado para roteamento, auth e rate limiting.',
    whenToUse: 'Roteamento, auth, rate limit',
  },
  {
    type: 'rate_limiter',
    label: 'Rate Limiter',
    category: 'traffic',
    description: 'Limita a taxa de requisições por cliente ou endpoint.',
    whenToUse: 'Throttling',
  },
  {
    type: 'app_server',
    label: 'App Server',
    category: 'compute',
    description: 'Serviço de aplicação que implementa a lógica de negócio.',
    whenToUse: 'Monólito / serviço',
  },
  {
    type: 'worker',
    label: 'Background Worker',
    category: 'compute',
    description: 'Processa jobs assíncronos fora do caminho crítico de requisições.',
    whenToUse: 'Jobs assíncronos',
  },
  {
    type: 'cache_redis',
    label: 'Redis Cache',
    category: 'data',
    description: 'Cache in-memory de alta velocidade para leituras frequentes.',
    whenToUse: 'Cache in-memory',
  },
  {
    type: 'sql_db',
    label: 'SQL Database',
    category: 'data',
    description: 'Banco relacional com transações ACID e esquema estruturado.',
    whenToUse: 'Dados relacionais',
  },
  {
    type: 'object_storage',
    label: 'Object Storage (S3)',
    category: 'data',
    description: 'Armazenamento de objetos para arquivos, mídia e backups.',
    whenToUse: 'Arquivos, vídeos raw',
  },
  {
    type: 'message_queue',
    label: 'Message Queue',
    category: 'messaging',
    description: 'Fila de mensagens para desacoplar produtores e consumidores.',
    whenToUse: 'RabbitMQ, SQS',
  },
  {
    type: 'monitoring',
    label: 'Monitoring',
    category: 'observability',
    description: 'Coleta métricas, alertas e dashboards de saúde do sistema.',
    whenToUse: 'Prometheus, Grafana',
  },
  {
    type: 'auth_service',
    label: 'Auth Service',
    category: 'security',
    description: 'Gerencia autenticação, tokens e identidade de usuários.',
    whenToUse: 'Login, tokens',
  },
] as const satisfies readonly ComponentTypeMeta[];

export const TIER_1_TYPES = TIER_1_COMPONENTS.map((c) => c.type);
