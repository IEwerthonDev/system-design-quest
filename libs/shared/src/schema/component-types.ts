export type ComponentType =
  | 'client_web'
  | 'client_mobile'
  | 'dns'
  | 'cdn'
  | 'load_balancer'
  | 'api_gateway'
  | 'app_server'
  | 'cache_redis'
  | 'sql_db'
  | 'rate_limiter'
  | 'object_storage'
  | 'message_queue'
  | 'worker'
  | 'monitoring'
  | 'auth_service'
  | 'microservice'
  | 'nosql_db'
  | 'kafka'
  | 'pub_sub'
  | 'search_engine'
  | 'waf'
  | 'reverse_proxy'
  | 'logging'
  | 'notification'
  | 'serverless';

export type ComponentCategory =
  | 'client'
  | 'edge'
  | 'traffic'
  | 'compute'
  | 'data'
  | 'messaging'
  | 'observability'
  | 'security';

export interface ComponentTypeMeta {
  type: ComponentType;
  label: string;
  category: ComponentCategory;
  description: string;
  whenToUse: string;
}
