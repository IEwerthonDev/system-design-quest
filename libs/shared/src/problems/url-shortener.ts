import type { ProblemDefinition } from '../schema/problem';

export const URL_SHORTENER_ID = 'url-shortener';

export const URL_SHORTENER: ProblemDefinition = {
  id: URL_SHORTENER_ID,
  company: 'Bit.ly',
  title: 'Encurtador de URL',
  difficulty: 'easy',
  description:
    'Projete o system design do Bit.ly: um serviço que mapeia URLs longas em códigos curtos em escala global. ' +
    'Cada link criado gera muito mais leituras (redirects HTTP 302) do que escritas. ' +
    'O sistema precisa ser read-heavy, com códigos únicos, compactos e resistentes a picos de tráfego.',
  metrics: {
    dau: 100_000_000,
    readRps: 100_000,
    writeRps: 1_000,
    readWriteRatio: '100:1',
    storageGb: 500,
  },
  constraints: [
    'Códigos curtos devem ser únicos e o mais compactos possível (ex.: Base62)',
    'Redirect deve responder em menos de 100 ms no percentil 99',
    'Disponibilidade mínima de 99,9% para leituras (redirect)',
    'URLs encurtadas devem persistir por pelo menos 5 anos',
    'Sistema deve tolerar picos de tráfego 10× acima da média',
  ],
  tags: ['hashing', 'cache', 'kv', 'read-heavy'],
  suggestedRequirements: {
    functional: [
      'Usuário pode encurtar uma URL longa em um link curto único',
      'Usuário é redirecionado para a URL original ao acessar o link curto (HTTP 302)',
      'Sistema impede colisão de códigos curtos para URLs diferentes',
    ],
    nonFunctional: [
      'Redirect responde em menos de 100 ms no percentil 99',
      'Sistema suporta 1.000 escritas/s e 100.000 leituras/s em pico',
      'Disponibilidade de 99,9% para operações de leitura',
    ],
  },
  isTutorial: true,
  orderInTrack: 1,
  isRecommended: true,
  estimatedMinutes: { study: 20, speedrun: 12 },
  rubric: {
    expectedComponents: [
      'client_web',
      'load_balancer',
      'app_server',
      'cache_redis',
      'sql_db',
    ],
    criticalPatterns: [
      'Read path optimized with cache before database',
      'Write path persists slug-to-URL mapping',
      'Load balancer distributes redirect traffic',
      'Base62 or hash-based short code generation',
    ],
    commonMistakes: [
      'Client connects directly to database',
      'No cache on a 100:1 read-heavy workload',
      'Single app server with no load balancing at scale',
      'Missing redirect (302) handling on read path',
    ],
    structuralDepth: 'deep',
    antiPatterns: [
      {
        code: 'sql-without-cache',
        forbiddenType: 'sql_db',
        unlessAnyOf: ['cache_redis'],
        severity: 'blocker',
        messageKey: 'url_shortener.sql_without_cache',
      },
    ],
    configRules: [
      {
        code: 'hitRate-too-low',
        componentType: 'cache_redis',
        minHitRate: 80,
        severity: 'major',
        messageKey: 'url_shortener.hit_rate_too_low',
      },
    ],
    scaleChecklist: {
      en: [
        'Plan redirect capacity for ~100,000 read RPS with cache-before-DB on a 100:1 read/write mix.',
        'Account for ~500 GB slug→URL storage growth with multi-year retention.',
      ],
      'pt-BR': [
        'Planeje capacidade de redirect para ~100.000 RPS de leitura com cache antes do DB (razão 100:1).',
        'Considere ~500 GB de crescimento do mapeamento slug→URL com retenção de vários anos.',
      ],
    },
  },
};
