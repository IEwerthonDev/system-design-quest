import type { ComponentType } from '../schema/component-types';

export type ConnectionPairStatus = 'ok' | 'warn' | 'invalid';

export interface ConnectionPairAssessment {
  status: ConnectionPairStatus;
  reasonPt: string;
  reasonEn: string;
}

const CLIENTS: ReadonlySet<ComponentType> = new Set(['client_web', 'client_mobile']);
const DATABASES: ReadonlySet<ComponentType> = new Set(['sql_db', 'nosql_db']);
const CACHES: ReadonlySet<ComponentType> = new Set(['cache_redis', 'cdn']);
const MESSAGING: ReadonlySet<ComponentType> = new Set(['message_queue', 'kafka', 'pub_sub']);
const COMPUTE: ReadonlySet<ComponentType> = new Set([
  'app_server',
  'microservice',
  'serverless',
  'worker',
]);
const OBS: ReadonlySet<ComponentType> = new Set(['monitoring', 'logging']);
const DATA_STORES: ReadonlySet<ComponentType> = new Set([
  'sql_db',
  'nosql_db',
  'cache_redis',
  'object_storage',
  'search_engine',
]);

function assess(
  status: ConnectionPairStatus,
  reasonPt: string,
  reasonEn: string,
): ConnectionPairAssessment {
  return { status, reasonPt, reasonEn };
}

/**
 * Pedagogical pair rules for request/dependency edges (blueprint linking).
 * Does not check self-loops or duplicate edges — callers handle graph structure.
 */
export function assessConnectionPair(
  fromType: ComponentType,
  toType: ComponentType,
): ConnectionPairAssessment {
  if (CLIENTS.has(fromType) && CLIENTS.has(toType)) {
    return assess(
      'invalid',
      'Cliente não se conecta a outro cliente no diagrama de requisições.',
      'Clients do not connect to other clients on a request diagram.',
    );
  }

  if (DATA_STORES.has(fromType) && CLIENTS.has(toType)) {
    return assess(
      'invalid',
      'Stores não enviam tráfego de usuário para o client — o fluxo é client → edge/compute → data.',
      'Data stores do not send user traffic to clients — flow is client → edge/compute → data.',
    );
  }

  if (MESSAGING.has(fromType) && CLIENTS.has(toType)) {
    return assess(
      'invalid',
      'Filas/streams não falam com o client diretamente.',
      'Queues/streams do not talk to the client directly.',
    );
  }

  if (OBS.has(fromType) && CLIENTS.has(toType)) {
    return assess(
      'invalid',
      'Observability não é caminho de request para o client.',
      'Observability is not a request path to the client.',
    );
  }

  if (fromType === 'worker' && CLIENTS.has(toType)) {
    return assess(
      'invalid',
      'Workers processam jobs em background — não respondem ao client diretamente.',
      'Workers process background jobs — they do not respond to the client directly.',
    );
  }

  if (CLIENTS.has(fromType) && DATABASES.has(toType)) {
    return assess(
      'warn',
      'Client → DB direto costuma pular API/app (anti-padrão em entrevistas).',
      'Client → DB usually skips the API/app layer (interview anti-pattern).',
    );
  }

  if (CLIENTS.has(fromType) && toType === 'cache_redis') {
    return assess(
      'warn',
      'Client → Redis direto é raro; cache costuma ficar atrás de app/CDN.',
      'Client → Redis is uncommon; cache usually sits behind app/CDN.',
    );
  }

  if (CLIENTS.has(fromType) && MESSAGING.has(toType)) {
    return assess(
      'warn',
      'Client raramente publica direto na fila — use API/gateway.',
      'Clients rarely publish straight to a queue — use an API/gateway.',
    );
  }

  if (CLIENTS.has(fromType) && toType === 'worker') {
    return assess(
      'warn',
      'Client → worker direto pula a camada de API.',
      'Client → worker skips the API layer.',
    );
  }

  if (fromType === 'cdn' && DATABASES.has(toType)) {
    return assess(
      'warn',
      'CDN → DB é incomum; CDN costuma falar com origin (object storage/app).',
      'CDN → DB is unusual; CDNs usually hit origin (object storage/app).',
    );
  }

  if (OBS.has(fromType) && !OBS.has(toType) && !COMPUTE.has(toType)) {
    return assess(
      'warn',
      'Observability costuma instrumentar compute — este destino é questionável.',
      'Observability usually instruments compute — this target is questionable.',
    );
  }

  if (DATABASES.has(fromType) && DATABASES.has(toType) && fromType !== toType) {
    return assess(
      'warn',
      'DB → DB pode ser ETL/replicação; deixe a intenção clara no label.',
      'DB → DB may be ETL/replication; make the intent clear on the label.',
    );
  }

  if (MESSAGING.has(fromType) && MESSAGING.has(toType)) {
    return assess(
      'warn',
      'Fila → fila costuma indicar topologia confusa (use um broker claro).',
      'Queue → queue often signals a confusing topology (prefer one clear broker).',
    );
  }

  if (CACHES.has(fromType) && CACHES.has(toType) && fromType === toType) {
    return assess(
      'warn',
      'Mesmo tipo de cache em cadeia raramente é necessário no desenho inicial.',
      'Chaining the same cache type is rarely needed in an initial design.',
    );
  }

  return assess('ok', 'Ligação compatível com fluxos típicos.', 'Link fits typical request flows.');
}
