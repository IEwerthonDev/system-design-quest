import type { GoldenGraphTier, Locale } from '@sdq/shared';
import type { JudgePartialResult } from '@sdq/shared';
import { DEFAULT_JUDGE_LOCALE } from '../locale';

export type JudgeRole = 'rigorous' | 'pragmatic';

type FeedbackBank = Record<GoldenGraphTier, JudgePartialResult['strengths']>;

const STRENGTHS_EN: FeedbackBank = {
  good: [
    {
      title: 'Layered architecture',
      explanation: 'Load balancer, app tier, cache, and database are clearly separated.',
      howToImprove: 'Document cache invalidation on URL writes.',
      whyItMatters: 'Layering supports scale and fault isolation for URL Shortener reads.',
    },
  ],
  medium: [
    {
      title: 'Basic three-tier flow',
      explanation: 'Client reaches an app server before the database.',
      howToImprove: 'Add a cache for hot redirect lookups.',
      whyItMatters: 'A cache reduces read latency at high RPS.',
    },
  ],
  bad: [],
};

const STRENGTHS_PT: FeedbackBank = {
  good: [
    {
      title: 'Arquitetura em camadas',
      explanation: 'Load balancer, camada de app, cache e banco estão claramente separados.',
      howToImprove: 'Documente a invalidação de cache nas escritas de URL.',
      whyItMatters: 'Camadas sustentam escala e isolamento de falhas nas leituras do Encurtador.',
    },
  ],
  medium: [
    {
      title: 'Fluxo básico em três camadas',
      explanation: 'O cliente alcança um app server antes do banco de dados.',
      howToImprove: 'Adicione um cache para lookups quentes de redirect.',
      whyItMatters: 'Um cache reduz a latência de leitura em alto RPS.',
    },
  ],
  bad: [],
};

const CRITICAL_EN: FeedbackBank = {
  good: [],
  medium: [
    {
      title: 'No cache layer',
      explanation: 'Redirect reads will hit the database on every request.',
      howToImprove: 'Insert Redis between app server and database for hot URLs.',
      whyItMatters: 'URL Shortener read RPS dominates traffic; cache is expected.',
      severity: 'major',
    },
    {
      title: 'No load balancer',
      explanation: 'A single app server becomes a single point of failure.',
      howToImprove: 'Place a load balancer in front of multiple app instances.',
      whyItMatters: 'Availability suffers without horizontal redundancy.',
      severity: 'major',
    },
  ],
  bad: [
    {
      title: 'Client talks directly to database',
      explanation: 'There is no application layer to enforce business logic or auth.',
      howToImprove: 'Add an app server between client and database.',
      whyItMatters: 'Direct DB access exposes data and skips redirect logic.',
      severity: 'blocker',
      relatedComponents: ['golden-bad-client', 'golden-bad-db'],
    },
  ],
};

const CRITICAL_PT: FeedbackBank = {
  good: [],
  medium: [
    {
      title: 'Sem camada de cache',
      explanation: 'Leituras de redirect vão bater no banco a cada requisição.',
      howToImprove: 'Insira Redis entre o app server e o banco para URLs quentes.',
      whyItMatters: 'O RPS de leitura do Encurtador domina o tráfego; cache é esperado.',
      severity: 'major',
    },
    {
      title: 'Sem load balancer',
      explanation: 'Um único app server vira ponto único de falha.',
      howToImprove: 'Coloque um load balancer na frente de várias instâncias de app.',
      whyItMatters: 'A disponibilidade sofre sem redundância horizontal.',
      severity: 'major',
    },
  ],
  bad: [
    {
      title: 'Cliente fala diretamente com o banco',
      explanation: 'Não há camada de aplicação para regras de negócio ou auth.',
      howToImprove: 'Adicione um app server entre cliente e banco.',
      whyItMatters: 'Acesso direto ao DB expõe dados e pula a lógica de redirect.',
      severity: 'blocker',
      relatedComponents: ['golden-bad-client', 'golden-bad-db'],
    },
  ],
};

const IMPROVEMENTS_EN: FeedbackBank = {
  good: [
    {
      title: 'Plan cache TTL strategy',
      explanation: 'Popular URLs need a defined expiration and invalidation path.',
      howToImprove: 'Set TTL aligned with analytics retention and bust cache on update.',
      whyItMatters: 'Stale redirects confuse users and inflate storage.',
    },
  ],
  medium: [
    {
      title: 'Add Redis cache',
      explanation: 'Reads dominate URL Shortener traffic.',
      howToImprove: 'Route GET lookups through cache before SQL.',
      whyItMatters: 'Cache absorbs read spikes and protects the database.',
    },
  ],
  bad: [
    {
      title: 'Introduce application tier',
      explanation: 'Business rules and hashing belong in an app service.',
      howToImprove: 'Add app servers to generate short codes and validate redirects.',
      whyItMatters: 'Without compute tier the design cannot scale or stay secure.',
    },
  ],
};

const IMPROVEMENTS_PT: FeedbackBank = {
  good: [
    {
      title: 'Planeje a estratégia de TTL do cache',
      explanation: 'URLs populares precisam de expiração e invalidação definidas.',
      howToImprove: 'Defina TTL alinhado à retenção de analytics e invalide no update.',
      whyItMatters: 'Redirects obsoletos confundem usuários e incham o storage.',
    },
  ],
  medium: [
    {
      title: 'Adicione cache Redis',
      explanation: 'Leituras dominam o tráfego do Encurtador de URL.',
      howToImprove: 'Encaminhe lookups GET pelo cache antes do SQL.',
      whyItMatters: 'O cache absorve picos de leitura e protege o banco.',
    },
  ],
  bad: [
    {
      title: 'Introduza a camada de aplicação',
      explanation: 'Regras de negócio e hashing pertencem a um serviço de app.',
      howToImprove: 'Adicione app servers para gerar códigos curtos e validar redirects.',
      whyItMatters: 'Sem camada de compute o design não escala nem fica seguro.',
    },
  ],
};

const ROLE_SCORE_ADJUST: Record<JudgeRole, number> = {
  rigorous: -2,
  pragmatic: 2,
};

const BASE_SCORE: Record<GoldenGraphTier, number> = {
  good: 84,
  medium: 71,
  bad: 32,
};

const RATIONALE_EN: Record<JudgeRole, Record<GoldenGraphTier, string>> = {
  rigorous: {
    good: 'Meets scalability and redundancy expectations for the tutorial problem.',
    medium: 'Functional path exists but misses cache and load balancing for production RPS.',
    bad: 'Violates basic layering; client must not reach the database directly.',
  },
  pragmatic: {
    good: 'Solid MVP architecture with room to tune cache policy later.',
    medium: 'Acceptable for a prototype, insufficient for peak read traffic.',
    bad: 'Not viable even as a spike; missing mandatory application layer.',
  },
};

const RATIONALE_PT: Record<JudgeRole, Record<GoldenGraphTier, string>> = {
  rigorous: {
    good: 'Atende expectativas de escalabilidade e redundância do problema tutorial.',
    medium: 'Há caminho funcional, mas faltam cache e load balancing para RPS de produção.',
    bad: 'Viola o layering básico; o cliente não deve falar direto com o banco.',
  },
  pragmatic: {
    good: 'Arquitetura MVP sólida, com espaço para afinar a política de cache depois.',
    medium: 'Aceitável como protótipo, insuficiente para pico de leitura.',
    bad: 'Inviável mesmo como spike; falta a camada de aplicação obrigatória.',
  },
};

/** Deterministic partial judge output for URL Shortener golden graph tiers. */
export function getUrlShortenerPartialResult(
  role: JudgeRole,
  tier: GoldenGraphTier,
  locale: Locale = DEFAULT_JUDGE_LOCALE,
): JudgePartialResult {
  const score = BASE_SCORE[tier] + ROLE_SCORE_ADJUST[role];
  const useEn = locale === 'en';

  return {
    score,
    strengths: (useEn ? STRENGTHS_EN : STRENGTHS_PT)[tier],
    criticalIssues: (useEn ? CRITICAL_EN : CRITICAL_PT)[tier],
    improvements: (useEn ? IMPROVEMENTS_EN : IMPROVEMENTS_PT)[tier],
    requirementCoverage: [],
    rationale: (useEn ? RATIONALE_EN : RATIONALE_PT)[role][tier],
  };
}
