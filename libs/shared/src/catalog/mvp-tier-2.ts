import type { ComponentTypeMeta } from '../schema/component-types';

/** AD-017 Tier 2 additions — 11 types on top of Tier 1 (26 total; +websocket_gateway for AD-028) */
export const TIER_2_ADDITIONS = [
  {
    type: 'microservice',
    label: 'Microservice',
    category: 'compute',
    description: 'Serviço pequeno e independente com responsabilidade única e deploy separado.',
    whenToUse: 'Decomposição de domínio',
  },
  {
    type: 'serverless',
    label: 'Serverless Function',
    category: 'compute',
    description: 'Função executada sob demanda sem gerenciar servidores — paga por invocação.',
    whenToUse: 'Cargas esporádicas, eventos',
  },
  {
    type: 'nosql_db',
    label: 'NoSQL Database',
    category: 'data',
    description: 'Banco flexível para documentos, colunas ou grafos com escala horizontal.',
    whenToUse: 'Dados não-relacionais, escala',
  },
  {
    type: 'search_engine',
    label: 'Search Engine',
    category: 'data',
    description: 'Índice invertido para buscas full-text e filtros complexos em grande volume.',
    whenToUse: 'Busca, autocomplete',
  },
  {
    type: 'kafka',
    label: 'Kafka',
    category: 'messaging',
    description: 'Log distribuído de alta vazão para streaming de eventos entre serviços.',
    whenToUse: 'Event streaming, pipelines',
  },
  {
    type: 'pub_sub',
    label: 'Pub/Sub',
    category: 'messaging',
    description: 'Padrão publicador-assinante para fan-out de eventos a múltiplos consumidores.',
    whenToUse: 'Notificações, fan-out',
  },
  {
    type: 'notification',
    label: 'Notification Service',
    category: 'messaging',
    description: 'Envia push, e-mail ou SMS para usuários de forma assíncrona.',
    whenToUse: 'Alertas, push, e-mail',
  },
  {
    type: 'reverse_proxy',
    label: 'Reverse Proxy',
    category: 'traffic',
    description: 'Intermediário que recebe requisições externas e encaminha aos backends internos.',
    whenToUse: 'Terminação TLS, roteamento',
  },
  {
    type: 'waf',
    label: 'WAF',
    category: 'security',
    description: 'Firewall de aplicação web que filtra ataques como SQL injection e XSS.',
    whenToUse: 'Proteção HTTP',
  },
  {
    type: 'logging',
    label: 'Logging',
    category: 'observability',
    description: 'Agrega logs estruturados para depuração, auditoria e correlação de incidentes.',
    whenToUse: 'ELK, CloudWatch Logs',
  },
  {
    type: 'websocket_gateway',
    label: 'WebSocket Gateway',
    category: 'traffic',
    description: 'Mantém conexões persistentes para push em tempo real e fan-out de eventos.',
    whenToUse: 'Chat, presença, streaming de eventos',
  },
] as const satisfies readonly ComponentTypeMeta[];

export const TIER_2_ADDITION_TYPES = TIER_2_ADDITIONS.map((c) => c.type);
